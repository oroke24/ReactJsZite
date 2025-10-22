import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// --- Add a new business linked to user ---
export async function addBusiness(businessData, user) {
  const ref = await addDoc(collection(db, "businesses"), {
    ...businessData,
    ownerEmail: user.email,
    ownerUid: user.uid,
    createdAt: new Date(),
  });
  return ref.id;
}

// --- Get all businesses for a specific user ---
export async function getBusinessesByUser(uid) {
  const q = query(collection(db, "businesses"), where("ownerUid", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// --- Get a single business by ID ---
export async function getBusinessById(id) {
  const ref = doc(db, "businesses", id);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? { id, ...snapshot.data() } : null;
}

// --- Update business info ---
export async function updateBusiness(businessId, updates) {
  const ref = doc(db, "businesses", businessId);
  await updateDoc(ref, updates);
}
