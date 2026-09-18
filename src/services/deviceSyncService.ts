import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { HardwareInfo } from "../types/device";
import { getFormattedDeviceLabel } from "./devices/deviceHardwareService";

export interface FirestoreDevice {
  deviceId: string;
  name: string;
  modelName: string;
  brand: string;
  osName: string;
  osVersion: string;
  appVersion: string;
  deviceType: "phone" | "tablet" | "desktop" | "browser";
  isPhysical: boolean;
  lastActive?: Timestamp | any;
}

/**
 * Registers / refreshes this device's heartbeat under `users/{userId}/devices/{deviceId}`.
 */
export async function syncCurrentDevice(
  userId: string,
  deviceId: string,
  hardwareInfo: HardwareInfo
): Promise<void> {
  if (!userId || userId === "guest") return;

  try {
    const deviceRef = doc(db, "users", userId, "devices", deviceId);
    await setDoc(
      deviceRef,
      {
        deviceId,
        name: getFormattedDeviceLabel(hardwareInfo),
        modelName: hardwareInfo.modelName,
        brand: hardwareInfo.brand,
        osName: hardwareInfo.osName,
        osVersion: hardwareInfo.osVersion,
        appVersion: hardwareInfo.appVersion,
        deviceType: hardwareInfo.deviceType,
        isPhysical: hardwareInfo.isPhysical,
        lastActive: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("[deviceSyncService] Failed to sync device heartbeat to Firestore:", err);
  }
}

/**
 * Updates the lastActive timestamp for the current device session.
 */
export async function touchDeviceHeartbeat(
  userId: string,
  deviceId: string
): Promise<void> {
  if (!userId || !deviceId || userId === "guest") return;
  try {
    const deviceRef = doc(db, "users", userId, "devices", deviceId);
    await setDoc(deviceRef, { lastActive: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn("[deviceSyncService] Failed to update heartbeat:", err);
  }
}

/**
 * Listens in real-time to the current device's session document in Firestore.
 * If another device revokes this session (deleting the document), onRevoked() triggers immediately.
 */
export function listenCurrentDeviceRevocation(
  userId: string,
  deviceId: string,
  onRevoked: () => void
): () => void {
  if (!userId || !deviceId || userId === "guest") {
    return () => {};
  }

  try {
    const deviceRef = doc(db, "users", userId, "devices", deviceId);
    let hasInitialized = false;

    return onSnapshot(
      deviceRef,
      (docSnap) => {
        if (!hasInitialized) {
          hasInitialized = true;
          return;
        }

        if (!docSnap.exists()) {
          console.warn("[deviceSyncService] Session revoked remotely from another device.");
          onRevoked();
        }
      },
      (error) => {
        console.warn("[deviceSyncService] Error listening to device revocation:", error);
      }
    );
  } catch (err) {
    console.warn("[deviceSyncService] Exception setting up revocation listener:", err);
    return () => {};
  }
}

/**
 * Subscribes to real-time active devices in Firestore for the current user.
 */
export function subscribeActiveDevices(
  userId: string,
  onUpdate: (devices: FirestoreDevice[]) => void
): () => void {
  if (!userId || userId === "guest") {
    onUpdate([]);
    return () => {};
  }

  try {
    const devicesColRef = collection(db, "users", userId, "devices");
    return onSnapshot(
      devicesColRef,
      (snapshot) => {
        const list: FirestoreDevice[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as FirestoreDevice);
        });
        onUpdate(list);
      },
      (error) => {
        console.warn("[deviceSyncService] Error subscribing to active devices:", error);
      }
    );
  } catch (err) {
    console.warn("[deviceSyncService] Exception setting up devices listener:", err);
    return () => {};
  }
}

/**
 * Removes a remote device from active devices in Firestore.
 */
export async function removeActiveDevice(
  userId: string,
  deviceId: string
): Promise<void> {
  if (!userId || !deviceId || userId === "guest") return;
  try {
    const deviceRef = doc(db, "users", userId, "devices", deviceId);
    await deleteDoc(deviceRef);
  } catch (err) {
    console.warn("[deviceSyncService] Failed to remove active device:", err);
  }
}


/**
 * Formats a Firestore timestamp into a relative time string ("Active now", "15m ago", "Yesterday").
 */
export function formatDeviceActivity(timestamp: any): string {
  if (!timestamp) return "Active recently";
  try {
    const millis = timestamp?.toMillis ? timestamp.toMillis() : Number(new Date(timestamp));
    if (isNaN(millis)) return "Active recently";

    const diffSec = Math.floor((Date.now() - millis) / 1000);
    if (diffSec < 90) return "Active now";

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(millis).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Active recently";
  }
}
