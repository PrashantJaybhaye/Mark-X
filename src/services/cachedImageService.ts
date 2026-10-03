import * as FileSystem from "expo-file-system/legacy";

const CACHE_FOLDER = `${FileSystem.documentDirectory}cached_assets/`;

/**
 * Gets a cached local file path for a remote image URL.
 * Checks local disk cache first:
 * - If cached locally: returns file:// path immediately.
 * - If not cached: downloads unencrypted file from URL to local disk and returns file:// path.
 * - Falls back to remote URL if download fails.
 */
export async function getOrFetchCachedImage(
  remoteUrl: string,
  fileName: string
): Promise<string> {
  const localUri = `${CACHE_FOLDER}${fileName}`;

  try {
    // 1. Check if cached file already exists locally
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists && fileInfo.size > 0) {
      return localUri;
    }

    // 2. Ensure cache directory exists
    const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
    }

    // 3. Download from remote URL and save plain file locally (no encryption/decryption)
    const downloadResult = await FileSystem.downloadAsync(remoteUrl, localUri);
    if (downloadResult.status === 200) {
      return downloadResult.uri;
    }
  } catch (error) {
    console.warn("[CachedImageService] Error fetching cached image:", error);
  }

  // Fallback to direct network URL if fetch fails
  return remoteUrl;
}

/**
 * Forces a re-fetch of the image from remote URL, replacing the local cached file.
 */
export async function forceRefetchCachedImage(
  remoteUrl: string,
  fileName: string
): Promise<string> {
  const localUri = `${CACHE_FOLDER}${fileName}`;

  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
    }

    // Delete existing cached file if present to force fresh fetch
    const existing = await FileSystem.getInfoAsync(localUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    }

    const downloadResult = await FileSystem.downloadAsync(remoteUrl, localUri);
    if (downloadResult.status === 200) {
      return downloadResult.uri;
    }
  } catch (error) {
    console.warn("[CachedImageService] Error force refetching image:", error);
  }

  return remoteUrl;
}
