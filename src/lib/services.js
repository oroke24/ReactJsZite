/* eslint-disable */
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// --- Add a service ---
export async function addService(businessId, serviceData) {
  const ref = collection(db, "businesses", businessId, "services");
  const docRef = await addDoc(ref, {
    ...serviceData,
    createdAt: new Date(),
  });
  return docRef.id;
}

// --- Get all services for a business ---
export async function getServices(businessId) {
  const ref = collection(db, "businesses", businessId, "services");
  const snapshot = await getDocs(ref);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- Update a service ---
export async function updateService(businessId, serviceId, updates) {
  const ref = doc(db, "businesses", businessId, "services", serviceId);
  await updateDoc(ref, updates);
}

// --- Delete a service ---
export async function deleteService(businessId, serviceId) {
  const ref = doc(db, "businesses", businessId, "services", serviceId);
  await deleteDoc(ref);
}
