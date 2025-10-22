import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  updateDoc,
  setDoc,
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

// --- User profile helpers ---
export async function setUserProfile(uid, profile) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, profile, { merge: true });
}

export async function getUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// --- Business collections (for categories, menus, etc) ---
export async function addCollection(businessId, collectionData) {
  const ref = collection(db, "businesses", businessId, "collections");
  const docRef = await addDoc(ref, { ...collectionData, createdAt: new Date() });
  return docRef.id;
}

export async function getCollections(businessId) {
  const ref = collection(db, "businesses", businessId, "collections");
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateCollection(businessId, collectionId, updates) {
  const ref = doc(db, "businesses", businessId, "collections", collectionId);
  await updateDoc(ref, updates);
}
