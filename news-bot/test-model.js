require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-pro",
        "gemini-1.0-pro",
        "gemini-1.5-pro"
    ];

    for (const modelName of modelsToTest) {
        console.log(`\nTesting model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });

        try {
            const result = await model.generateContent("Say hello.");
            console.log(`✅ SUCCESS with ${modelName}!`);
            return; // Stop after finding one that works
        } catch (e) {
            console.log(`❌ Failed with ${modelName}: ${e.message.split('[')[0]}...`); // Shorten error
        }
    }
    console.log("\n❌ All models failed.");
}

testModels();
