import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";

export interface ExportResult {
  success: boolean;
  message?: string;
  savedToGallery?: boolean;
}

/**
 * Downloads remote media (if needed) and saves it directly to the device gallery / Photos.
 * Falls back to native file sharing if gallery permissions are not granted.
 */
export async function exportMediaToDevice(
  mediaUrl: string,
  fileName?: string
): Promise<ExportResult> {
  if (!mediaUrl) {
    return { success: false, message: "Invalid media URL." };
  }

  let localUri = mediaUrl;

  try {
    // 1. If remote URL, download directly to cache directory using SDK 57 File API
    if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
      const ext = mediaUrl.includes(".mp4") ? "mp4" : "jpg";
      const cleanFileName = fileName || `markx_${Date.now()}.${ext}`;
      const targetFile = new File(Paths.cache, cleanFileName);

      const downloadedFile = await File.downloadFileAsync(mediaUrl, targetFile, {
        idempotent: true,
      });
      localUri = downloadedFile.uri;
    }

    // 2. Request permission to save to device Photos / Media Library
    const { status } = await MediaLibrary.requestPermissionsAsync();

    if (status === "granted") {
      await MediaLibrary.saveToLibraryAsync(localUri);
      return {
        success: true,
        savedToGallery: true,
        message: "Saved directly to your device Photos.",
      };
    }

    // 3. Fallback to native file sharing sheet if media library permission is not granted
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri, {
        dialogTitle: "Export Media",
        mimeType: localUri.endsWith(".mp4") ? "video/mp4" : "image/jpeg",
        UTI: localUri.endsWith(".mp4") ? "public.movie" : "public.image",
      });
      return {
        success: true,
        savedToGallery: false,
        message: "Opened export dialog.",
      };
    }

    return {
      success: false,
      message: "Permission to access photo library was denied.",
    };
  } catch (error: any) {
    console.warn("[MediaExportService] Export failed:", error);
    return {
      success: false,
      message: error?.message || "Failed to export media.",
    };
  }
}
