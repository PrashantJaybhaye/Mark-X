import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";

export async function deleteTempFile(fileUri: string | null | undefined): Promise<void> {
  if (!fileUri || !fileUri.startsWith("file://")) return;
  try {
    const exists = await FileSystem.getInfoAsync(fileUri);
    if (exists.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (_err) {}
}

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
  } catch (_error) {}
  return totalBytes;
}

export async function getAppCacheSize(): Promise<{ sizeMB: number; sizeBytes: number }> {
  let totalBytes = 0;
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) {
      totalBytes += await recursiveMeasureDirectory(cacheDir);
    }

    const docDir = FileSystem.documentDirectory;
    if (docDir) {
      const legacyAssets = `${docDir}cached_assets/`;
      const assetsInfo = await FileSystem.getInfoAsync(legacyAssets);
      if (assetsInfo.exists) {
        totalBytes += await recursiveMeasureDirectory(legacyAssets);
      }
    }
  } catch (error) {
    console.warn("[CacheCleaner] Error measuring cache size:", error);
  }
  const sizeMB = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
  return { sizeMB, sizeBytes: totalBytes };
}

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
        bytesCleared += await recursiveCleanDirectory(itemUri);
        await FileSystem.deleteAsync(itemUri, { idempotent: true }).catch(() => {});
      } else {
        bytesCleared += info.size || 0;
        await FileSystem.deleteAsync(itemUri, { idempotent: true }).catch(() => {});
      }
    }
  } catch (_error) {}
  return bytesCleared;
}

export async function clearAppCache(): Promise<{ clearedMB: number; clearedBytes: number }> {
  let totalBytesCleared = 0;

  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) {
      totalBytesCleared += await recursiveCleanDirectory(cacheDir);
    }

    const docDir = FileSystem.documentDirectory;
    if (docDir) {
      const legacyAssets = `${docDir}cached_assets/`;
      const assetsInfo = await FileSystem.getInfoAsync(legacyAssets);
      if (assetsInfo.exists) {
        totalBytesCleared += await recursiveCleanDirectory(legacyAssets);
      }
    }

    await Image.clearDiskCache().catch(() => {});
    await Image.clearMemoryCache().catch(() => {});
  } catch (error) {
    console.warn("[CacheCleaner] Error while clearing cache:", error);
  }

  const clearedMB = parseFloat((totalBytesCleared / (1024 * 1024)).toFixed(2));
  return { clearedMB, clearedBytes: totalBytesCleared };
}
