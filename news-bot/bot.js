require('dotenv').config();
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
const { getStorage } = require('firebase-admin/storage');

// --- CONFIGURATION ---
const RSS_URL = 'https://feeds.bbci.co.uk/news/england/northamptonshire/rss.xml'; // Working BBC Feed
const STORAGE_BUCKET = 'cityfix-northampton.firebasestorage.app'; // Bucket for images

// --- INITIALIZATION ---
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: STORAGE_BUCKET
});

const db = admin.firestore();
const bucket = getStorage().bucket();

const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
});

// --- HELPER: DELETE ALL NEWS ---
async function deleteAllNews() {
    console.log("🗑️ Purging old news items...");

    // 1. Delete original 'news_item' types
    const snapshotOld = await db.collection('tickets').where('type', '==', 'news_item').get();

    // 2. Delete new 'social' types with 'news_item' subtype
    const snapshotNew = await db.collection('tickets').where('subtype', '==', 'news_item').get();

    const batch = db.batch();
    let deletedCount = 0;

    snapshotOld.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
    });

    snapshotNew.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
    });

    if (deletedCount > 0) {
        await batch.commit();
        console.log(`✅ Deleted ${deletedCount} old news items.`);
    } else {
        console.log("✅ No old news items to delete.");
    }
}

// --- HELPER: UPLOAD IMAGE TO STORAGE ---
async function uploadImage(imageUrl, title) {
    if (!imageUrl || imageUrl.includes('placeholder')) return imageUrl;

    try {
        // 1. Download image
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        // 2. Prepare filename (sanitize title)
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
        const timestamp = Date.now();
        const extension = imageUrl.split('.').pop()?.split(/[?#]/)[0] || 'jpg';
        const filename = `news-bot-images/${safeTitle}_${timestamp}.${extension}`;

        // 3. Upload to Firebase Storage
        const file = bucket.file(filename);
        await file.save(response.data, {
            contentType: response.headers['content-type'] || 'image/jpeg',
            public: true, // Make publicly accessible for the app
            metadata: {
                metadata: {
                    firebaseStorageDownloadTokens: timestamp // Hack to make some SDKs happy, but we use publicUrl mostly
                }
            }
        });

        // 4. Get Public URL
        return file.publicUrl();

    } catch (error) {
        console.error(`⚠️ Image Upload Failed for ${imageUrl}:`, error.message);
        // Fallback to original URL even if it might fail client-side, or use placeholder
        return 'https://via.placeholder.com/600x400?text=Image+Unavailable';
    }
}

// --- HELPER: SCRAPE ARTICLE ---
async function scrapeArticle(url) {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });

        const $ = cheerio.load(data);



        // 1. Image
        const ogImage = $('meta[property="og:image"]').attr('content');

        // 2. Author / Editor
        let author = "Unknown Editor";
        let authorTitle = "";

        // STRATEGY A: Parse JSON-LD (Most reliable for BBC)
        try {
            const jsonLdScripts = $('script[type="application/ld+json"]');
            jsonLdScripts.each((i, el) => {
                const jsonText = $(el).html();
                if (jsonText) {
                    const parsed = JSON.parse(jsonText);
                    const schema = Array.isArray(parsed) ? parsed : [parsed];

                    const newsArticle = schema.find(item =>
                        item['@type'] === 'NewsArticle' ||
                        item['@type'] === 'ReportageNewsArticle' ||
                        item['@type'] === 'Article'
                    );

                    if (newsArticle && newsArticle.author) {
                        const authors = Array.isArray(newsArticle.author) ? newsArticle.author : [newsArticle.author];
                        const person = authors.find(a => a['@type'] === 'Person');
                        if (person && person.name) {
                            author = person.name;
                        }
                    }
                }
            });
        } catch (e) {
            // Ignore JSON parse errors
        }

        // STRATEGY B: DOM Fallback
        if (author === "Unknown Editor") {
            author = $('span[class*="TextContributorName"]').first().text() ||
                $('meta[name="author"]').attr('content') ||
                $('meta[property="article:author"]').attr('content') ||
                $('meta[name="byl"]').attr('content') ||
                $('.ssrcss-1rv0owc-Contributor span').first().text() ||
                $('.author-unit .name').text() ||
                "Unknown Editor";
        }

        // Clean Author
        if (author.includes('http') || author.includes('www.') || author.includes('.com')) {
            author = "Unknown Editor";
        }

        // 3. Article Text (for first sentence)
        let text = "";

        // Remove unwanted elements first
        $('figure, figcaption, .image-caption, .ssrcss-17pvttn-ImageWrapper, header, .ssrcss-11r1m41-Metadata').remove();

        // Specific Clean Selectors
        const selectors = [
            // BBC text blocks
            'div[data-component="text-block"] p',
            // Generic Body paragraphs
            'article p',
            '.ssrcss-1q0x1qg-Paragraph',
            'main p'
        ];

        for (const selector of selectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                elements.each((i, el) => {
                    // Clean up text
                    const para = $(el).text().trim();
                    // Avoid short metadata lines or obvious captions
                    if (para.length > 50 && !para.includes("Image source") && !para.includes("Image caption")) {
                        text += para + " ";
                    }
                });
                if (text.trim().length > 100) break;
            }
        }

        if (!text || text.trim().length < 50) {
            $('p').each((i, el) => {
                text += $(el).text() + " ";
            });
        }

        text = text.trim();
        // Extract first sentence
        // Split by period followed by space.
        const firstSentence = text.match(/.*?(?:[.!?])(?=\s|$)/)?.[0] || text.substring(0, 150) + "...";

        return {
            image: ogImage || 'https://via.placeholder.com/600x400?text=News',
            author: author.trim(),
            authorTitle: authorTitle.trim(),
            firstSentence: firstSentence.trim()
        };

    } catch (e) {
        console.error(`⚠️ Scrape Error for ${url}:`, e.message);
        return null;
    }
}

// --- MAIN BOT LOOP ---
async function run() {
    console.log("🤖 AI News Bot (No-AI Mode) initializing...");

    // Purge old data first
    await deleteAllNews();

    try {
        console.log("📡 Fetching RSS Feed from:", RSS_URL);
        const feed = await parser.parseURL(RSS_URL);
        console.log(`✅ RSS Feed fetched. Found ${feed.items.length} items.`);

        const MAX_SCAN_DEPTH = 20;
        const TARGET_NEW_ITEMS = 3;
        let newItemsProcessed = 0;

        const itemsToScan = feed.items.slice(0, MAX_SCAN_DEPTH);
        console.log(`Processing up to ${itemsToScan.length} items...`);

        for (const item of itemsToScan) {
            if (newItemsProcessed >= TARGET_NEW_ITEMS) {
                console.log(`\n🎉 Reached target of ${TARGET_NEW_ITEMS} new items. Stopping.`);
                break;
            }

            console.log(`\n--------------------------------------------------`);
            console.log(`🔍 Processing item: ${item.title}`);
            console.log(`✨ Scraping details...`);

            // 2. Scrape Real Data
            const scrapedData = await scrapeArticle(item.link);
            if (!scrapedData) {
                console.log(`⚠️ Failed to scrape: ${item.title}`);
                continue;
            }

            // 2b. Upload Image to Firebase Storage
            console.log(`📤 Uploading image to Firebase Storage...`);
            const firebaseImageUrl = await uploadImage(scrapedData.image, item.title);

            // --- CONSOLE OUTPUT REQUESTED BY USER ---
            console.log(`\n📄 --- New Article Details ---`);
            console.log(`📌 Title:         ${item.title}`);
            console.log(`📅 Date:          ${item.pubDate}`);
            console.log(`✍️  Editor/Author: ${scrapedData.author} ${scrapedData.authorTitle ? '- ' + scrapedData.authorTitle : ''}`);
            console.log(`🔗 External Link: ${item.link}`);
            console.log(`📝 First Sentence: "${scrapedData.firstSentence}"`);
            console.log(`🖼️  Main Image:    ${firebaseImageUrl}`);
            console.log(`-------------------------------\n`);

            // 4. Save to Firestore
            console.log(`💾 Saving to Firestore...`);
            await db.collection('tickets').add({
                // UI Display Data
                title: item.title,
                description: scrapedData.firstSentence, // Use first sentence as description
                imageUrl: firebaseImageUrl, // Use the new Firebase URL

                // Metadata
                type: 'social', // Changed from 'news_item' to 'social' to bypass Firestore Rule permissions
                subtype: 'news_item',
                externalLink: item.link,
                category: 'Local News',
                status: 'live', // Changed from 'verified' to 'live' to avoid appearing in Council Fixes feed
                locationName: 'Northampton',
                authorName: scrapedData.author, // Save author field
                publishedDate: item.pubDate,    // Save original date

                // User Data (The Bot)
                userId: process.env.COUNCIL_UID || 'BOT UID NOT SET',
                userEmail: 'council@northampton.gov.uk',

                // Socials
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                upvoteCount: 0,
                commentCount: 0,
                voteCount: 0
            });

            console.log(`✅ Posted: ${item.title}`);
            newItemsProcessed++;
        }

        console.log("\n🎉 Bot run completed. Added " + newItemsProcessed + " new items.");

    } catch (error) {
        console.error("\n❌ FATAL ERROR in Bot Execution:", error);
        console.error("Stack Trace:", error.stack);
    }
}

run();