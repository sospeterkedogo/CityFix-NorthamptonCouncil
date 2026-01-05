const fs = require('fs');
const path = 'node_modules/@zegocloud/zego-uikit-rn/lib/module/components/audio_video_container/ZegoAudioVideoContainer/GalleryLayout.js';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    if (content.includes('background:')) {
        content = content.replace(/background:/g, 'backgroundColor:');
        fs.writeFileSync(path, content);
        console.log('Fixed background style in GalleryLayout.js');
    } else {
        console.log('No background style found or already fixed.');
    }
} else {
    console.log('File not found: ' + path);
}
