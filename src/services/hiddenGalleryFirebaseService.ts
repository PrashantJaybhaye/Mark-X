import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  where,
  writeBatch,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { auth, db } from "./firebase";
import { GalleryPin, normalizeGalleryPin } from "../utils/galleryData";
import {
  loadCachedGalleryPins,
  saveCachedGalleryPins,
  loadCachedHiddenGalleryPins,
  saveCachedHiddenGalleryPins,
  syncGalleryStats,
  recalculateTotalUsedStorageGB,
} from "./storageService";
import { deleteFileFromCloudflare } from "./cloudflareStorage";

export const HIDDEN_GALLERY_PAGE_LIMIT = 30;

function getGalleryColRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not authenticated");
  return collection(db, "users", uid, "gallery");
}

function parseDocPin(docSnap: FirebaseFirestoreTypes.DocumentSnapshot): GalleryPin {
  const data = docSnap.data() || {};
  return normalizeGalleryPin({ id: docSnap.id, ...data });
}

function sanitizeForServer(pin: Partial<GalleryPin>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(pin)) {
    if (value !== undefined && key !== "id" && key !== "uploadStatus" && key !== "localUri") {
      clean[key] = value;
    }
  }
  return clean;
}

// Auto-migrate any legacy pins from users/{uid}/hidden subcollection into users/{uid}/gallery with hidden: true
let hasMigratedLegacy = false;
async function autoMigrateLegacyHiddenSubcollection(uid: string) {
  if (hasMigratedLegacy) return;
  hasMigratedLegacy = true;
  try {
    const legacyCol = collection(db, "users", uid, "hidden");
    const legacySnap = await getDocs(legacyCol);
    if (legacySnap.docs.length > 0) {
      const galleryCol = collection(db, "users", uid, "gallery");
      for (const d of legacySnap.docs) {
        const data = d.data();
        await setDoc(
          doc(galleryCol, d.id),
          {
            ...data,
            hidden: true,
          },
          { merge: true }
        );
        await deleteDoc(d.ref);
      }
    }
  } catch (e) {
    // non-blocking
  }
}

export async function fetchHiddenGalleryPinsPage(
  lastDoc: any = null,
  pageSize = HIDDEN_GALLERY_PAGE_LIMIT
): Promise<{ pins: GalleryPin[]; lastVisibleDoc: any; hasMore: boolean }> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return { pins: [], lastVisibleDoc: null, hasMore: false };

    await autoMigrateLegacyHiddenSubcollection(uid);

    const colRef = getGalleryColRef();

    // Query gallery where hidden == true ordered by createdAt desc
    let snapshot: FirebaseFirestoreTypes.QuerySnapshot;
    try {
      const q = lastDoc
        ? query(colRef, where("hidden", "==", true), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize))
        : query(colRef, where("hidden", "==", true), orderBy("createdAt", "desc"), limit(pageSize));
      snapshot = await getDocs(q);
    } catch (indexErr: any) {
      // If composite index on (hidden + createdAt) is not yet built, fetch and filter client-side with zero error
      const fallbackQuery = lastDoc
        ? query(colRef, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize))
        : query(colRef, orderBy("createdAt", "desc"), limit(pageSize));
      const allSnap = await getDocs(fallbackQuery);
      const pins = allSnap.docs.map(parseDocPin).filter((p: GalleryPin) => !!p.hidden);
      const lastVisibleDoc = allSnap.docs.length > 0 ? allSnap.docs[allSnap.docs.length - 1] : null;
      return { pins, lastVisibleDoc, hasMore: allSnap.docs.length >= pageSize };
    }

    const pins = snapshot.docs.map(parseDocPin);
    const lastVisibleDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    const hasMore = snapshot.docs.length >= pageSize;

    await saveCachedHiddenGalleryPins(pins);
    return { pins, lastVisibleDoc, hasMore };
  } catch (err) {
    console.warn("[HiddenGallery] fetchHiddenGalleryPinsPage fallback to cache:", err);
    const cached = await loadCachedHiddenGalleryPins().catch(() => []);
    if (cached.length > 0) {
      return { pins: cached, lastVisibleDoc: null, hasMore: false };
    }
    const allCached = await loadCachedGalleryPins().catch(() => []);
    const filtered = allCached.filter((p: GalleryPin) => !!p.hidden);
    return { pins: filtered, lastVisibleDoc: null, hasMore: false };
  }
}

export function subscribeHiddenGalleryPins(
  onUpdate: (pins: GalleryPin[]) => void,
  pageSize = HIDDEN_GALLERY_PAGE_LIMIT,
  onError?: (error: Error) => void
): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    onUpdate([]);
    return () => {};
  }

  try {
    const colRef = getGalleryColRef();
    let fallbackUnsub: (() => void) | null = null;

    // 1. Try querying where hidden == true
    const primaryQuery = query(colRef, where("hidden", "==", true), orderBy("createdAt", "desc"), limit(pageSize));

    const primaryUnsub = onSnapshot(
      primaryQuery,
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
        const pins = snapshot.docs.map(parseDocPin);
        saveCachedHiddenGalleryPins(pins);
        onUpdate(pins);
      },
      (error: any) => {
        // If index is building or missing, subscribe to gallery and filter in memory
        if (error?.message?.includes("index")) {
          const fallbackQuery = query(colRef, orderBy("createdAt", "desc"), limit(pageSize));
          fallbackUnsub = onSnapshot(
            fallbackQuery,
            (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
              const pins = snap.docs.map(parseDocPin).filter((p: GalleryPin) => !!p.hidden);
              saveCachedHiddenGalleryPins(pins);
              onUpdate(pins);
            },
            onError
          );
        } else {
          console.warn("[HiddenGallery] Live sync warning:", error);
          onError?.(error);
        }
      }
    );

    return () => {
      primaryUnsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  } catch (err) {
    console.warn("[HiddenGallery] Listener setup error:", err);
    return () => {};
  }
}

/**
 * Move pin to hidden:
 * Sets hidden: true on the pin in the 'gallery' collection.
 * CRITICAL: createdAt is NEVER changed, preserving the original photo timestamp!
 */
export async function movePinToHiddenGallery(pinId: string): Promise<boolean> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    const colRef = getGalleryColRef();
    const docRef = doc(colRef, pinId);

    // Merge hidden: true into the existing document (preserving createdAt!)
    await setDoc(docRef, { hidden: true, updatedAt: serverTimestamp() }, { merge: true });

    // Update local caches
    const cachedGallery = await loadCachedGalleryPins();
    const updatedGallery = cachedGallery.map((p) => (p.id === pinId ? { ...p, hidden: true } : p));
    await saveCachedGalleryPins(updatedGallery);

    const targetPin = updatedGallery.find((p) => p.id === pinId);
    if (targetPin) {
      const cachedHidden = await loadCachedHiddenGalleryPins();
      const updatedHidden = [targetPin, ...cachedHidden.filter((p) => p.id !== pinId)];
      await saveCachedHiddenGalleryPins(updatedHidden);
    }

    return true;
  } catch (err) {
    console.error("[HiddenGallery] Failed to move pin to hidden:", err);
    return false;
  }
}

/**
 * Move pin back to main gallery:
 * Sets hidden: false on the pin in the 'gallery' collection.
 * CRITICAL: createdAt is NEVER changed!
 */
export async function movePinToMainGallery(pinId: string): Promise<boolean> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    const colRef = getGalleryColRef();
    const docRef = doc(colRef, pinId);

    // Merge hidden: false into the existing document (preserving createdAt!)
    await setDoc(docRef, { hidden: false, updatedAt: serverTimestamp() }, { merge: true });

    // Update local caches
    const cachedGallery = await loadCachedGalleryPins();
    const updatedGallery = cachedGallery.map((p) => (p.id === pinId ? { ...p, hidden: false } : p));
    await saveCachedGalleryPins(updatedGallery);

    const cachedHidden = await loadCachedHiddenGalleryPins();
    await saveCachedHiddenGalleryPins(cachedHidden.filter((p) => p.id !== pinId));

    return true;
  } catch (err) {
    console.error("[HiddenGallery] Failed to unhide pin:", err);
    return false;
  }
}

/**
 * Bulk move multiple pins back to main gallery atomically in a single batch.
 * Original createdAt timestamps are preserved, and Firestore fires only one clean event.
 */
export async function moveMultiplePinsToMainGallery(pinIds: string[]): Promise<boolean> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid || pinIds.length === 0) return false;

    const colRef = getGalleryColRef();
    const batch = writeBatch(db);

    for (const id of pinIds) {
      const docRef = doc(colRef, id);
      batch.set(docRef, { hidden: false, updatedAt: serverTimestamp() }, { merge: true });
    }

    await batch.commit();

    const targetSet = new Set(pinIds);
    const cachedGallery = await loadCachedGalleryPins();
    const updatedGallery = cachedGallery.map((p) => (targetSet.has(p.id) ? { ...p, hidden: false } : p));
    await saveCachedGalleryPins(updatedGallery);

    const cachedHidden = await loadCachedHiddenGalleryPins();
    await saveCachedHiddenGalleryPins(cachedHidden.filter((p) => !targetSet.has(p.id)));

    return true;
  } catch (err) {
    console.error("[HiddenGallery] Failed to bulk unhide pins:", err);
    return false;
  }
}

export async function deleteHiddenGalleryPinFromServer(pinId: string): Promise<void> {
  try {
    const colRef = getGalleryColRef();
    const docRef = doc(colRef, pinId);

    const cached = await loadCachedGalleryPins();
    const pin = cached.find((p) => p.id === pinId);
    const targetUrl = pin?.imageUrl;

    await deleteDoc(docRef);

    if (targetUrl && (targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))) {
      deleteFileFromCloudflare(targetUrl).catch(console.warn);
    }

    const updatedGallery = cached.filter((p) => p.id !== pinId);
    await saveCachedGalleryPins(updatedGallery);
    await syncGalleryStats(updatedGallery.filter((p) => !p.hidden).length);

    const cachedHidden = await loadCachedHiddenGalleryPins();
    await saveCachedHiddenGalleryPins(cachedHidden.filter((p) => p.id !== pinId));
    recalculateTotalUsedStorageGB().catch(console.warn);
  } catch (err) {
    console.error("[HiddenGallery] Delete error:", err);
  }
}

/**
 * Bulk delete multiple hidden pins atomically in a single batch.
 */
export async function deleteMultipleHiddenGalleryPins(pinIds: string[]): Promise<void> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid || pinIds.length === 0) return;

    const colRef = getGalleryColRef();
    const batch = writeBatch(db);

    const cached = await loadCachedGalleryPins();
    const targetSet = new Set(pinIds);
    const urlsToDelete = cached.filter((p) => targetSet.has(p.id) && p.imageUrl).map((p) => p.imageUrl);

    for (const id of pinIds) {
      const docRef = doc(colRef, id);
      batch.delete(docRef);
    }

    await batch.commit();

    for (const url of urlsToDelete) {
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        deleteFileFromCloudflare(url).catch(console.warn);
      }
    }

    const updatedGallery = cached.filter((p) => !targetSet.has(p.id));
    await saveCachedGalleryPins(updatedGallery);
    await syncGalleryStats(updatedGallery.filter((p) => !p.hidden).length);

    const cachedHidden = await loadCachedHiddenGalleryPins();
    await saveCachedHiddenGalleryPins(cachedHidden.filter((p) => !targetSet.has(p.id)));
    recalculateTotalUsedStorageGB().catch(console.warn);
  } catch (err) {
    console.error("[HiddenGallery] Bulk delete error:", err);
  }
}

export async function addHiddenGalleryPinToServer(pin: GalleryPin): Promise<void> {
  const normalized = normalizeGalleryPin({ ...pin, hidden: true });
  const colRef = getGalleryColRef();
  const docRef = doc(colRef, normalized.id);
  await setDoc(
    docRef,
    {
      ...sanitizeForServer(normalized),
      hidden: true,
      createdAt: normalized.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  recalculateTotalUsedStorageGB().catch(console.warn);
}

export async function updateHiddenGalleryPinInServer(pinId: string, updates: Partial<GalleryPin>): Promise<void> {
  const colRef = getGalleryColRef();
  const docRef = doc(colRef, pinId);
  await setDoc(
    docRef,
    {
      ...sanitizeForServer(updates),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const cachedHidden = await loadCachedHiddenGalleryPins();
  await saveCachedHiddenGalleryPins(cachedHidden.map((p) => (p.id === pinId ? { ...p, ...updates } : p)));
}
