import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Create a simple order/purchase request under a business
export async function addOrder(businessId, data) {
  const ref = collection(db, "businesses", businessId, "orders");
  const docRef = await addDoc(ref, { ...data, createdAt: new Date() });
  return docRef.id;
}

// List orders for a business, newest first. Optional status filter: 'requested' | 'in-progress' | 'done'
export async function getOrders(businessId, status) {
  const ref = collection(db, "businesses", businessId, "orders");
  const q = status ? query(ref, where('status', '==', status), orderBy('createdAt', 'desc')) : query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : (data.createdAt || null);
    return { id: d.id, ...data, createdAt };
  });
}

export async function updateOrder(businessId, orderId, updates) {
  const ref = doc(db, "businesses", businessId, "orders", orderId);
  await updateDoc(ref, updates);
}

export async function deleteOrder(businessId, orderId) {
  const ref = doc(db, "businesses", businessId, "orders", orderId);
  await deleteDoc(ref);
}
