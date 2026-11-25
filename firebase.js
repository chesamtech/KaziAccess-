// KaziAccess Firebase client configuration.
// The web config is public by design. Protect user data with Firestore Security Rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAuYpBEGJvq5wYiunEf3eOu3sN4eN6rNW8",
  authDomain: "kazi-acces.firebaseapp.com",
  projectId: "kazi-acces",
  storageBucket: "kazi-acces.firebasestorage.app",
  messagingSenderId: "321988330083",
  appId: "1:321988330083:web:4bd9d5df2f374106c62e56"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const authReady = setPersistence(auth, browserLocalPersistence);
