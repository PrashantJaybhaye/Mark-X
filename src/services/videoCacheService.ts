import * as FileSystem from "expo-file-system/legacy";

const activeDownloads = new Map<string, Promise<string | null>>();

export async function resolvePlayableVideoUri(pin: {
  id: string;
  imageUrl: string;
  localUri?: string;
}): Promise<string> {
  if (pin.localUri && !pin.localUri.startsWith("http")) {
    try {
      const info = await FileSystem.getInfoAsync(pin.localUri);
      if (info.exists) {
        return pin.localUri;
      }
    } catch (_e) {}
  }

  if (pin.imageUrl && !pin.imageUrl.startsWith("http")) {
    try {
      const info = await FileSystem.getInfoAsync(pin.imageUrl);
      if (info.exists) {
        return pin.imageUrl;
      }
    } catch (_e) {}
  }

  const cachedUri = `${FileSystem.cacheDirectory}vcache_${pin.id}.mp4`;
  try {
    const cachedInfo = await FileSystem.getInfoAsync(cachedUri);
    if (cachedInfo.exists && cachedInfo.size && cachedInfo.size > 0) {
      return cachedUri;
    }
  } catch (_e) {}

  if (pin.imageUrl && (pin.imageUrl.startsWith("http://") || pin.imageUrl.startsWith("https://"))) {
    preloadVideoToCache(pin.id, pin.imageUrl);
  }

  return pin.imageUrl;
}

export async function preloadVideoToCache(id: string, remoteUrl: string): Promise<string | null> {
  if (!remoteUrl || !remoteUrl.startsWith("http")) return null;
  const targetUri = `${FileSystem.cacheDirectory}vcache_${id}.mp4`;

  if (activeDownloads.has(id)) {
    return activeDownloads.get(id)!;
  }

  const downloadPromise = (async () => {
    try {
      const info = await FileSystem.getInfoAsync(targetUri);
      if (info.exists && info.size && info.size > 0) {
        return targetUri;
      }

      const downloadResult = await FileSystem.downloadAsync(remoteUrl, targetUri);
      if (downloadResult && downloadResult.status === 200) {
        return downloadResult.uri;
      }
    } catch (_e) {
    } finally {
      activeDownloads.delete(id);
    }
    return null;
  })();

  activeDownloads.set(id, downloadPromise);
  return downloadPromise;
}

export async function clearVideoDiskCache(): Promise<void> {
  try {
    const dir = FileSystem.cacheDirectory;
    if (!dir) return;
    const files = await FileSystem.readDirectoryAsync(dir);
    const videoCaches = files.filter((f) => f.startsWith("vcache_"));
    await Promise.all(
      videoCaches.map((file) =>
        FileSystem.deleteAsync(`${dir}${file}`, { idempotent: true }).catch(() => {})
      )
    );
  } catch (_e) {}
}
