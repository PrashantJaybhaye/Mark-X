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
  loadCachedGalleryPins,
  recalculateTotalUsedStorageGB,
} from "./storageService";
import { deleteFileFromCloudflare } from "./cloudflareStorage";

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

function getGalleryDocRef(pinId: string) {
  return doc(getGalleryCollectionRef(), pinId);
}

function parseDocPin(docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot): GalleryPin {
  return normalizeGalleryPin({ id: docSnap.id, ...docSnap.data() });
}

function sanitizeForServer(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) clean[key] = value;
  }
  return clean;
}

async function updateLocalCache(mutator: (cached: GalleryPin[]) => GalleryPin[]): Promise<void> {
  try {
    const cached = await loadCachedGalleryPins();
    await saveCachedGalleryPins(mutator(cached));
  } catch (err) {
    console.warn("[GalleryServerService] Local cache sync warning:", err);
  }
}

export async function fetchGalleryPinsFromServer(): Promise<GalleryPin[]> {
  try {
    const colRef = getGalleryCollectionRef();
    let q = query(colRef, orderBy("saved", "desc"), orderBy("createdAt", "desc"));
    let snapshot: FirebaseFirestoreTypes.QuerySnapshot;

    try {
      snapshot = await getDocs(q);
    } catch (indexErr: any) {
      if (indexErr?.message?.includes("index")) {
        console.warn("[GalleryServerService] Composite index needed. Falling back to createdAt order.");
        q = query(colRef, orderBy("createdAt", "desc"));
        snapshot = await getDocs(q);
      } else {
        throw indexErr;
      }
    }

    const pins = snapshot.docs.map(parseDocPin);
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
    const buildQuery = (useSavedIndex = true) => {
      if (useSavedIndex) {
        return lastDoc
          ? query(colRef, orderBy("saved", "desc"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize))
          : query(colRef, orderBy("saved", "desc"), orderBy("createdAt", "desc"), limit(pageSize));
      }
      return lastDoc
        ? query(colRef, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize))
        : query(colRef, orderBy("createdAt", "desc"), limit(pageSize));
    };

    let snapshot: FirebaseFirestoreTypes.QuerySnapshot;
    try {
      snapshot = await getDocs(buildQuery(true));
    } catch (indexErr: any) {
      if (indexErr?.message?.includes("index")) {
        console.warn("[GalleryServerService] Composite index pending. Falling back to createdAt pagination.");
        snapshot = await getDocs(buildQuery(false));
      } else {
        throw indexErr;
      }
    }

    const pins = snapshot.docs.map(parseDocPin);
    const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return {
      pins,
      lastVisibleDoc,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    console.warn("[GalleryServerService] Paginated fetch failed:", error);
    if (!lastDoc) {
      const cached = await loadCachedGalleryPins().catch(() => []);
      return { pins: cached, lastVisibleDoc: null, hasMore: false };
    }
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
    const handleSnapshot = (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
      onUpdate(snapshot.docs.map(parseDocPin));
    };

    let fallbackUnsub: (() => void) | null = null;
    const primaryQuery = query(colRef, orderBy("saved", "desc"), orderBy("createdAt", "desc"), limit(pageSize));

    const primaryUnsub = onSnapshot(
      primaryQuery,
      handleSnapshot,
      (error: any) => {
        if (
          error?.code === "firestore/permission-denied" ||
          error?.message?.includes("permission-denied")
        ) {
          return;
        }
        if (error?.message?.includes("index")) {
          console.warn("[GalleryServerService] Composite index pending for listener. Falling back to createdAt order.");
          const fallbackQuery = query(colRef, orderBy("createdAt", "desc"), limit(pageSize));
          fallbackUnsub = onSnapshot(fallbackQuery, handleSnapshot, onError);
          return;
        }
        console.warn("[GalleryServerService] Subscription error:", error);
        onError?.(error);
      }
    );

    return () => {
      primaryUnsub();
      fallbackUnsub?.();
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
  const normalized = normalizeGalleryPin(pin);
  await updateLocalCache((cached) => [normalized, ...cached.filter((p) => p.id !== normalized.id)]);

  const docRef = getGalleryDocRef(normalized.id);
  await setDoc(docRef, {
    ...sanitizeForServer(normalized),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  updateGalleryStats(1).catch(console.warn);
}

export async function updateGalleryPinInServer(pinId: string, updates: Partial<GalleryPin>): Promise<void> {
  await updateLocalCache((cached) => cached.map((p) => (p.id === pinId ? { ...p, ...updates } : p)));

  const docRef = getGalleryDocRef(pinId);
  await setDoc(
    docRef,
    {
      ...sanitizeForServer(updates),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteGalleryPinFromServer(pinId: string): Promise<void> {
  let targetUrl: string | undefined;
  try {
    const cached = await loadCachedGalleryPins();
    const pin = cached.find((p) => p.id === pinId);
    targetUrl = pin?.imageUrl;
  } catch {}

  const docRef = getGalleryDocRef(pinId);
  await deleteDoc(docRef);

  if (targetUrl && (targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))) {
    deleteFileFromCloudflare(targetUrl).catch((cErr) =>
      console.warn("[GalleryFirebaseService] Cloudflare R2 delete warning:", cErr)
    );
  }

  let remainingCount = 0;
  await updateLocalCache((cached) => {
    const updated = cached.filter((p) => p.id !== pinId);
    remainingCount = updated.length;
    return updated;
  });

  await syncGalleryStats(remainingCount);
  recalculateTotalUsedStorageGB().catch(console.warn);
}

export const fetchGalleryPinsFromFirestore = fetchGalleryPinsFromServer;
export const addGalleryPinToFirestore = addGalleryPinToServer;
export const updateGalleryPinInFirestore = updateGalleryPinInServer;
export const deleteGalleryPinFromFirestore = deleteGalleryPinFromServer;
export const subscribeGalleryPinsFromFirestore = subscribeGalleryPins;
