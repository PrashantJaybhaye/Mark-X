import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteField,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { GalleryPin, normalizeGalleryPin } from "../utils/galleryData";
import { 
  updateGalleryStats, 
  syncGalleryStats, 
  saveCachedGalleryPins, 
  loadCachedGalleryPins 
} from "./storageService";

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
 * Purges obsolete fields (title, domain, category, tags, description, storageEngine)
 * from all gallery pins in the user's Firestore database collection.
 */
export async function purgeLegacyFieldsFromDatabase(): Promise<number> {
  try {
    const colRef = getGalleryCollectionRef();
    const snapshot = await getDocs(colRef);
    const updates: Promise<any>[] = [];
    let count = 0;

    for (const docSnap of snapshot.docs) {
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

      if (hasLegacyFields || isMissingMetadata) {
        count++;
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
        };

        if (normalized.duration) {
          updatePayload.duration = normalized.duration;
        }

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
          likes: typeof rawData.likes === "number" ? rawData.likes : 1,
          isLiked: !!rawData.isLiked,
          saved: !!rawData.saved,
          createdAt: rawData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...(normalized.duration ? { duration: normalized.duration } : {}),
        });

        const cleanUpdatePayload = sanitizeForServer(updatePayload);
        updates.push(
          updateDoc(docSnap.ref, cleanUpdatePayload).catch(() => {
            // Overwrite cleanly if updateDoc fails
            return setDoc(docSnap.ref, cleanDoc);
          })
        );
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`[GalleryServerService] Successfully updated ${count} documents in DB to new filename format.`);
    }

    return count;
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

      // Check if this document contains legacy fields or has old filename format
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

      if (hasLegacyFields || isMissingMetadata) {
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
        };

        if (normalized.duration) {
          updatePayload.duration = normalized.duration;
        }

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
          likes: typeof rawData.likes === "number" ? rawData.likes : 1,
          isLiked: !!rawData.isLiked,
          saved: !!rawData.saved,
          createdAt: rawData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...(normalized.duration ? { duration: normalized.duration } : {}),
        });

        const cleanUpdatePayload = sanitizeForServer(updatePayload);
        migrationUpdates.push(
          updateDoc(docSnap.ref, cleanUpdatePayload).catch(() => {
            return setDoc(docSnap.ref, cleanDoc);
          })
        );
      }
    }

    // Await migrations so Firestore reflects changes immediately
    if (migrationUpdates.length > 0) {
      await Promise.all(migrationUpdates);
      console.log(`[GalleryServerService] Successfully purged legacy fields from ${migrationUpdates.length} pins in database.`);
    }

    // Always update local cache & stats with the full fresh list from the server (remote is source of truth)
    await saveCachedGalleryPins(pins);
    await syncGalleryStats(pins.length);

    return pins;
  } catch (error) {
    console.error("[GalleryServerService] Fetch failed:", error);
    // On network failure or offline, return local cache
    return await loadCachedGalleryPins();
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
  const uid = auth.currentUser?.uid;
  if (!uid) {
    onUpdate([]);
    return () => {};
  }

  try {
    const colRef = collection(db, "users", uid, "gallery");
    const q = query(colRef, orderBy("createdAt", "desc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const pins: GalleryPin[] = [];
        snapshot.forEach((docSnap) => {
          pins.push(normalizeGalleryPin({ id: docSnap.id, ...docSnap.data() }));
        });

        // Remote database is the source of truth: replace local cache & sync stats
        saveCachedGalleryPins(pins).catch(console.warn);
        syncGalleryStats(pins.length).catch(console.warn);
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

