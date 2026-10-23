import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_FOLDER = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}cached_assets/`;

export async function getOrFetchCachedImage(
  remoteUrl: string,
  fileName: string
): Promise<string> {
  const localUri = `${CACHE_FOLDER}${fileName}`;

  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo?.exists && fileInfo?.size && fileInfo.size > 0) {
      return localUri;
    }

    const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
    if (!dirInfo?.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
    }

    const downloadResult = await FileSystem.downloadAsync(remoteUrl, localUri);
    if (downloadResult.status >= 200 && downloadResult.status < 300) {
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
    if (!dirInfo?.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
    }

    const existing = await FileSystem.getInfoAsync(localUri);
    if (existing?.exists) {
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    }

    const downloadResult = await FileSystem.downloadAsync(remoteUrl, localUri);
    if (downloadResult.status >= 200 && downloadResult.status < 300) {
      return downloadResult.uri;
    }
  } catch (error) {
    console.warn("[CachedImageService] Error force refetching image:", error);
  }

  return remoteUrl;
}

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function checkAndSyncDailyImage(
  remoteUrl: string,
  fileName: string,
  onUpdated?: (newUri: string) => void
): Promise<void> {
  const syncKey = `@markx_daily_banner_sync_${fileName}`;
  try {
    const today = getTodayKey();
    const lastSync = await AsyncStorage.getItem(syncKey);

    if (lastSync === today) {
      return;
    }

    const newUri = await forceRefetchCachedImage(remoteUrl, fileName);
    await AsyncStorage.setItem(syncKey, today);
    if (onUpdated && newUri) {
      onUpdated(`${newUri}?t=${Date.now()}`);
    }
  } catch (err) {
    console.warn("[CachedImageService] Daily sync error:", err);
  }
}

export async function recordBannerSyncedToday(fileName: string): Promise<void> {
  try {
    const syncKey = `@markx_daily_banner_sync_${fileName}`;
    await AsyncStorage.setItem(syncKey, getTodayKey());
  } catch {}
}
