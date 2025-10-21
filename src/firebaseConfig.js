// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC0YLx2aszsvJr7fLITcTXDNzEAx0wTEuE",
  authDomain: "shoppingapp-3434f.firebaseapp.com",
  projectId: "shoppingapp-3434f",
  storageBucket: "shoppingapp-3434f.firebasestorage.app",
  messagingSenderId: "711621504200",
  appId: "1:711621504200:web:b0f766f8e62edee98b49fd",
  measurementId: "G-16FH8E0L52"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;