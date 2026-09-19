import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { GalleryPin } from "../utils/galleryData";
import { updateGalleryStats } from "./storageService";

/**
 * Gets a reference to the user's isolated gallery subcollection
 */
function getGalleryCollectionRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User must be logged in to access the gallery.");
  return collection(db, "users", uid, "gallery");
}

/**
 * Fetches all gallery pins from Firestore for the logged-in user.
 * Pins are returned ordered by their creation/update time in descending order.
 */
export async function fetchGalleryPinsFromFirestore(): Promise<GalleryPin[]> {
  try {
    const colRef = getGalleryCollectionRef();
    // We order by createdAt descending to show newest first
    const q = query(colRef, orderBy("createdAt", "desc")); 
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as GalleryPin);
  } catch (error) {
    console.error("[GalleryFirebaseService] Fetch failed:", error);
    return [];
  }
}

/**
 * Adds a new gallery pin to Firestore.
 */
export async function addGalleryPinToFirestore(pin: GalleryPin): Promise<void> {
  try {
    const colRef = getGalleryCollectionRef();
    const docRef = doc(colRef, pin.id);
    
    await setDoc(docRef, {
      ...pin,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update the local/firebase user stats asynchronously
    updateGalleryStats(1).catch(console.warn);
  } catch (error) {
    console.error("[GalleryFirebaseService] Add failed:", error);
    throw error;
  }
}

/**
 * Updates an existing gallery pin in Firestore (e.g. toggling a like).
 */
export async function updateGalleryPinInFirestore(pinId: string, updates: Partial<GalleryPin>): Promise<void> {
  try {
    const colRef = getGalleryCollectionRef();
    const docRef = doc(colRef, pinId);
    
    await setDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("[GalleryFirebaseService] Update failed:", error);
    throw error;
  }
}

/**
 * Deletes a gallery pin from Firestore.
 */
export async function deleteGalleryPinFromFirestore(pinId: string): Promise<void> {
  try {
    const colRef = getGalleryCollectionRef();
    const docRef = doc(colRef, pinId);
    
    await deleteDoc(docRef);

    // Update the local/firebase user stats asynchronously
    updateGalleryStats(-1).catch(console.warn);
  } catch (error) {
    console.error("[GalleryFirebaseService] Delete failed:", error);
    throw error;
  }
}
