import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  FieldValue,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "./firebase";

export interface UserMetadata {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  username?: string | null;
  providerId: string;
  providers: string[];
  createdAt: FieldValue | string;
  lastLoginAt: FieldValue | string;
  updatedAt: FieldValue | string;
  stats?: {
    notesCount: number;
    galleryCount: number;
    driveCount: number;
    usedStorageGB: number;
  };
}

/**
 * Synchronizes user authentication metadata to Cloud Firestore under `users/{userId}`.
 * Preserves existing data using { merge: true }.
 */
export async function syncUserMetadata(
  user: User,
  isNewUser: boolean = false
): Promise<void> {
  if (!user?.uid) return;

  try {
    const userDocRef = doc(db, "users", user.uid);

    const providerList = user.providerData?.map((p) => p.providerId) || [];
    const primaryProvider =
      user.providerData?.[0]?.providerId ||
      (providerList.includes("google.com") ? "google.com" : "password");

    const resolvedPhotoURL =
      user.photoURL || user.providerData?.[0]?.photoURL || "";

    const baseData: Record<string, any> = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      photoURL: resolvedPhotoURL,
      emailVerified: user.emailVerified,
      providerId: primaryProvider,
      providers: providerList,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (isNewUser) {
      baseData.createdAt = user.metadata?.creationTime || serverTimestamp();
    }

    await setDoc(userDocRef, baseData, { merge: true });
  } catch (error) {
    console.warn("[UserService] Failed to sync user metadata to Firestore:", error);
  }
}

/**
 * Updates specific fields in user metadata (e.g. displayName, photoURL).
 */
export async function updateUserMetadata(
  uid: string,
  updates: Partial<Omit<UserMetadata, "uid">>
): Promise<void> {
  if (!uid) return;

  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(
      userDocRef,
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("[UserService] Failed to update user metadata in Firestore:", error);
  }
}

/**
 * Fetches user metadata document from Firestore.
 */
export async function getUserMetadata(
  uid: string
): Promise<UserMetadata | null> {
  if (!uid) return null;

  try {
    const userDocRef = doc(db, "users", uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserMetadata;
    }
    return null;
  } catch (error) {
    console.warn("[UserService] Failed to get user metadata from Firestore:", error);
    return null;
  }
}
