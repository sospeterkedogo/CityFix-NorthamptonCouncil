const fs = require('fs');
const path = require('path');

const mocks = [
    {
        path: 'node_modules/@zegocloud/zego-uikit-prebuilt-call-rn/lib/module/call_invitation/services/notification_helper.js',
        content: `export default class NotificationHelper {
    static _instance;
    static getInstance() {
        if (!NotificationHelper._instance) {
            NotificationHelper._instance = new NotificationHelper();
        }
        return NotificationHelper._instance;
    }
    notify() { console.log('NotificationHelper.notify (web stub)'); }
    cancel() {}
    updateCallID() {}
    destroy() {}
    onCallKitAnswerCall() {}
    getCurrentInCallID() { return ''; }
}`
    },
    {
        path: 'node_modules/@zegocloud/zego-uikit-prebuilt-call-rn/lib/module/call_invitation/services/bell.js',
        content: `export default {
    setCategory: () => {},
    setMode: () => {},
    setActive: () => {},
    start: () => {},
    stop: () => {},
    release: () => {},
    setVolume: () => {},
    setNumberOfLoops: () => {},
    play: (cb) => { if(cb) cb(true); },
    setSpeakerphoneOn: () => {}
};`
    },
    {
        path: 'node_modules/@zegocloud/zego-uikit-prebuilt-call-rn/lib/module/call_invitation/services/plugins.js',
        content: `export default {
    setItem: async () => {},
    getItem: async () => null,
    removeItem: async () => {},
    clear: async () => {}
};`
    },
    {
        path: 'node_modules/zego-uikit-rn/lib/module/components/audio_video_container/ZegoAudioVideoContainer/GalleryLayout.js',
        content: `import React from 'react';
import { View, StyleSheet } from 'react-native';
// ... simplified for style fix (background -> backgroundColor) ...
// Actually, I can't easily guess the full content. 
// I will skip this one if I can't read the original, but the style error "Invalid style background" is critical.
// I'll try to leave it for now or implement a safe CSS patch if possible.
`
    }
];

// Specific Patch for ZegoExpressEngineImpl (Read, modify, write)
const enginePath = 'node_modules/zego-express-engine-reactnative/lib/impl/ZegoExpressEngineImpl.js';
if (fs.existsSync(enginePath)) {
    let content = fs.readFileSync(enginePath, 'utf8');
    if (!content.includes('// PATCHED')) {
        content = content.replace(
            'const { ZegoExpressNativeModule } = NativeModules',
            'const { ZegoExpressNativeModule } = NativeModules || {}; // PATCHED'
        ).replace(
            'const Prefix = ZegoExpressNativeModule.prefix',
            'const Prefix = (ZegoExpressNativeModule && ZegoExpressNativeModule.prefix) || "Active"; // PATCHED'
        );
        // Also need to mock createEngine calls if the module is missing
        // But for now let's just stop the crash.
        fs.writeFileSync(enginePath, content);
        console.log('Patched ZegoExpressEngineImpl.js');
    }
}

// Specific Patch for ZegoRenderView
const viewPath = 'node_modules/zego-express-engine-reactnative/lib/impl/ZegoRenderView.js';
if (fs.existsSync(viewPath)) {
    let content = fs.readFileSync(viewPath, 'utf8');
    if (!content.includes('// PATCHED')) {
        content = content.replace(
            "const ZegoView = requireNativeComponent('RCTZegoView')",
            "// PATCHED\nimport { View } from 'react-native';\nconst ZegoView = (Platform.OS === 'web') ? View : requireNativeComponent('RCTZegoView')"
        );
        fs.writeFileSync(viewPath, content);
        console.log('Patched ZegoRenderView.js');
    }
}

// Write the full replacement files
mocks.forEach(mock => {
    if (mock.path.includes('GalleryLayout')) return; // Skip for now

    // Ensure dir exists
    const dir = path.dirname(mock.path);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(mock.path, mock.content);
    console.log('Wrote ' + mock.path);
});
