import { auth } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
  sendPasswordResetEmail,
} from "firebase/auth";

// Sign up
export async function registerUser(email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Sign in
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Sign out
export async function logoutUser() {
  await signOut(auth);
}

// Observe auth state
export function onUserStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Send a verification email to the current user (or provided user)
export async function sendVerificationEmail(user) {
  const u = user || auth.currentUser;
  if (!u) throw new Error("No authenticated user");
  try {
    await sendEmailVerification(u);
  } catch (err) {
    // Retry once after a short delay using the currentUser to avoid timing issues
    await new Promise((r) => setTimeout(r, 500));
    try {
      if (auth.currentUser && auth.currentUser !== u) {
        await reload(auth.currentUser);
      }
    } catch {}
    const u2 = auth.currentUser || u;
    await sendEmailVerification(u2);
  }
}

// Reload current user to refresh emailVerified status
export async function reloadCurrentUser() {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

// Send password reset email to the provided address
export async function resetPassword(email) {
  if (!email) throw new Error("Email is required");
  await sendPasswordResetEmail(auth, email);
}
