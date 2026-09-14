import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "./firebase";
import { DriveItem } from "../utils/driveFileTypes";
import { GalleryPin } from "../utils/galleryData";
import { NoteItem } from "../components/notes/NoteItemCard";

const STORAGE_KEYS = {
  DRIVE_ITEMS: "@markx_drive_items_v1",
  GALLERY_PINS: "@markx_gallery_pins_v1",
  NOTES: "@markx_notes_v1",
  USER_PREFERENCES: "@markx_user_preferences_v1",
};

export interface UserPreferences {
  isBiometricsEnabled?: boolean;
  lockTimeoutMinutes?: number; // 0 = immediately upon leaving app, 1, 5, 15 minutes
}

/**
 * Returns a user-scoped key so multiple users on the same device don't see each other's data.
 */
function getScopedKey(baseKey: string): string {
  const uid = auth.currentUser?.uid;
  return uid ? `${baseKey}_${uid}` : baseKey;
}

/**
 * Loads and parses JSON data from AsyncStorage with automatic user scoping and legacy migration.
 */
async function loadItem<T>(baseKey: string, defaultValue: T): Promise<T> {
  try {
    const scopedKey = getScopedKey(baseKey);
    let raw = await AsyncStorage.getItem(scopedKey);

    // Migrate legacy un-scoped data to user-scoped key if available
    if (raw === null && auth.currentUser?.uid) {
      raw = await AsyncStorage.getItem(baseKey);
      if (raw !== null) {
        await AsyncStorage.setItem(scopedKey, raw);
        await AsyncStorage.removeItem(baseKey);
      }
    }

    return raw ? JSON.parse(raw) : defaultValue;
  } catch (error) {
    console.warn(`[StorageService] Failed to load ${baseKey}:`, error);
    return defaultValue;
  }
}

/**
 * Serializes and saves JSON data to user-scoped AsyncStorage.
 */
async function saveItem<T>(baseKey: string, value: T): Promise<void> {
  try {
    const key = getScopedKey(baseKey);
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[StorageService] Failed to save ${baseKey}:`, error);
  }
}

// Drive Items
export const loadDriveItems = () => loadItem<DriveItem[]>(STORAGE_KEYS.DRIVE_ITEMS, []);
export const saveDriveItems = (items: DriveItem[]) => saveItem(STORAGE_KEYS.DRIVE_ITEMS, items);

// Gallery Pins
export const loadGalleryPins = () => loadItem<GalleryPin[]>(STORAGE_KEYS.GALLERY_PINS, []);
export const saveGalleryPins = (pins: GalleryPin[]) => saveItem(STORAGE_KEYS.GALLERY_PINS, pins);

// Notes
export const loadNotes = () => loadItem<NoteItem[]>(STORAGE_KEYS.NOTES, []);
export const saveNotes = (notes: NoteItem[]) => saveItem(STORAGE_KEYS.NOTES, notes);

// User Preferences
export const loadUserPreferences = () =>
  loadItem<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {
    isBiometricsEnabled: false,
    lockTimeoutMinutes: 0,
  });

export const saveUserPreferences = async (prefs: Partial<UserPreferences>) => {
  const current = await loadUserPreferences();
  return saveItem(STORAGE_KEYS.USER_PREFERENCES, { ...current, ...prefs });
};
