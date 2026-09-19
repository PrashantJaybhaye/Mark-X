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
  stats?: {
    notesCount: number;
    galleryCount: number;
    driveCount: number;
    usedStorageGB: number;
  };
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

import { updateUserMetadata } from "./userService";

async function updateStats(updates: Partial<UserPreferences["stats"]>) {
  const current = await loadUserPreferences();
  const currentStats = current.stats || { notesCount: 0, galleryCount: 0, driveCount: 0, usedStorageGB: 0 };
  const newStats = { ...currentStats, ...updates };
  await saveUserPreferences({ stats: newStats });
  
  if (auth.currentUser?.uid) {
    updateUserMetadata(auth.currentUser.uid, { stats: newStats }).catch(console.warn);
  }
}
async function recalculateTotalStorage(galleryCount: number, driveItems: DriveItem[]) {
  const driveSizeMB = driveItems.reduce((acc, item) => {
    if (!item.size) return acc + 1.2;
    const num = parseFloat(item.size);
    return isNaN(num) ? acc + 1.0 : acc + num;
  }, 0);
  return parseFloat(((driveSizeMB + galleryCount * 2.5) / 1024).toFixed(2));
}
export const forceSyncAllStats = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    // Pull directly from the user's Firestore metadata document
    const { getUserMetadata } = await import("./userService");
    const metadata = await getUserMetadata(uid);

    if (metadata && metadata.stats) {
      const currentPrefs = await loadUserPreferences();
      await saveUserPreferences({ ...currentPrefs, stats: metadata.stats });
      return true;
    }
    return false;
  } catch (error) {
    console.error("[StorageService] Failed to pull stats from Firestore:", error);
    return false;
  }
};

export const loadDriveItems = () => loadItem<DriveItem[]>(STORAGE_KEYS.DRIVE_ITEMS, []);
export const saveDriveItems = async (items: DriveItem[]) => {
  await saveItem(STORAGE_KEYS.DRIVE_ITEMS, items);
  
  const current = await loadUserPreferences();
  const currentStats = current.stats || { notesCount: 0, galleryCount: 0, driveCount: 0, usedStorageGB: 0 };
  const totalGB = await recalculateTotalStorage(currentStats.galleryCount, items);
  
  await updateStats({ driveCount: items.length, usedStorageGB: totalGB });
};

// Gallery Pins
export const updateGalleryStats = async (delta: number) => {
  const current = await loadUserPreferences();
  const currentStats = current.stats || { notesCount: 0, galleryCount: 0, driveCount: 0, usedStorageGB: 0 };
  const newCount = Math.max(0, currentStats.galleryCount + delta);
  
  const driveItems = await loadDriveItems();
  const totalGB = await recalculateTotalStorage(newCount, driveItems);
  await updateStats({ galleryCount: newCount, usedStorageGB: totalGB });
};

// Notes
export const loadNotes = () => loadItem<NoteItem[]>(STORAGE_KEYS.NOTES, []);
export const saveNotes = async (notes: NoteItem[]) => {
  await saveItem(STORAGE_KEYS.NOTES, notes);
  await updateStats({ notesCount: notes.length });
};

export const getNoteById = async (id: string): Promise<NoteItem | null> => {
  const notes = await loadNotes();
  return notes.find((n) => n.id === id) ?? null;
};

export const saveSingleNote = async (note: NoteItem): Promise<void> => {
  const notes = await loadNotes();
  const idx = notes.findIndex((n) => n.id === note.id);
  idx >= 0 ? (notes[idx] = note) : notes.unshift(note);
  await saveNotes(notes);
};

export const deleteNoteById = async (id: string): Promise<void> => {
  await saveNotes((await loadNotes()).filter((n) => n.id !== id));
};

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
