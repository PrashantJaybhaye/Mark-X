import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";
import { DriveItem } from "../utils/driveFileTypes";
import { triggerHaptic } from "../utils/haptics";

export function getMimeTypeForFile(fileName?: string, defaultMime?: string): string {
  if (defaultMime && defaultMime !== "application/octet-stream" && defaultMime !== "*/*") {
    return defaultMime;
  }

  const name = (fileName || "").toLowerCase();

  if (name.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (name.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (name.endsWith(".pps") || name.endsWith(".ppsx")) return "application/vnd.ms-powerpoint";
  if (name.endsWith(".key")) return "application/x-iwork-keynote-sffkey";

  if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (name.endsWith(".doc")) return "application/msword";
  if (name.endsWith(".odt")) return "application/vnd.oasis.opendocument.text";
  if (name.endsWith(".rtf")) return "application/rtf";

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
  if (!item?.uri) {
    Alert.alert("Cannot Open", "File is missing or invalid.");
    return false;
  }

  triggerHaptic();

  try {
    let localUri = item.uri;

    if (localUri.startsWith("http://") || localUri.startsWith("https://")) {
      const safeName = (item.name || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
      const cachePath = `${FileSystem.cacheDirectory}markx_${Date.now()}_${safeName}`;

      const downloadRes = await FileSystem.downloadAsync(localUri, cachePath);
      if (downloadRes.status === 200 && downloadRes.uri) {
        localUri = downloadRes.uri;
      } else {
        throw new Error("Failed to download remote file to device storage.");
      }
    }

    const mimeType = getMimeTypeForFile(item.name, item.mimeType);

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
