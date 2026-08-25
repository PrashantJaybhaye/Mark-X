import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { initializeAuth, getAuth, Auth } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App if not already initialized
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage persistence for React Native
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
