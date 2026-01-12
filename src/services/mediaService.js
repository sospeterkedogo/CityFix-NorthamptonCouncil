import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

export const MediaService = {
  uploadFile: async (uri, folder = "reports") => {
    try {
      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      const timestamp = Date.now();
      const storagePath = `${folder}/${timestamp}_${filename}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, storagePath);

      const snapshot = await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(snapshot.ref);

      return downloadURL;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  }
};