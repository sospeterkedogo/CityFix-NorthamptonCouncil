import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

export const MediaService = {
  /**
   * Uploads a file (image/video) to Firebase Storage
   * @param {string} uri - Local file URI (file://...)
   * @param {string} folder - Storage path (e.g., "reports")
   * @returns {Promise<string>} - The public download URL
   */
  uploadFile: async (uri, folder = "reports") => {
    try {
      // 1. Create a unique filename
      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      const timestamp = Date.now();
      const storagePath = `${folder}/${timestamp}_${filename}`;
      
      // 2. Fetch the file and convert to Blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // 3. Create a reference
      const storageRef = ref(storage, storagePath);

      // 4. Upload
      const snapshot = await uploadBytes(storageRef, blob);
      
      // 5. Get URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  }
};