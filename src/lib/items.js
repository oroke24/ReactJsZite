import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const itemsCol = (businessId) => collection(db, "businesses", businessId, "items");
const itemDoc = (businessId, itemId) => doc(db, "businesses", businessId, "items", itemId);

export async function addItem(businessId, data) {
  const ref = await addDoc(itemsCol(businessId), { ...data, createdAt: new Date() });
  return ref.id;
}

export async function getItems(businessId) {
  const snap = await getDocs(itemsCol(businessId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateItem(businessId, itemId, updates) {
  await updateDoc(itemDoc(businessId, itemId), updates);
}

export async function deleteItem(businessId, itemId) {
  await deleteDoc(itemDoc(businessId, itemId));
}

export async function getItemById(businessId, itemId) {
  const ref = itemDoc(businessId, itemId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: itemId, ...snap.data() } : null;
}
