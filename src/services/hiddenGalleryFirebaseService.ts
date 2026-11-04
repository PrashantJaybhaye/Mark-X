import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { auth, db } from "./firebase";
import { GalleryPin, normalizeGalleryPin } from "../utils/galleryData";
import {
  loadCachedHiddenGalleryPins,
  saveCachedHiddenGalleryPins,
  loadCachedGalleryPins,
  saveCachedGalleryPins,
  syncGalleryStats,
  recalculateTotalUsedStorageGB,
} from "./storageService";
import { deleteFileFromCloudflare } from "./cloudflareStorage";

export const HIDDEN_GALLERY_PAGE_LIMIT = 30;

function getHiddenGalleryColRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not authenticated");
  return collection(db, "users", uid, "hidden_gallery");
}

function getMainGalleryColRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not authenticated");
  return collection(db, "users", uid, "gallery");
}

function parseDocPin(docSnap: FirebaseFirestoreTypes.DocumentSnapshot): GalleryPin {
  const data = docSnap.data() || {};
  return normalizeGalleryPin({ id: docSnap.id, ...data });
}

function sanitizeForServer(pin: Partial<GalleryPin>): Record<string, any> {
  const raw: Record<string, any> = { ...pin };
  delete raw.id;
  delete raw.uploadStatus;
  delete raw.localUri;
  return raw;
}

export async function fetchHiddenGalleryPinsPage(
  lastDoc: any = null,
  pageSize = HIDDEN_GALLERY_PAGE_LIMIT
): Promise<{ pins: GalleryPin[]; lastVisibleDoc: any; hasMore: boolean }> {
  try {
    const colRef = getHiddenGalleryColRef();
    let q = query(colRef, orderBy("createdAt", "desc"), limit(pageSize));
    if (lastDoc) {
      q = query(colRef, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize));
    }

    const snapshot = await getDocs(q);
    const pins = snapshot.docs.map(parseDocPin);
    const lastVisibleDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    const hasMore = snapshot.docs.length >= pageSize;

    return { pins, lastVisibleDoc, hasMore };
  } catch (err) {
    console.warn("[HiddenGallery] fetchHiddenGalleryPinsPage fallback to cache:", err);
    if (!lastDoc) {
      const cached = await loadCachedHiddenGalleryPins().catch(() => []);
      return { pins: cached, lastVisibleDoc: null, hasMore: false };
    }
    return { pins: [], lastVisibleDoc: null, hasMore: false };
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
    const colRef = collection(db, "users", uid, "hidden_gallery");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(pageSize));

    const unsub = onSnapshot(
      q,
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
        onUpdate(snapshot.docs.map(parseDocPin));
      },
      (error: any) => {
        console.warn("[HiddenGallery] Live sync warning:", error);
        onError?.(error);
      }
    );

    return unsub;
  } catch (err) {
    console.warn("[HiddenGallery] Listener setup error:", err);
    return () => {};
  }
}

export async function addHiddenGalleryPinToServer(pin: GalleryPin): Promise<void> {
  const normalized = normalizeGalleryPin(pin);
  const cached = await loadCachedHiddenGalleryPins();
  await saveCachedHiddenGalleryPins([normalized, ...cached.filter((p) => p.id !== normalized.id)]);

  const docRef = doc(getHiddenGalleryColRef(), normalized.id);
  await setDoc(docRef, {
    ...sanitizeForServer(normalized),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  recalculateTotalUsedStorageGB().catch(console.warn);
}

export async function updateHiddenGalleryPinInServer(pinId: string, updates: Partial<GalleryPin>): Promise<void> {
  const cached = await loadCachedHiddenGalleryPins();
  await saveCachedHiddenGalleryPins(cached.map((p) => (p.id === pinId ? { ...p, ...updates } : p)));

  const docRef = doc(getHiddenGalleryColRef(), pinId);
  await setDoc(
    docRef,
    {
      ...sanitizeForServer(updates),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteHiddenGalleryPinFromServer(pinId: string): Promise<void> {
  const cached = await loadCachedHiddenGalleryPins();
  const pin = cached.find((p) => p.id === pinId);
  const targetUrl = pin?.imageUrl;

  const docRef = doc(getHiddenGalleryColRef(), pinId);
  await deleteDoc(docRef);

  if (targetUrl && (targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))) {
    deleteFileFromCloudflare(targetUrl).catch(console.warn);
  }

  await saveCachedHiddenGalleryPins(cached.filter((p) => p.id !== pinId));
  recalculateTotalUsedStorageGB().catch(console.warn);
}

export async function movePinToHiddenGallery(pinId: string): Promise<boolean> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    // 1. Get from main gallery
    const mainDocRef = doc(getMainGalleryColRef(), pinId);
    const mainSnap = await getDoc(mainDocRef);
    let pinData: GalleryPin | null = null;

    if (mainSnap.exists()) {
      const data = mainSnap.data() || {};
      pinData = normalizeGalleryPin({ id: mainSnap.id, ...data });
    } else {
      const cached = await loadCachedGalleryPins();
      const found = cached.find((p) => p.id === pinId);
      if (found) pinData = found;
    }

    if (!pinData) return false;

    // 2. Add to hidden gallery
    await addHiddenGalleryPinToServer(pinData);

    // 3. Remove from main gallery
    await deleteDoc(mainDocRef);
    const mainCached = await loadCachedGalleryPins();
    const updatedMain = mainCached.filter((p) => p.id !== pinId);
    await saveCachedGalleryPins(updatedMain);
    await syncGalleryStats(updatedMain.length);

    return true;
  } catch (err) {
    console.error("[HiddenGallery] Failed to move pin to hidden:", err);
    return false;
  }
}

export async function movePinToMainGallery(pinId: string): Promise<boolean> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    // 1. Get from hidden gallery
    const hiddenDocRef = doc(getHiddenGalleryColRef(), pinId);
    const hiddenSnap = await getDoc(hiddenDocRef);
    let pinData: GalleryPin | null = null;

    if (hiddenSnap.exists()) {
      const data = hiddenSnap.data() || {};
      pinData = normalizeGalleryPin({ id: hiddenSnap.id, ...data });
    } else {
      const cached = await loadCachedHiddenGalleryPins();
      const found = cached.find((p) => p.id === pinId);
      if (found) pinData = found;
    }

    if (!pinData) return false;

    // 2. Add to main gallery
    const mainDocRef = doc(getMainGalleryColRef(), pinData.id);
    await setDoc(mainDocRef, {
      ...sanitizeForServer(pinData),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const mainCached = await loadCachedGalleryPins();
    const updatedMain = [pinData, ...mainCached.filter((p) => p.id !== pinData!.id)];
    await saveCachedGalleryPins(updatedMain);
    await syncGalleryStats(updatedMain.length);

    // 3. Remove from hidden gallery
    await deleteDoc(hiddenDocRef);
    const hiddenCached = await loadCachedHiddenGalleryPins();
    await saveCachedHiddenGalleryPins(hiddenCached.filter((p) => p.id !== pinId));

    return true;
  } catch (err) {
    console.error("[HiddenGallery] Failed to move pin to main:", err);
    return false;
  }
}
