import 'dotenv/config';

export default {
    expo: {
        name: "City Fix",
        slug: "city-fix",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        splash: {
            image: "./assets/splash.png",
            resizeMode: "contain",
            backgroundColor: "#2C3E50"
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.cityfix.cityfix",
            infoPlist: {
                ITSAppUsesNonExemptEncryption: false
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#2C3E50"
            },
            config: {
                googleMaps: {
                    apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
                }
            },
            package: "com.cityfix.cityfix",
            permissions: [
                "ACCESS_COARSE_LOCATION",
                "ACCESS_FINE_LOCATION",
                "CAMERA",
                "READ_EXTERNAL_STORAGE",
                "WRITE_EXTERNAL_STORAGE",
                "NOTIFICATIONS",
                "RECORD_AUDIO"
            ]
        },
        scheme: "city-fix",
        plugins: [
            "expo-router",

        ],
        notification: {
            icon: "./assets/icon.png",
            color: "#ffffff"
        },
        web: {
            favicon: "./assets/splash.png",
            bundler: "metro",
            display: "standalone",
            backgroundColor: "#2C3E50",
            description: "City Fix - Report and Resolve Issues",
            themeColor: "#2C3E50",
            startUrl: "/"
        },
        extra: {
            router: {},
            eas: {
                projectId: "1b864f57-1b8d-46cd-a3d7-d9ecf82c93dc"
            },
            vapidPublicKey: "BPfiypc72CFrBdkgMDPLDzy-fijbHD2-W371DyWFmHjzqyfq7hRlsH3za49JvdFlHGsjJcW2L_1ln1GRj7kz2Xg",
            googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        },
        updates: {
            url: "https://u.expo.dev/1b864f57-1b8d-46cd-a3d7-d9ecf82c93dc"
        },
        runtimeVersion: {
            policy: "appVersion"
        }
    }
};
