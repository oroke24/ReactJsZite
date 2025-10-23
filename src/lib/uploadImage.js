import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebaseConfig";

/** Upload a new image for a business */
export async function uploadImage(file, businessId, folder = "products") {
  if (!file) return null;
  const fileRef = ref(storage, `${folder}/${businessId}/${Date.now()}_${file.name}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

/** Delete an image by URL */
export async function deleteImageByUrl(url) {
  if (!url) return;
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (error) {
    console.warn("Failed to delete old image:", error);
  }
}

/** Replace image (uploads new and removes old) */
export async function replaceImage(file, businessId, oldUrl, folder = "products") {
  if (!file) return oldUrl || null;

  const newUrl = await uploadImage(file, businessId, folder);

  if (oldUrl) {
    await deleteImageByUrl(oldUrl);
  }

  return newUrl;
}
