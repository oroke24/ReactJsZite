/* eslint-disable */
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// --- Add a product ---
export async function addProduct(businessId, productData) {
  const ref = collection(db, "businesses", businessId, "products");
  const docRef = await addDoc(ref, {
    ...productData,
    createdAt: new Date(),
  });
  return docRef.id;
}

// --- Get all products for a business ---
export async function getProducts(businessId) {
  const ref = collection(db, "businesses", businessId, "products");
  const snapshot = await getDocs(ref);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- Update a product ---
export async function updateProduct(businessId, productId, updates) {
  const ref = doc(db, "businesses", businessId, "products", productId);
  await updateDoc(ref, updates);
}

// --- Delete a product ---
export async function deleteProduct(businessId, productId) {
  const ref = doc(db, "businesses", businessId, "products", productId);
  await deleteDoc(ref);
}
