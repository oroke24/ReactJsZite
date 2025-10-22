import { collection, addDoc, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// --- Add a new business ---
export async function addBusiness(businessData) {
  const ref = await addDoc(collection(db, "businesses"), {
    ...businessData,
    createdAt: new Date()
  });
  return ref.id;
}

// --- Get all businesses ---
export async function getAllBusinesses() {
  const snapshot = await getDocs(collection(db, "businesses"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- Get business by ID ---
export async function getBusinessById(id) {
  const ref = doc(db, "businesses", id);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? { id, ...snapshot.data() } : null;
}

// --- Get business by owner email ---
export async function getBusinessByEmail(email) {
  const q = query(collection(db, "businesses"), where("ownerEmail", "==", email));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
