import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { db, auth } from "./firebase";
import { DriveItem, DriveFileCategory } from "../utils/driveFileTypes";
import { loadDriveItems, saveDriveItems } from "./storageService";
import { uploadFileToCloudflare, UploadProgressCallback } from "./cloudflareStorage";
import { getMimeTypeForFile } from "./nativeFileOpenerService";

async function cleanupLocalDiskFile(uri?: string) {
  if (!uri || !uri.startsWith("file://")) return;
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo?.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (err) {
    console.warn("[DriveFirebaseService] Cache disk file cleanup warning:", err);
  }
}

function getDriveCollectionRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User must be logged in to access drive on the server.");
  return collection(db, "users", uid, "drive");
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

export function formatDriveTimestamp(raw?: string | number): string {
  if (!raw) return "Just now";
  let timeMs = 0;
  if (typeof raw === "number") {
    timeMs = raw;
  } else if (!isNaN(Number(raw))) {
    timeMs = Number(raw);
  } else {
    timeMs = Date.parse(raw);
  }

  if (isNaN(timeMs) || timeMs <= 0) {
    return String(raw).replace(/^(You opened • |Edited )/i, "");
  }

  const date = new Date(timeMs);
  const now = Date.now();
  const diffSec = Math.floor((now - timeMs) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;

  const isToday =
    date.getDate() === new Date().getDate() &&
    date.getMonth() === new Date().getMonth() &&
    date.getFullYear() === new Date().getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function normalizeDriveItem(raw: any): DriveItem {
  const createdAtNum =
    typeof raw.createdAt === "number"
      ? raw.createdAt
      : raw.createdAt?.toMillis?.() || Date.now();

  let updatedAtVal = String(Date.now());
  if (typeof raw.updatedAt === "number") {
    updatedAtVal = String(raw.updatedAt);
  } else if (raw.updatedAt?.toMillis) {
    updatedAtVal = String(raw.updatedAt.toMillis());
  } else if (raw.updatedAt && !isNaN(Number(raw.updatedAt))) {
    updatedAtVal = String(raw.updatedAt);
  } else if (raw.updatedAt && !isNaN(Date.parse(raw.updatedAt))) {
    updatedAtVal = String(Date.parse(raw.updatedAt));
  } else {
    updatedAtVal = String(createdAtNum);
  }

  return {
    id: String(raw.id || ""),
    name: String(raw.name || "Untitled"),
    category: (raw.category as DriveFileCategory) || "other",
    size: raw.size ? String(raw.size) : undefined,
    updatedAt: updatedAtVal,
    uri: raw.uri ? String(raw.uri) : undefined,
    mimeType: raw.mimeType ? String(raw.mimeType) : undefined,
    sharedBy: raw.sharedBy ? String(raw.sharedBy) : undefined,
    starred: Boolean(raw.starred),
    isFolder: Boolean(raw.isFolder),
    parentId: raw.parentId ? String(raw.parentId) : null,
    cloudflareUrl: raw.cloudflareUrl ? String(raw.cloudflareUrl) : undefined,
    cloudflareKey: raw.cloudflareKey ? String(raw.cloudflareKey) : undefined,
    createdAt: createdAtNum,
  };
}

export async function fetchDriveItemsFromServer(): Promise<DriveItem[]> {
  try {
    const colRef = getDriveCollectionRef();
    let q = query(colRef, orderBy("createdAt", "desc"));
    let snapshot: FirebaseFirestoreTypes.QuerySnapshot;

    try {
      snapshot = await getDocs(q);
    } catch (orderErr: any) {
      console.warn("[DriveFirebaseService] Order by createdAt failed, reading collection directly:", orderErr);
      snapshot = await getDocs(colRef);
    }

    const serverItems: DriveItem[] = [];
    const serverIdSet = new Set<string>();

    for (const docSnap of snapshot.docs) {
      const item = normalizeDriveItem({ id: docSnap.id, ...docSnap.data() });
      serverItems.push(item);
      serverIdSet.add(item.id);
    }

    const localItems = await loadDriveItems();
    const localMap = new Map(localItems.map((item) => [item.id, item]));

    for (const localItem of localItems) {
      if (!serverIdSet.has(localItem.id) && !localItem.uploading) {
        cleanupLocalDiskFile(localItem.uri).catch(() => {});
      }
    }

    const mergedItems: DriveItem[] = serverItems.map((sItem) => {
      const localMatch = localMap.get(sItem.id);
      return {
        ...sItem,
        uri: localMatch?.uri || sItem.uri || sItem.cloudflareUrl,
      };
    });

    for (const localItem of localItems) {
      if (!serverIdSet.has(localItem.id) && localItem.uploading) {
        mergedItems.push(localItem);
      }
    }

    await saveDriveItems(mergedItems);
    return mergedItems;
  } catch (error) {
    console.error("[DriveFirebaseService] Fetch from server failed, returning local cache:", error);
    return await loadDriveItems();
  }
}

export async function saveDriveItemToServer(item: DriveItem): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    const colRef = getDriveCollectionRef();
    const docRef = doc(colRef, item.id);

    const now = Date.now();
    let numericUpdatedAt = now;
    if (typeof item.updatedAt === "number") {
      numericUpdatedAt = item.updatedAt;
    } else if (item.updatedAt && !isNaN(Number(item.updatedAt))) {
      numericUpdatedAt = Number(item.updatedAt);
    } else if (item.updatedAt && !isNaN(Date.parse(item.updatedAt))) {
      numericUpdatedAt = Date.parse(item.updatedAt);
    }

    const payload = sanitizeForServer({
      id: item.id,
      name: item.name,
      category: item.category,
      size: item.size || null,
      updatedAt: numericUpdatedAt,
      mimeType: item.mimeType || null,
      sharedBy: item.sharedBy || null,
      starred: Boolean(item.starred),
      isFolder: Boolean(item.isFolder),
      parentId: item.parentId || null,
      cloudflareUrl: item.cloudflareUrl || null,
      cloudflareKey: item.cloudflareKey || null,
      createdAt: typeof item.createdAt === "number" ? item.createdAt : now,
      serverUpdatedAt: serverTimestamp(),
    });

    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.error("[DriveFirebaseService] Save document failed:", error);
  }
}

export async function toggleDriveItemStarInServer(id: string, starred: boolean): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    const colRef = getDriveCollectionRef();
    const docRef = doc(colRef, id);
    await setDoc(
      docRef,
      {
        starred,
        updatedAt: Date.now(),
        serverUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("[DriveFirebaseService] Toggle star failed:", error);
  }
}

export async function deleteDriveItemFromServer(
  id: string,
  allItems?: DriveItem[]
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    const colRef = getDriveCollectionRef();
    const idsToDelete = new Set<string>([id]);
    const itemsToDelete: DriveItem[] = [];

    if (allItems) {
      const itemMap = new Map(allItems.map((i) => [i.id, i]));
      const root = itemMap.get(id);
      if (root) itemsToDelete.push(root);

      let addedMore = true;
      while (addedMore) {
        addedMore = false;
        for (const item of allItems) {
          if (item.parentId && idsToDelete.has(item.parentId) && !idsToDelete.has(item.id)) {
            idsToDelete.add(item.id);
            itemsToDelete.push(item);
            addedMore = true;
          }
        }
      }
    }

    for (const targetId of idsToDelete) {
      await deleteDoc(doc(colRef, targetId));
    }

    for (const item of itemsToDelete) {
      cleanupLocalDiskFile(item.uri).catch(() => {});
    }
  } catch (error) {
    console.error("[DriveFirebaseService] Delete document failed:", error);
  }
}

export function subscribeToDriveServer(
  onUpdate: (items: DriveItem[]) => void
): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) return () => {};

  try {
    const colRef = getDriveCollectionRef();
    return onSnapshot(
      colRef,
      async (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
        if (!snapshot) return;

        const serverItems: DriveItem[] = [];
        const serverIdSet = new Set<string>();

        snapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const item = normalizeDriveItem({ id: docSnap.id, ...docSnap.data() });
          serverItems.push(item);
          serverIdSet.add(item.id);
        });

        const localItems = await loadDriveItems();
        for (const localItem of localItems) {
          if (!serverIdSet.has(localItem.id) && !localItem.uploading) {
            cleanupLocalDiskFile(localItem.uri).catch(() => {});
          }
        }

        const localMap = new Map(localItems.map((item) => [item.id, item]));

        const merged: DriveItem[] = serverItems.map((sItem) => {
          const localMatch = localMap.get(sItem.id);
          return {
            ...sItem,
            uri: localMatch?.uri || sItem.uri || sItem.cloudflareUrl,
          };
        });

        await saveDriveItems(merged);
        onUpdate(merged);
      },
      (error: any) => {
        if (
          error?.code === "firestore/permission-denied" ||
          error?.message?.includes("permission-denied")
        ) {
          return;
        }
        console.warn("[DriveFirebaseService] Real-time listener error:", error);
      }
    );
  } catch (err) {
    console.warn("[DriveFirebaseService] Could not establish real-time listener:", err);
    return () => {};
  }
}

export async function uploadDriveFileToCloudflare(
  item: DriveItem,
  onProgress?: UploadProgressCallback
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  if (item.isFolder || !item.uri) {
    return { success: false, error: "Cannot upload folder or missing URI to Cloudflare" };
  }

  try {
    const result = await uploadFileToCloudflare(
      item.uri,
      item.mimeType || "application/octet-stream",
      item.name,
      onProgress
    );

    if (result.success && result.url) {
      const updatedItem: DriveItem = {
        ...item,
        cloudflareUrl: result.url,
        cloudflareKey: result.key,
      };

      await saveDriveItemToServer(updatedItem);

      return { success: true, url: result.url, key: result.key };
    }

    return { success: false, error: result.error || "Cloudflare upload failed" };
  } catch (error: any) {
    console.error("[DriveFirebaseService] Cloudflare upload error:", error);
    return { success: false, error: error?.message || "Failed to upload to Cloudflare" };
  }
}

export async function exportDriveFile(
  item: DriveItem
): Promise<{ success: boolean; error?: string }> {
  if (item.isFolder) {
    return { success: false, error: "Folders cannot be exported as a single file." };
  }

  const targetUri = item.uri || item.cloudflareUrl;
  if (!targetUri) {
    return { success: false, error: "File location is not available to export." };
  }

  try {
    let localShareUri = targetUri;

    if (targetUri.startsWith("http://") || targetUri.startsWith("https://")) {
      const cleanName = (item.name || "export_file").replace(/[^a-zA-Z0-9._-]/g, "_");
      const cachePath = `${FileSystem.cacheDirectory}export_${Date.now()}_${cleanName}`;
      const downloadRes = await FileSystem.downloadAsync(targetUri, cachePath);
      if (downloadRes.status === 200 && downloadRes.uri) {
        localShareUri = downloadRes.uri;
      } else {
        return { success: false, error: "Failed to download file from cloud for export." };
      }
    }

    const fileInfo = await FileSystem.getInfoAsync(localShareUri);
    if (!fileInfo?.exists) {
      if (item.cloudflareUrl && item.cloudflareUrl !== localShareUri) {
        const cleanName = (item.name || "export_file").replace(/[^a-zA-Z0-9._-]/g, "_");
        const cachePath = `${FileSystem.cacheDirectory}export_${Date.now()}_${cleanName}`;
        const downloadRes = await FileSystem.downloadAsync(item.cloudflareUrl, cachePath);
        if (downloadRes.status === 200 && downloadRes.uri) {
          localShareUri = downloadRes.uri;
        } else {
          return { success: false, error: "File does not exist on device and cloud download failed." };
        }
      } else {
        return { success: false, error: "File was not found on device storage." };
      }
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      const mimeType = getMimeTypeForFile(item.name, item.mimeType);
      await Sharing.shareAsync(localShareUri, {
        mimeType,
        dialogTitle: `Export ${item.name}`,
        UTI: mimeType,
      });
      return { success: true };
    } else {
      return { success: false, error: "Native file sharing is not supported on this device." };
    }
  } catch (err: any) {
    console.error("[DriveFirebaseService] exportDriveFile error:", err);
    return { success: false, error: err?.message || "Failed to export file." };
  }
}
