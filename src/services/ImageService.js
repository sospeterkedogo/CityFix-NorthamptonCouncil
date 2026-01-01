import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../config/firebase'; // Access app via db.app
import { Platform } from 'react-native';

const storage = getStorage(db.app);

export const ImageService = {
    uploadImage: async (uri, path) => {
        try {
            // 1. Fetch blob from URI
            const response = await fetch(uri);
            const blob = await response.blob();

            // 2. Create Storage Reference
            // path example: `uploads/${userId}/${Date.now()}.jpg`
            const storageRef = ref(storage, path);

            // 3. Upload
            await uploadBytes(storageRef, blob);

            // 4. Get URL
            const downloadUrl = await getDownloadURL(storageRef);
            return downloadUrl;
        } catch (error) {
            console.error("Image Upload Error:", error);
            throw error;
        }
    },

    downloadImage: async (url) => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                return { success: false, error: 'Permission denied' };
            }

            const filename = url.split('/').pop().split('?')[0];
            const fileUri = FileSystem.documentDirectory + filename;

            const { uri } = await FileSystem.downloadAsync(url, fileUri);
            const asset = await MediaLibrary.createAssetAsync(uri);
            await MediaLibrary.createAlbumAsync('CityFix', asset, false);

            return { success: true };
        } catch (error) {
            console.error("Download Error:", error);
            return { success: false, error: error.message };
        }
    }
};
