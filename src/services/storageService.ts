import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "./firebase";
import { DriveItem } from "../utils/driveFileTypes";
import { GalleryPin } from "../utils/galleryData";
import { NoteItem } from "../types/note";
import { updateUserStats, getUserMetadata } from "./userService";

const STORAGE_KEYS = {
  DRIVE_ITEMS: "@markx_drive_items_v1",
  GALLERY_PINS: "@markx_gallery_pins_v1",
  NOTES: "@markx_notes_v1",
  USER_PREFERENCES: "@markx_user_preferences_v1",
};

export interface UserPreferences {
  isBiometricsEnabled?: boolean;
  lockTimeoutMinutes?: number;
  stats?: {
    notesCount: number;
    galleryCount: number;
    driveCount: number;
    usedStorageGB: number;
  };
}

function getScopedKey(baseKey: string): string {
  const uid = auth.currentUser?.uid;
  return uid ? `${baseKey}_${uid}` : baseKey;
}

async function loadItem<T>(baseKey: string, defaultValue: T): Promise<T> {
  const scopedKey = getScopedKey(baseKey);
  try {
    let raw = await AsyncStorage.getItem(scopedKey);

    if (raw === null && auth.currentUser?.uid) {
      raw = await AsyncStorage.getItem(baseKey);
      if (raw !== null) {
        await AsyncStorage.setItem(scopedKey, raw);
        await AsyncStorage.removeItem(baseKey);
      }
    }

    if (!raw || raw.startsWith("ENC::")) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

async function saveItem<T>(baseKey: string, value: T): Promise<void> {
  try {
    const key = getScopedKey(baseKey);
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[StorageService] Failed to save ${baseKey}:`, error);
  }
}

function parseSizeToBytes(sizeStr?: string): number {
  if (!sizeStr) return 0;
  const match = sizeStr.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = (match[2] || "B").toUpperCase();
  switch (unit) {
    case "KB": return num * 1024;
    case "MB": return num * 1024 * 1024;
    case "GB": return num * 1024 * 1024 * 1024;
    case "TB": return num * 1024 * 1024 * 1024 * 1024;
    default: return num;
  }
}

export async function recalculateTotalUsedStorageGB(): Promise<number> {
  try {
    let totalBytes = 0;

    const pins = await loadCachedGalleryPins();
    for (const pin of pins) {
      totalBytes += pin.fileSize || (pin.mediaType === "video" ? 14800000 : 2800000);
    }

    const driveItems = await loadDriveItems();
    for (const item of driveItems) {
      if (item.size) {
        totalBytes += parseSizeToBytes(item.size);
      }
    }

    const notes = await loadNotes();
    for (const note of notes) {
      totalBytes += (note.title?.length || 0) + (note.body?.length || 0);
    }

    const rawGB = totalBytes / (1024 * 1024 * 1024);
    const usedGB = totalBytes > 0 ? Math.max(0.01, parseFloat(rawGB.toFixed(3))) : 0;
    await updateStats({ usedStorageGB: usedGB });
    return usedGB;
  } catch (err) {
    console.warn("[StorageService] Failed to calculate total storage:", err);
    return 0;
  }
}

async function updateStats(updates: Partial<NonNullable<UserPreferences["stats"]>>) {
  const current = await loadUserPreferences();
  const currentStats = current.stats || { notesCount: 0, galleryCount: 0, driveCount: 0, usedStorageGB: 0 };
  const newStats = { ...currentStats, ...updates };
  await saveUserPreferences({ stats: newStats });

  if (auth.currentUser?.uid) {
    updateUserStats(auth.currentUser.uid, updates).catch(console.warn);
  }
}

export const forceSyncAllStats = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

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
  await updateStats({ driveCount: items.length });
  await recalculateTotalUsedStorageGB();
};

export const loadCachedGalleryPins = async (): Promise<GalleryPin[]> => {
  const pins = await loadItem<GalleryPin[]>(STORAGE_KEYS.GALLERY_PINS, []);
  return [...pins].sort((a, b) => (b.saved ? 1 : 0) - (a.saved ? 1 : 0));
};

export const saveCachedGalleryPins = async (pins: GalleryPin[]): Promise<void> => {
  const sorted = [...pins].sort((a, b) => (b.saved ? 1 : 0) - (a.saved ? 1 : 0));
  await saveItem(STORAGE_KEYS.GALLERY_PINS, sorted);
  await recalculateTotalUsedStorageGB();
};

export const syncGalleryStats = async (count: number) => {
  await updateStats({ galleryCount: count });
  await recalculateTotalUsedStorageGB();
};

export const updateGalleryStats = async (delta: number) => {
  const current = await loadUserPreferences();
  const currentStats = current.stats || { notesCount: 0, galleryCount: 0, driveCount: 0, usedStorageGB: 0 };
  const newCount = Math.max(0, currentStats.galleryCount + delta);
  await updateStats({ galleryCount: newCount });
  await recalculateTotalUsedStorageGB();
};

export const loadNotes = () => loadItem<NoteItem[]>(STORAGE_KEYS.NOTES, []);
export const saveNotes = async (notes: NoteItem[]) => {
  await saveItem(STORAGE_KEYS.NOTES, notes);
  await updateStats({ notesCount: notes.length });
  await recalculateTotalUsedStorageGB();
};

export const getNoteById = async (id: string): Promise<NoteItem | null> => {
  const notes = await loadNotes();
  return notes.find((n) => n.id === id) ?? null;
};

export const saveSingleNote = async (note: NoteItem): Promise<void> => {
  const notes = await loadNotes();
  const idx = notes.findIndex((n) => n.id === note.id);
  if (idx >= 0) {
    notes[idx] = note;
  } else {
    notes.unshift(note);
  }
  await saveNotes(notes);
};

export const deleteNoteById = async (id: string): Promise<void> => {
  await saveNotes((await loadNotes()).filter((n) => n.id !== id));
};

export const loadUserPreferences = () =>
  loadItem<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {
    isBiometricsEnabled: false,
    lockTimeoutMinutes: 0,
  });

export const saveUserPreferences = async (prefs: Partial<UserPreferences>) => {
  const current = await loadUserPreferences();
  return saveItem(STORAGE_KEYS.USER_PREFERENCES, { ...current, ...prefs });
};
