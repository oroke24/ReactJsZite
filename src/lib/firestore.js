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
  deleteDoc,
  writeBatch,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { runTransaction, deleteField as fsDeleteField } from "firebase/firestore";

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

// Ensure a business document exists for the given user using a stable ID (uid).
// Returns the businessId (uid).
export async function ensureBusinessForUser(user, defaults = {}) {
  const businessId = user.uid;
  const ref = doc(db, "businesses", businessId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name: defaults.name || `${(user.email || "user").split("@")[0]}'s Shop`,
      description: defaults.description || "Welcome to my store!",
      ownerEmail: user.email || "",
      ownerUid: user.uid,
      createdAt: new Date(),
    }, { merge: true });
  } else if (defaults && Object.keys(defaults).length > 0) {
    // Merge any provided defaults into existing doc without overwriting ownership
    await setDoc(ref, {
      name: defaults.name,
      description: defaults.description,
    }, { merge: true });
  }
  return businessId;
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
  // Prefer server-side ordering by 'order' ascending when available
  const q = query(ref, orderBy("order", "asc"));
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Fallback: ensure a stable sort when some docs might not have 'order'
  return rows
    .slice()
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || (a.name || "").localeCompare(b.name || ""));
}

export async function updateCollection(businessId, collectionId, updates) {
  const ref = doc(db, "businesses", businessId, "collections", collectionId);
  await updateDoc(ref, updates);
}

export async function deleteCollection(businessId, collectionId) {
  const ref = doc(db, "businesses", businessId, "collections", collectionId);

  // First, delete membership docs under this collection (subcollections: products, services)
  const colProductsRef = collection(db, "businesses", businessId, "collections", collectionId, "products");
  const colServicesRef = collection(db, "businesses", businessId, "collections", collectionId, "services");
  const colItemsRef = collection(db, "businesses", businessId, "collections", collectionId, "items");
  const [colProdSnap, colSvcSnap, colItemSnap] = await Promise.all([getDocs(colProductsRef), getDocs(colServicesRef), getDocs(colItemsRef)]);
  const batch1 = writeBatch(db);
  colProdSnap.docs.forEach((d) => batch1.delete(d.ref));
  colSvcSnap.docs.forEach((d) => batch1.delete(d.ref));
  colItemSnap.docs.forEach((d) => batch1.delete(d.ref));
  if (colProdSnap.docs.length > 0 || colSvcSnap.docs.length > 0 || colItemSnap.docs.length > 0) {
    await batch1.commit();
  }

  // Then hard delete the collection document itself
  await deleteDoc(ref);
}

// --- Collection membership helpers ---
export async function getCollectionMembers(businessId, collectionId, type) {
  const ref = collection(db, "businesses", businessId, "collections", collectionId, type); // type: 'products' | 'services'
  const snap = await getDocs(ref);
  return snap.docs.map((d) => d.id);
}

export async function addCollectionMember(businessId, collectionId, type, itemId) {
  // store membership doc id as the item id for idempotency
  const ref = doc(db, "businesses", businessId, "collections", collectionId, type, itemId);
  await setDoc(ref, { createdAt: new Date() }, { merge: true });
}

export async function removeCollectionMember(businessId, collectionId, type, itemId) {
  const ref = doc(db, "businesses", businessId, "collections", collectionId, type, itemId);
  await deleteDoc(ref);
}

// --- User support requests ---
export async function addUserRequest({ userId, businessId, email, message }) {
  const ref = await addDoc(collection(db, "userRequest"), {
    userId: userId || null,
    businessId: businessId || null,
    email: email || "",
    message: message || "",
    createdAt: new Date(),
  });
  return ref.id;
}

// --- Vanity slug helpers for public storefront URLs ---
const SLUG_MIN = 3;
const SLUG_MAX = 30;
const RESERVED_SLUGS = new Set([
  "store",
  "stores",
  "dashboard",
  "login",
  "register",
  "account",
  "verify-email",
  "about",
  "api",
  "admin",
]);

export function normalizeSlug(input) {
  if (!input) return "";
  let s = String(input).trim().toLowerCase();
  // Replace invalid chars with '-'
  s = s.replace(/[^a-z0-9-]/g, "-");
  // Collapse repeats and trim dashes at ends
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return s;
}

export function validateSlug(slug) {
  if (!slug) return { ok: false, reason: "empty" };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, reason: "reserved" };
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) return { ok: false, reason: "length" };
  // must start/end with alphanumeric, only a-z0-9-
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/.test(slug)) return { ok: false, reason: "format" };
  return { ok: true };
}

export async function getBusinessIdBySlug(slug) {
  const ref = doc(db, "slugs", slug);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data()?.businessId || null : null;
}

export async function checkSlugAvailable(slug) {
  const s = normalizeSlug(slug);
  const val = validateSlug(s);
  if (!val.ok) return { available: false, reason: val.reason, slug: s };
  const exists = await getDoc(doc(db, "slugs", s));
  return { available: !exists.exists(), reason: exists.exists() ? "taken" : null, slug: s };
}

export async function setBusinessSlug(businessId, requestedSlug) {
  const newSlug = normalizeSlug(requestedSlug);
  const val = validateSlug(newSlug);
  if (!val.ok) throw new Error(`Invalid slug: ${val.reason}`);
  await runTransaction(db, async (tx) => {
    const businessRef = doc(db, "businesses", businessId);
    const businessSnap = await tx.get(businessRef);
    if (!businessSnap.exists()) throw new Error("Business not found");
    const currentSlug = businessSnap.data()?.slug || null;

    const newSlugRef = doc(db, "slugs", newSlug);
    const newSlugSnap = await tx.get(newSlugRef);
    if (newSlugSnap.exists()) {
      const owner = newSlugSnap.data()?.businessId;
      if (owner !== businessId) throw new Error("taken");
      // else already owned by this business, proceed to set on business doc
    }
    // If changing, release old
    if (currentSlug && currentSlug !== newSlug) {
      const oldRef = doc(db, "slugs", currentSlug);
      tx.delete(oldRef);
    }
    // Claim new
    tx.set(newSlugRef, { businessId, createdAt: new Date() });
    tx.update(businessRef, { slug: newSlug });
  });
  return newSlug;
}

export async function clearBusinessSlug(businessId) {
  await runTransaction(db, async (tx) => {
    const businessRef = doc(db, "businesses", businessId);
    const businessSnap = await tx.get(businessRef);
    if (!businessSnap.exists()) return;
    const currentSlug = businessSnap.data()?.slug;
    if (currentSlug) {
      tx.delete(doc(db, "slugs", currentSlug));
    }
    tx.update(businessRef, { slug: fsDeleteField() });
  });
}
