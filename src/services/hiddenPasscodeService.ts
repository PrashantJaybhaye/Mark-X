import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { auth } from "./firebase";

const PASSCODE_STORAGE_KEY_PREFIX = "markx_my_eyes_only_passcode_";

function getStorageKey(): string {
  const uid = auth.currentUser?.uid || "guest";
  return `${PASSCODE_STORAGE_KEY_PREFIX}${uid}`;
}

/**
 * Check if the user has created a My Eyes Only passcode.
 */
export async function hasHiddenPasscode(): Promise<boolean> {
  const key = getStorageKey();
  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      const code = await SecureStore.getItemAsync(key);
      if (code && code.length === 4) return true;
    }
  } catch {}

  try {
    const fallback = await AsyncStorage.getItem(key);
    return Boolean(fallback && fallback.length === 4);
  } catch {
    return false;
  }
}

/**
 * Set a new 4-digit passcode for My Eyes Only.
 */
export async function setHiddenPasscode(passcode: string): Promise<void> {
  const key = getStorageKey();
  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      await SecureStore.setItemAsync(key, passcode);
    }
  } catch {}

  try {
    await AsyncStorage.setItem(key, passcode);
  } catch (err) {
    console.warn("[HiddenPasscodeService] Failed to set passcode:", err);
  }
}

/**
 * Verify if entered passcode matches stored passcode.
 */
export async function verifyHiddenPasscode(enteredCode: string): Promise<boolean> {
  const key = getStorageKey();
  let storedCode: string | null = null;

  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      storedCode = await SecureStore.getItemAsync(key);
    }
  } catch {}

  if (!storedCode) {
    try {
      storedCode = await AsyncStorage.getItem(key);
    } catch {}
  }

  return storedCode === enteredCode;
}

/**
 * Reset passcode for My Eyes Only.
 */
export async function resetHiddenPasscode(): Promise<void> {
  const key = getStorageKey();
  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {}

  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn("[HiddenPasscodeService] Failed to reset passcode:", err);
  }
}
