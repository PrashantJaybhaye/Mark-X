import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { doc, getDoc, setDoc, serverTimestamp } from "@react-native-firebase/firestore";
import { auth, db } from "./firebase";

const PASSCODE_HASH_STORAGE_PREFIX = "markx_vault_passcode_hash_";
const LEGACY_PASSCODE_STORAGE_PREFIX = "markx_my_eyes_only_passcode_";
const VAULT_SALT_SECRET = "markx_vault_salt_v1_";

const MAX_ATTEMPTS_BEFORE_LOCK = 5;
const LOCKOUT_DURATION_MS = 30 * 1000;

let failedAttemptsCount = 0;
let lockedUntilTimestamp = 0;

export function getPasscodeLockoutRemainingSeconds(): number {
  const now = Date.now();
  if (lockedUntilTimestamp > now) {
    return Math.ceil((lockedUntilTimestamp - now) / 1000);
  }
  return 0;
}

export function clearPasscodeLockout(): void {
  failedAttemptsCount = 0;
  lockedUntilTimestamp = 0;
}

let cachedVaultState: {
  uid: string;
  hasPasscode: boolean;
  passcodeHash?: string | null;
} | null = null;

function getHashStorageKey(uid: string): string {
  return `${PASSCODE_HASH_STORAGE_PREFIX}${uid}`;
}

function getLegacyStorageKey(uid: string): string {
  return `${LEGACY_PASSCODE_STORAGE_PREFIX}${uid}`;
}

/**
 * Computes a salted SHA-256 cryptographic hash of the 4-digit passcode.
 * Plaintext passcodes are NEVER sent to Firestore or stored in cloud databases.
 */
export async function hashPasscode(passcode: string, uid: string): Promise<string> {
  const saltedPayload = `${VAULT_SALT_SECRET}::${uid}::${passcode}::${VAULT_SALT_SECRET}`;
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, saltedPayload);
}

/**
 * Synchronous check from memory if passcode presence is known.
 */
export function getCachedHasHiddenPasscode(): boolean | null {
  const currentUid = auth.currentUser?.uid || "guest";
  if (cachedVaultState && cachedVaultState.uid === currentUid) {
    return cachedVaultState.hasPasscode;
  }
  return null;
}

/**
 * Preload passcode presence in background so UI renders with 0ms delay.
 */
export function preloadHiddenPasscode(): void {
  hasHiddenPasscode().catch(() => {});
}

/**
 * Check if the user has created a My Eyes Only passcode.
 * Checks:
 * 1. In-memory cache (0ms)
 * 2. Local device storage (SecureStore / AsyncStorage)
 * 3. Firestore cloud user doc (for cross-device synchronization, exactly like Snapchat)
 */
export async function hasHiddenPasscode(): Promise<boolean> {
  const currentUid = auth.currentUser?.uid || "guest";

  // 1. In-memory hot check
  if (cachedVaultState && cachedVaultState.uid === currentUid) {
    return cachedVaultState.hasPasscode;
  }

  const hashKey = getHashStorageKey(currentUid);
  let localHash: string | null = null;

  // 2. Local device SecureStore check
  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      localHash = await SecureStore.getItemAsync(hashKey);
    }
  } catch {}

  if (!localHash) {
    try {
      localHash = await AsyncStorage.getItem(hashKey);
    } catch {}
  }

  // Check legacy plaintext fallback if upgrading
  if (!localHash) {
    const legacyKey = getLegacyStorageKey(currentUid);
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      const legacyCode = isAvailable ? await SecureStore.getItemAsync(legacyKey) : null;
      if (legacyCode && legacyCode.length === 4) {
        // Automatically migrate legacy plaintext code to SHA-256 hash
        localHash = await hashPasscode(legacyCode, currentUid);
        await saveLocalHash(currentUid, localHash);
        if (currentUid !== "guest") {
          syncHashToFirestore(currentUid, localHash).catch(() => {});
        }
      }
    } catch {}
  }

  if (localHash) {
    cachedVaultState = {
      uid: currentUid,
      hasPasscode: true,
      passcodeHash: localHash,
    };
    return true;
  }

  // 3. Cross-device check: If not on this device, check Firestore cloud account
  if (currentUid !== "guest") {
    try {
      const userDocRef = doc(db, "users", currentUid);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        const cloudHash = data?.hiddenVault?.passcodeHash;
        if (cloudHash && typeof cloudHash === "string" && cloudHash.length > 0) {
          // Sync cloud hash down to this device for instant offline access
          await saveLocalHash(currentUid, cloudHash);
          cachedVaultState = {
            uid: currentUid,
            hasPasscode: true,
            passcodeHash: cloudHash,
          };
          return true;
        }
      }
    } catch (err) {
      console.warn("[HiddenPasscodeService] Error fetching cloud vault state:", err);
    }
  }

  cachedVaultState = {
    uid: currentUid,
    hasPasscode: false,
    passcodeHash: null,
  };
  return false;
}

/**
 * Set a new 4-digit passcode for My Eyes Only.
 * Hashes with SHA-256 + salt, saves to local SecureStore, and syncs hash to Firestore.
 */
export async function setHiddenPasscode(passcode: string): Promise<void> {
  const currentUid = auth.currentUser?.uid || "guest";
  const hash = await hashPasscode(passcode, currentUid);

  // Update memory cache immediately
  cachedVaultState = {
    uid: currentUid,
    hasPasscode: true,
    passcodeHash: hash,
  };

  // 1. Save hash to local device
  await saveLocalHash(currentUid, hash);

  // Clean up any legacy plaintext key
  const legacyKey = getLegacyStorageKey(currentUid);
  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) await SecureStore.deleteItemAsync(legacyKey);
    await AsyncStorage.removeItem(legacyKey);
  } catch {}

  // 2. Sync hashed passcode to Firestore user document (cross-device support)
  if (currentUid !== "guest") {
    await syncHashToFirestore(currentUid, hash);
  }
}

/**
 * Verify if entered passcode matches stored hash with brute-force lockout protection.
 */
export async function verifyHiddenPasscode(enteredCode: string): Promise<boolean> {
  const remaining = getPasscodeLockoutRemainingSeconds();
  if (remaining > 0) {
    throw new Error(`Too many incorrect attempts. Please wait ${remaining}s.`);
  }

  const currentUid = auth.currentUser?.uid || "guest";
  const expectedEnteredHash = await hashPasscode(enteredCode, currentUid);

  let isValid = false;

  // 1. Fast memory verification
  if (cachedVaultState && cachedVaultState.uid === currentUid && cachedVaultState.passcodeHash) {
    isValid = cachedVaultState.passcodeHash === expectedEnteredHash;
  } else {
    // 2. Ensure local / cloud hash is fetched
    const hasCode = await hasHiddenPasscode();
    if (hasCode && cachedVaultState?.passcodeHash) {
      isValid = cachedVaultState.passcodeHash === expectedEnteredHash;
    }
  }

  if (isValid) {
    clearPasscodeLockout();
    return true;
  } else {
    failedAttemptsCount++;
    if (failedAttemptsCount >= MAX_ATTEMPTS_BEFORE_LOCK) {
      lockedUntilTimestamp = Date.now() + LOCKOUT_DURATION_MS;
      const waitSec = Math.ceil(LOCKOUT_DURATION_MS / 1000);
      throw new Error(`Too many incorrect attempts. Locked for ${waitSec}s.`);
    }
    return false;
  }
}

/**
 * Reset passcode for My Eyes Only.
 */
export async function resetHiddenPasscode(): Promise<void> {
  clearPasscodeLockout();
  const currentUid = auth.currentUser?.uid || "guest";
  const hashKey = getHashStorageKey(currentUid);
  const legacyKey = getLegacyStorageKey(currentUid);

  cachedVaultState = {
    uid: currentUid,
    hasPasscode: false,
    passcodeHash: null,
  };

  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      await SecureStore.deleteItemAsync(hashKey);
      await SecureStore.deleteItemAsync(legacyKey);
    }
  } catch {}

  try {
    await AsyncStorage.removeItem(hashKey);
    await AsyncStorage.removeItem(legacyKey);
  } catch {}

  if (currentUid !== "guest") {
    try {
      const userDocRef = doc(db, "users", currentUid);
      await setDoc(userDocRef, { hiddenVault: { passcodeHash: null, updatedAt: serverTimestamp() } }, { merge: true });
    } catch {}
  }
}

// ---------------- Helpers ----------------

async function saveLocalHash(uid: string, hash: string): Promise<void> {
  const hashKey = getHashStorageKey(uid);
  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      await SecureStore.setItemAsync(hashKey, hash);
    }
  } catch {}

  try {
    await AsyncStorage.setItem(hashKey, hash);
  } catch (err) {
    console.warn("[HiddenPasscodeService] Failed to set local hash:", err);
  }
}

async function syncHashToFirestore(uid: string, hash: string): Promise<void> {
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(
      userDocRef,
      {
        hiddenVault: {
          passcodeHash: hash,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("[HiddenPasscodeService] Failed to sync passcode hash to Firestore:", err);
  }
}
