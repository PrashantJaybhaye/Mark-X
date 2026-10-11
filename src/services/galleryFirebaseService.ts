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
  onSnapshot,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
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
  lastVisibleDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
  hasMore: boolean;
}

function getGalleryCollectionRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User must be logged in to access the gallery.");
  return collection(db, "users", uid, "gallery");
}

function sanitizeForServer(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

export async function fetchGalleryPinsFromServer(): Promise<GalleryPin[]> {
  try {
    const colRef = getGalleryCollectionRef();
    let q = query(colRef, orderBy("saved", "desc"), orderBy("createdAt", "desc"));
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (indexErr: any) {
      if (indexErr?.message?.includes("index")) {
        console.warn("[GalleryServerService] Composite index needed (saved DESC, createdAt DESC). Falling back to createdAt order.");
        q = query(colRef, orderBy("createdAt", "desc"));
        snapshot = await getDocs(q);
      } else {
        throw indexErr;
      }
    }

    const pins: GalleryPin[] = [];

    for (const docSnap of snapshot.docs) {
      const rawData = docSnap.data();
      const normalized = normalizeGalleryPin({ id: docSnap.id, ...rawData });
      pins.push(normalized);
    }

    await saveCachedGalleryPins(pins);
    await syncGalleryStats(pins.length);

    return pins;
  } catch (error) {
    console.error("[GalleryServerService] Fetch failed:", error);
    return await loadCachedGalleryPins();
  }
}

export async function fetchGalleryPinsPage(
  lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null = null,
  pageSize = GALLERY_PAGE_LIMIT
): Promise<PaginatedPinsResult> {
  try {
    const colRef = getGalleryCollectionRef();
    let q = query(colRef, orderBy("saved", "desc"), orderBy("createdAt", "desc"), limit(pageSize));
    if (lastDoc) {
      q = query(colRef, orderBy("saved", "desc"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize));
    }

    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (indexErr: any) {
      if (indexErr?.message?.includes("index")) {
        console.warn("[GalleryServerService] Composite index pending. Falling back to createdAt pagination.");
        let fallbackQ = query(colRef, orderBy("createdAt", "desc"), limit(pageSize));
        if (lastDoc) {
          fallbackQ = query(colRef, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize));
        }
        snapshot = await getDocs(fallbackQ);
      } else {
        throw indexErr;
      }
    }

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
    const q = query(colRef, orderBy("saved", "desc"), orderBy("createdAt", "desc"), limit(pageSize));
    let fallbackUnsub: (() => void) | null = null;

    const primaryUnsub = onSnapshot(
      q,
      (snapshot) => {
        const pins: GalleryPin[] = [];
        snapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          pins.push(normalizeGalleryPin({ id: docSnap.id, ...docSnap.data() }));
        });
        onUpdate(pins);
      },
      (error: any) => {
        if (error?.message?.includes("index")) {
          console.warn("[GalleryServerService] Composite index pending for real-time listener. Falling back to createdAt order.");
          const fallbackQ = query(colRef, orderBy("createdAt", "desc"), limit(pageSize));
          fallbackUnsub = onSnapshot(
            fallbackQ,
            (snapshot) => {
              const pins: GalleryPin[] = [];
              snapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
                pins.push(normalizeGalleryPin({ id: docSnap.id, ...docSnap.data() }));
              });
              onUpdate(pins);
            },
            (fallbackErr) => {
              if (onError) onError(fallbackErr);
            }
          );
          return;
        }
        console.warn("[GalleryServerService] Subscription error:", error);
        if (onError) onError(error);
      }
    );

    return () => {
      primaryUnsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  } catch (err) {
    console.warn("[GalleryServerService] Exception setting up gallery listener:", err);
    return () => {};
  }
}

export function subscribeGalleryPins(
  onUpdate: (pins: GalleryPin[]) => void,
  onError?: (error: Error) => void
): () => void {
  return subscribeLatestGalleryPins(onUpdate, GALLERY_PAGE_LIMIT, onError);
}

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

    try {
      const currentCached = await loadCachedGalleryPins();
      const filtered = currentCached.filter((p) => p.id !== normalized.id);
      await saveCachedGalleryPins([normalized, ...filtered]);
    } catch (cacheErr) {
      console.warn("[GalleryServerService] Error updating local cache on add:", cacheErr);
    }

    await setDoc(docRef, {
      ...cleanPin,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    updateGalleryStats(1).catch(console.warn);
  } catch (error) {
    console.error("[GalleryServerService] Add failed:", error);
    throw error;
  }
}

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

export async function deleteGalleryPinFromServer(pinId: string): Promise<void> {
  try {
    const colRef = getGalleryCollectionRef();
    const docRef = doc(colRef, pinId);

    await deleteDoc(docRef);

    const cached = await loadCachedGalleryPins();
    const updated = cached.filter((p) => p.id !== pinId);
    await saveCachedGalleryPins(updated);
    await syncGalleryStats(updated.length);
  } catch (error) {
    console.error("[GalleryServerService] Delete failed:", error);
    throw error;
  }
}

export const fetchGalleryPinsFromFirestore = fetchGalleryPinsFromServer;
export const addGalleryPinToFirestore = addGalleryPinToServer;
export const updateGalleryPinInFirestore = updateGalleryPinInServer;
export const deleteGalleryPinFromFirestore = deleteGalleryPinFromServer;
export const subscribeGalleryPinsFromFirestore = subscribeGalleryPins;
