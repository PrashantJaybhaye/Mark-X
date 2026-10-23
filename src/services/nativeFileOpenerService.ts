import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform, Alert, NativeModules } from "react-native";
import { DriveItem } from "../utils/driveFileTypes";
import { triggerHaptic } from "../utils/haptics";

export function getMimeTypeForFile(fileName?: string, defaultMime?: string): string {
  const name = (fileName || "").toLowerCase();

  // Explicit extension matching first for highest reliability
  if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (name.endsWith(".doc")) return "application/msword";
  if (name.endsWith(".odt")) return "application/vnd.oasis.opendocument.text";
  if (name.endsWith(".rtf")) return "application/rtf";

  if (name.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (name.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (name.endsWith(".pps") || name.endsWith(".ppsx")) return "application/vnd.ms-powerpoint";
  if (name.endsWith(".key")) return "application/x-iwork-keynote-sffkey";

  if (name.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (name.endsWith(".xls")) return "application/vnd.ms-excel";
  if (name.endsWith(".csv")) return "text/csv";
  if (name.endsWith(".ods")) return "application/vnd.oasis.opendocument.spreadsheet";

  if (name.endsWith(".pdf")) return "application/pdf";

  if (name.endsWith(".txt")) return "text/plain";
  if (name.endsWith(".json")) return "application/json";
  if (name.endsWith(".html") || name.endsWith(".htm")) return "text/html";
  if (name.endsWith(".xml")) return "application/xml";

  if (name.endsWith(".zip")) return "application/zip";
  if (name.endsWith(".rar")) return "application/x-rar-compressed";
  if (name.endsWith(".7z")) return "application/x-7z-compressed";

  if (defaultMime && defaultMime !== "application/octet-stream" && defaultMime !== "*/*") {
    return defaultMime;
  }

  return defaultMime || "application/octet-stream";
}

export function getRecommendedAppName(fileName?: string): string {
  const name = (fileName || "").toLowerCase();
  if (name.endsWith(".pptx") || name.endsWith(".ppt") || name.endsWith(".key")) {
    return "PowerPoint / Google Slides";
  }
  if (name.endsWith(".docx") || name.endsWith(".doc") || name.endsWith(".odt")) {
    return "Word / Google Docs";
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    return "Excel / Google Sheets";
  }
  return "Native Phone App";
}

export async function openInNativeApp(item: DriveItem): Promise<boolean> {
  const targetUri = item?.uri || item?.cloudflareUrl;
  if (!targetUri) {
    Alert.alert("Cannot Open", "File location is missing or invalid.");
    return false;
  }

  triggerHaptic();

  try {
    let localUri = targetUri;

    // If localUri is a file:// path, check if it actually exists on device
    if (localUri.startsWith("file://")) {
      const info = await FileSystem.getInfoAsync(localUri).catch(() => null);
      if (!info?.exists) {
        if (item.cloudflareUrl && item.cloudflareUrl.startsWith("http")) {
          localUri = item.cloudflareUrl;
        } else {
          Alert.alert("File Not Found", "The local file could not be found on device storage.");
          return false;
        }
      }
    }

    // If file is remote, download it to cache directory
    if (localUri.startsWith("http://") || localUri.startsWith("https://")) {
      let safeName = (item.name || "document").replace(/[^a-zA-Z0-9._-]/g, "_");

      // Ensure extension is retained so native applications recognize the file type
      const hasExtension = safeName.includes(".") && safeName.lastIndexOf(".") > 0;
      if (!hasExtension) {
        const mime = (item.mimeType || "").toLowerCase();
        if (mime.includes("wordprocessingml") || mime.includes("msword")) safeName += ".docx";
        else if (mime.includes("spreadsheetml") || mime.includes("ms-excel")) safeName += ".xlsx";
        else if (mime.includes("presentationml") || mime.includes("ms-powerpoint")) safeName += ".pptx";
        else if (mime.includes("pdf")) safeName += ".pdf";
      }

      const cachePath = `${FileSystem.cacheDirectory}markx_${Date.now()}_${safeName}`;

      const downloadRes = await FileSystem.downloadAsync(localUri, cachePath);
      if (downloadRes.status >= 200 && downloadRes.status < 300 && downloadRes.uri) {
        localUri = downloadRes.uri;
      } else {
        throw new Error(`Failed to download remote file to device storage (HTTP ${downloadRes.status || "Error"}).`);
      }
    }

    const mimeType = getMimeTypeForFile(item.name, item.mimeType);

    // On Android, open directly in the mobile native viewer/editor (Intent.ACTION_VIEW) instead of the Share sheet
    if (Platform.OS === "android") {
      try {
        const cleanPath = localUri.replace(/^file:\/\//, "");
        const blobUtil = NativeModules.ReactNativeBlobUtil;
        if (blobUtil && typeof blobUtil.actionViewIntent === "function") {
          await blobUtil.actionViewIntent(cleanPath, mimeType, null);
          return true;
        }
      } catch (intentErr: any) {
        console.warn("[NativeFileOpener] Native ACTION_VIEW failed, attempting sharing fallback:", intentErr);
      }
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri, {
        mimeType,
        dialogTitle: `Open ${item.name}`,
        UTI: mimeType,
      });
      return true;
    }

    Alert.alert("Not Supported", "Your device does not support native file viewing for this format.");
    return false;
  } catch (error: any) {
    console.warn("[NativeFileOpener] Error opening file in native app:", error);
    Alert.alert("Open Failed", error?.message || "Could not launch native app for this file.");
    return false;
  }
}
