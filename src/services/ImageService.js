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
    }
};
