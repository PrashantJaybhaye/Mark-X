import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";
import { setSystemBypassActive } from "./biometricsService";

export interface ExportResult {
  success: boolean;
  message?: string;
  savedToGallery?: boolean;
}

export async function exportMediaToDevice(
  mediaUrl: string,
  fileName?: string
): Promise<ExportResult> {
  if (!mediaUrl) {
    return { success: false, message: "Invalid media URL." };
  }

  let localUri = mediaUrl;

  try {
    setSystemBypassActive(true);

    if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
      const ext = mediaUrl.includes(".mp4") ? "mp4" : "jpg";
      const sanitizedBase = (fileName || `markx_${Date.now()}.${ext}`)
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/^\.+/, "");
      const cleanFileName = sanitizedBase || `markx_${Date.now()}.${ext}`;
      const targetFile = new File(Paths.cache, cleanFileName);

      const downloadedFile = await File.downloadFileAsync(mediaUrl, targetFile, {
        idempotent: true,
      });
      localUri = downloadedFile.uri;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();

    if (status === "granted") {
      await MediaLibrary.saveToLibraryAsync(localUri);
      return {
        success: true,
        savedToGallery: true,
        message: "Saved directly to your device Photos.",
      };
    }

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
  } finally {
    setSystemBypassActive(false);
  }
}
