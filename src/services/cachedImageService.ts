import * as FileSystem from "expo-file-system/legacy";

const CACHE_FOLDER = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}cached_assets/`;

export async function getOrFetchCachedImage(
  remoteUrl: string,
  fileName: string
): Promise<string> {
  const localUri = `${CACHE_FOLDER}${fileName}`;

  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists && fileInfo.size > 0) {
      return localUri;
    }

    const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
    }

    const downloadResult = await FileSystem.downloadAsync(remoteUrl, localUri);
    if (downloadResult.status === 200) {
      return downloadResult.uri;
    }
  } catch (error) {
    console.warn("[CachedImageService] Error fetching cached image:", error);
  }

  return remoteUrl;
}

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
