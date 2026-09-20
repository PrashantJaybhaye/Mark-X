import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  updateDoc,
  deleteField,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { GalleryPin, normalizeGalleryPin } from "../utils/galleryData";
import { 
  updateGalleryStats, 
  syncGalleryStats, 
  saveCachedGalleryPins, 
  loadCachedGalleryPins 
} from "./storageService";

export const GALLERY_PAGE_LIMIT = 12;

export interface PaginatedPinsResult {
  pins: GalleryPin[];
  lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Gets a reference to the user's isolated gallery subcollection on the server
 */
function getGalleryCollectionRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User must be logged in to access the gallery.");
  return collection(db, "users", uid, "gallery");
}

/**
 * Sanitizes an object by removing any keys with `undefined` values.
 * Firestore throws a runtime error if any key has an `undefined` value.
 */
function sanitizeForServer(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Migrates a legacy pin document to the current schema if legacy fields or missing metadata are detected.
 * Returns the update Promise if migration is needed, or null if already up to date.
 */
function migratePinDocumentIfNeeded(docSnap: QueryDocumentSnapshot<DocumentData>): Promise<any> | null {
  const rawData = docSnap.data();
  const normalized = normalizeGalleryPin({ id: docSnap.id, ...rawData });

  const hasLegacyFields =
    rawData.title !== undefined ||
    rawData.domain !== undefined ||
    rawData.category !== undefined ||
    rawData.tags !== undefined ||
    rawData.description !== undefined ||
    rawData.storageEngine !== undefined;

  const isInvalidOrOldFileName =
    !rawData.fileName ||
    !/^\d{12,14}\.(jpe?g|png|webp|mp4|mov)$/i.test(rawData.fileName);

  const isMissingMetadata =
    isInvalidOrOldFileName ||
    !rawData.fileSizeFormatted ||
    !rawData.width ||
    !rawData.height ||
    !rawData.mimeType;

  if (!hasLegacyFields && !isMissingMetadata) {
    return null;
  }

  const updatePayload: Record<string, any> = {
    title: deleteField(),
    domain: deleteField(),
    category: deleteField(),
    tags: deleteField(),
    description: deleteField(),
    storageEngine: deleteField(),
    fileName: normalized.fileName,
    width: normalized.width,
    height: normalized.height,
    fileSize: normalized.fileSize,
    fileSizeFormatted: normalized.fileSizeFormatted,
    mimeType: normalized.mimeType,
    author: rawData.author || "You",
    updatedAt: serverTimestamp(),
    ...(normalized.duration ? { duration: normalized.duration } : {}),
  };

  const cleanDoc = sanitizeForServer({
    id: docSnap.id,
    imageUrl: rawData.imageUrl || normalized.imageUrl,
    fileName: normalized.fileName,
    mediaType: rawData.mediaType || normalized.mediaType || "image",
    aspectRatio: rawData.aspectRatio || normalized.aspectRatio || 0.75,
    width: normalized.width,
    height: normalized.height,
    fileSize: normalized.fileSize,
    fileSizeFormatted: normalized.fileSizeFormatted,
    mimeType: normalized.mimeType,
    author: rawData.author || "You",
    likes: typeof rawData.likes === "number" ? rawData.likes : 0,
    isLiked: !!rawData.isLiked,
    saved: !!rawData.saved,
    createdAt: rawData.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(normalized.duration ? { duration: normalized.duration } : {}),
  });

  const cleanUpdatePayload = sanitizeForServer(updatePayload);
  return updateDoc(docSnap.ref, cleanUpdatePayload).catch(() => setDoc(docSnap.ref, cleanDoc));
}

/**
 * Purges obsolete fields (title, domain, category, tags, description, storageEngine)
 * from all gallery pins in the user's Firestore database collection.
 */
export async function purgeLegacyFieldsFromDatabase(): Promise<number> {
  try {
    const colRef = getGalleryCollectionRef();
    const snapshot = await getDocs(colRef);
    const updates: Promise<any>[] = [];

    for (const docSnap of snapshot.docs) {
      const migrationPromise = migratePinDocumentIfNeeded(docSnap);
      if (migrationPromise) {
        updates.push(migrationPromise);
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`[GalleryServerService] Successfully updated ${updates.length} legacy documents in DB.`);
    }

    return updates.length;
  } catch (err) {
    console.warn("[GalleryServerService] Error updating legacy fields in DB:", err);
    return 0;
  }
}

/**
 * Fetches all gallery pins from the server for the logged-in user.
 * Pins are returned ordered by their creation/update time in descending order.
 * Automatically updates any legacy or old filename format in the database.
 */
export async function fetchGalleryPinsFromServer(): Promise<GalleryPin[]> {
  try {
    const colRef = getGalleryCollectionRef();
    const q = query(colRef, orderBy("createdAt", "desc")); 
    const snapshot = await getDocs(q);
    
    const pins: GalleryPin[] = [];
    const migrationUpdates: Promise<any>[] = [];

    for (const docSnap of snapshot.docs) {
      const rawData = docSnap.data();
      const normalized = normalizeGalleryPin({ id: docSnap.id, ...rawData });
      pins.push(normalized);

      const migrationPromise = migratePinDocumentIfNeeded(docSnap);
      if (migrationPromise) {
        migrationUpdates.push(migrationPromise);
      }
    }

    // Await migrations in background without blocking pin delivery
    if (migrationUpdates.length > 0) {
      Promise.all(migrationUpdates).catch(console.warn);
    }

    // Always update local cache & stats with the full fresh list from the server
    await saveCachedGalleryPins(pins);
    await syncGalleryStats(pins.length);

    return pins;
  } catch (error) {
    console.error("[GalleryServerService] Fetch failed:", error);
    return await loadCachedGalleryPins();
  }
}

/**
 * Fetches a paginated batch of gallery pins (default limit: 12) from Firestore.
 */
export async function fetchGalleryPinsPage(
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize = GALLERY_PAGE_LIMIT
): Promise<PaginatedPinsResult> {
  try {
    const colRef = getGalleryCollectionRef();
    let q = query(colRef, orderBy("createdAt", "desc"), limit(pageSize));
    if (lastDoc) {
      q = query(colRef, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize));
    }
    const snapshot = await getDocs(q);
    const pins: GalleryPin[] = [];

    for (const docSnap of snapshot.docs) {
      const rawData = docSnap.data();
      pins.push(normalizeGalleryPin({ id: docSnap.id, ...rawData }));
    }

    const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === pageSize;

    return {
      pins,
      lastVisibleDoc,
      hasMore,
    };
  } catch (error) {
    console.warn("[GalleryServerService] Paginated fetch failed:", error);
    return { pins: [], lastVisibleDoc: null, hasMore: false };
  }
}

/**
 * Subscribes to real-time gallery updates for the latest pins (default limit: 12) from Firestore.
 */
export function subscribeLatestGalleryPins(
  onUpdate: (pins: GalleryPin[]) => void,
  pageSize = GALLERY_PAGE_LIMIT,
  onError?: (error: Error) => void
): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    onUpdate([]);
    return () => {};
  }

  try {
    const colRef = collection(db, "users", uid, "gallery");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(pageSize));

    return onSnapshot(
      q,
      (snapshot) => {
        const pins: GalleryPin[] = [];
        snapshot.forEach((docSnap) => {
          pins.push(normalizeGalleryPin({ id: docSnap.id, ...docSnap.data() }));
        });
        onUpdate(pins);
      },
      (error) => {
        console.warn("[GalleryServerService] Subscription error:", error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn("[GalleryServerService] Exception setting up gallery listener:", err);
    return () => {};
  }
}

/**
 * Subscribes to real-time gallery updates from Firestore.
 * When an image is added, modified, or deleted in the database, the listener
 * immediately receives the full snapshot, updates the local cache, syncs stats,
 * and notifies the UI.
 */
export function subscribeGalleryPins(
  onUpdate: (pins: GalleryPin[]) => void,
  onError?: (error: Error) => void
): () => void {
  return subscribeLatestGalleryPins(onUpdate, GALLERY_PAGE_LIMIT, onError);
}

/**
 * Adds a new gallery pin to the server.
 */
export async function addGalleryPinToServer(pin: GalleryPin): Promise<void> {
  try {
    const colRef = getGalleryCollectionRef();
    const docRef = doc(colRef, pin.id);
    
    const normalized = normalizeGalleryPin(pin);
    const cleanPin = sanitizeForServer({
      id: normalized.id,
      imageUrl: normalized.imageUrl,
      fileName: normalized.fileName,
      mediaType: normalized.mediaType,
      duration: normalized.duration,
      aspectRatio: normalized.aspectRatio,
      width: normalized.width,
      height: normalized.height,
      fileSize: normalized.fileSize,
      fileSizeFormatted: normalized.fileSizeFormatted,
      mimeType: normalized.mimeType,
      author: normalized.author,
      likes: normalized.likes,
      isLiked: normalized.isLiked,
      saved: normalized.saved,
    });

    await setDoc(docRef, {
      ...cleanPin,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update the local/server user stats asynchronously
    updateGalleryStats(1).catch(console.warn);
  } catch (error) {
    console.error("[GalleryServerService] Add failed:", error);
    throw error;
  }
}

/**
 * Updates an existing gallery pin on the server (e.g. toggling a like).
 */
export async function updateGalleryPinInServer(pinId: string, updates: Partial<GalleryPin>): Promise<void> {
  try {
    const colRef = getGalleryCollectionRef();
    const docRef = doc(colRef, pinId);
    
    const cleanUpdates = sanitizeForServer(updates);

    await setDoc(docRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("[GalleryServerService] Update failed:", error);
    throw error;
  }
}

/**
 * Deletes a gallery pin from the server and immediately purges it from local cache.
 */
export async function deleteGalleryPinFromServer(pinId: string): Promise<void> {
  try {
    const colRef = getGalleryCollectionRef();
    const docRef = doc(colRef, pinId);
    
    await deleteDoc(docRef);

    // Immediately remove from local cache and sync stats
    const cached = await loadCachedGalleryPins();
    const updated = cached.filter((p) => p.id !== pinId);
    await saveCachedGalleryPins(updated);
    await syncGalleryStats(updated.length);
  } catch (error) {
    console.error("[GalleryServerService] Delete failed:", error);
    throw error;
  }
}

// Backward-compatible aliases
export const fetchGalleryPinsFromFirestore = fetchGalleryPinsFromServer;
export const addGalleryPinToFirestore = addGalleryPinToServer;
export const updateGalleryPinInFirestore = updateGalleryPinInServer;
export const deleteGalleryPinFromFirestore = deleteGalleryPinFromServer;
export const subscribeGalleryPinsFromFirestore = subscribeGalleryPins;

