import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Initialize Firestore with configured database ID
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Authentication helper methods
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn("Popup sign-in blocked or failed, attempting redirect/fallback:", error);
    if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user") {
      try {
        await signInWithRedirect(auth, googleProvider);
        throw new Error("Redirecting to Google Sign-In...");
      } catch (redirectError: any) {
        throw redirectError;
      }
    }
    throw error;
  }
}

export async function signInAsGuest(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function logOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged };
export type { User };
