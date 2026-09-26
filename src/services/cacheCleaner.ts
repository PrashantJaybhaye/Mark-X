import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";

/**
 * Safely deletes a temporary local file (e.g. captured photo/video)
 */
export async function deleteTempFile(fileUri: string | null | undefined): Promise<void> {
  if (!fileUri || !fileUri.startsWith("file://")) return;
  try {
    const exists = await FileSystem.getInfoAsync(fileUri);
    if (exists.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (err) {
    // Ignore errors during temp file deletion
  }
}

/**
 * Recursively measures total file size in bytes without deleting.
 */
async function recursiveMeasureDirectory(dirUri: string): Promise<number> {
  let totalBytes = 0;
  try {
    const formattedDir = dirUri.endsWith("/") ? dirUri : `${dirUri}/`;
    const contents = await FileSystem.readDirectoryAsync(formattedDir);

    for (const name of contents) {
      const itemUri = `${formattedDir}${name}`;
      const info = await FileSystem.getInfoAsync(itemUri);

      if (!info.exists) continue;

      if (info.isDirectory) {
        totalBytes += await recursiveMeasureDirectory(itemUri);
      } else {
        totalBytes += info.size || 0;
      }
    }
  } catch (error) {
    // Suppress permission errors on OS-protected system folders
  }
  return totalBytes;
}

/**
 * Calculates current total cached bytes across all subdirectories without deleting anything.
 */
export async function getAppCacheSize(): Promise<{ sizeMB: number; sizeBytes: number }> {
  let totalBytes = 0;
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) {
      totalBytes = await recursiveMeasureDirectory(cacheDir);
    }
  } catch (error) {
    console.warn("[CacheCleaner] Error measuring cache size:", error);
  }
  const sizeMB = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
  return { sizeMB, sizeBytes: totalBytes };
}

/**
 * Recursively measures total file size in bytes and deletes all contents of a directory.
 */
async function recursiveCleanDirectory(dirUri: string): Promise<number> {
  let bytesCleared = 0;
  try {
    const formattedDir = dirUri.endsWith("/") ? dirUri : `${dirUri}/`;
    const contents = await FileSystem.readDirectoryAsync(formattedDir);

    for (const name of contents) {
      const itemUri = `${formattedDir}${name}`;
      const info = await FileSystem.getInfoAsync(itemUri);

      if (!info.exists) continue;

      if (info.isDirectory) {
        // Recursively clean subdirectories
        bytesCleared += await recursiveCleanDirectory(itemUri);
        await FileSystem.deleteAsync(itemUri, { idempotent: true }).catch(() => {});
      } else {
        bytesCleared += info.size || 0;
        await FileSystem.deleteAsync(itemUri, { idempotent: true }).catch(() => {});
      }
    }
  } catch (error) {
    // Suppress permission errors on OS-protected system folders
  }
  return bytesCleared;
}

/**
 * Accurately calculates total cached bytes across all subdirectories and purges all app cache.
 */
export async function clearAppCache(): Promise<{ clearedMB: number; clearedBytes: number }> {
  let totalBytesCleared = 0;

  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) {
      // 1. Recursively measure and delete all files/folders inside cacheDirectory
      totalBytesCleared = await recursiveCleanDirectory(cacheDir);
    }

    // 2. Clear expo-image internal memory & disk cache instances
    await Image.clearDiskCache().catch(() => {});
    await Image.clearMemoryCache().catch(() => {});
  } catch (error) {
    console.warn("[CacheCleaner] Error while clearing cache:", error);
  }

  const clearedMB = parseFloat((totalBytesCleared / (1024 * 1024)).toFixed(2));
  return { clearedMB, clearedBytes: totalBytesCleared };
}
