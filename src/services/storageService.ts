import AsyncStorage from "@react-native-async-storage/async-storage";
import { DriveItem } from "../utils/driveFileTypes";
import { GalleryPin } from "../utils/galleryData";
import { NoteItem } from "../components/notes/NoteItemCard";

const STORAGE_KEYS = {
  DRIVE_ITEMS: "@markx_drive_items_v1",
  GALLERY_PINS: "@markx_gallery_pins_v1",
  NOTES: "@markx_notes_v1",
  USER_PREFERENCES: "@markx_user_preferences_v1",
};

/**
 * Loads stored drive files and folders.
 */
export async function loadDriveItems(): Promise<DriveItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DRIVE_ITEMS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[StorageService] Failed to load drive items:", err);
    return [];
  }
}

/**
 * Persists drive files and folders to local storage.
 */
export async function saveDriveItems(items: DriveItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DRIVE_ITEMS, JSON.stringify(items));
  } catch (err) {
    console.warn("[StorageService] Failed to save drive items:", err);
  }
}

/**
 * Loads stored gallery inspiration pins.
 */
export async function loadGalleryPins(): Promise<GalleryPin[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.GALLERY_PINS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[StorageService] Failed to load gallery pins:", err);
    return [];
  }
}

/**
 * Persists gallery inspiration pins to local storage.
 */
export async function saveGalleryPins(pins: GalleryPin[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.GALLERY_PINS, JSON.stringify(pins));
  } catch (err) {
    console.warn("[StorageService] Failed to save gallery pins:", err);
  }
}

/**
 * Loads stored notes.
 */
export async function loadNotes(): Promise<NoteItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[StorageService] Failed to load notes:", err);
    return [];
  }
}

/**
 * Persists notes to local storage.
 */
export async function saveNotes(notes: NoteItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  } catch (err) {
    console.warn("[StorageService] Failed to save notes:", err);
  }
}

export interface UserPreferences {
  isBiometricsEnabled?: boolean;
}

/**
 * Loads stored user preferences (e.g. biometrics setting).
 */
export async function loadUserPreferences(): Promise<UserPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (!raw) return { isBiometricsEnabled: false };
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[StorageService] Failed to load user preferences:", err);
    return { isBiometricsEnabled: false };
  }
}

/**
 * Persists user preferences.
 */
export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(prefs));
  } catch (err) {
    console.warn("[StorageService] Failed to save user preferences:", err);
  }
}
