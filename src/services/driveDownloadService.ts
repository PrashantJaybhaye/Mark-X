import notifee, {
  AndroidImportance,
} from "@notifee/react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { DriveItem } from "../utils/driveFileTypes";
import { getMimeTypeForFile } from "./nativeFileOpenerService";
import { emitDriveToast } from "./driveToastService";

let ReactNativeBlobUtil: any = null;
try {
  const mod = require("react-native-blob-util");
  ReactNativeBlobUtil = mod?.default || mod;
} catch {}

const DOWNLOAD_CHANNEL_ID = "downloads_channel";

export interface DownloadFileResult {
  success: boolean;
  savedPath?: string;
  error?: string;
}

const activeDownloads = new Map<string, FileSystem.DownloadResumable>();

async function ensureDownloadChannel() {
  if (Platform.OS !== "android") return;
  try {
    await notifee.createChannel({
      id: DOWNLOAD_CHANNEL_ID,
      name: "File Downloads",
      importance: AndroidImportance.HIGH,
      vibration: false,
    });
  } catch (e) {
    console.warn("[DriveDownloadService] Failed to create download channel:", e);
  }
}

function normalizeLocalPath(uri: string): string {
  let decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch {}
  return decoded.replace(/^file:\/\//, "");
}

async function showProgressNotification(
  notificationId: string,
  fileName: string,
  percent: number
) {
  try {
    await ensureDownloadChannel();
    const bounded = Math.min(100, Math.max(0, Math.round(percent)));

    await notifee.displayNotification({
      id: notificationId,
      title: fileName,
      body: `Downloading... ${bounded}%`,
      android: {
        channelId: DOWNLOAD_CHANNEL_ID,
        onlyAlertOnce: true,
        ongoing: true,
        importance: AndroidImportance.HIGH,
        progress: {
          max: 100,
          current: bounded,
          indeterminate: false,
        },
        pressAction: { id: "default" },
      },
    });
  } catch (err) {
    console.warn("[DriveDownloadService] Failed to show progress notification:", err);
  }
}

/**
 * Renders the completed notification.
 */
async function showCompletionNotification(
  notificationId: string,
  fileName: string
) {
  try {
    await ensureDownloadChannel();
    await notifee.displayNotification({
      id: notificationId,
      title: fileName,
      body: "Download complete",
      android: {
        channelId: DOWNLOAD_CHANNEL_ID,
        onlyAlertOnce: false,
        ongoing: false,
        importance: AndroidImportance.HIGH,
        pressAction: { id: "default" },
      },
    });
  } catch (err) {
    console.warn("[DriveDownloadService] Failed to show completion notification:", err);
  }
}

/**
 * Renders a failure notification.
 */
async function showFailureNotification(
  notificationId: string,
  fileName: string,
  errorMessage: string
) {
  try {
    await ensureDownloadChannel();
    await notifee.displayNotification({
      id: notificationId,
      title: fileName,
      body: errorMessage || "Download failed",
      android: {
        channelId: DOWNLOAD_CHANNEL_ID,
        onlyAlertOnce: false,
        ongoing: false,
        importance: AndroidImportance.HIGH,
        pressAction: { id: "default" },
      },
    });
  } catch (err) {
    console.warn("[DriveDownloadService] Failed to show failure notification:", err);
  }
}

/**
 * Downloads a Drive item to the device:
 * 1. Shows a push notification with a progress bar.
 * 2. Saves the file with the EXACT name given in the app (no extra prefix or timestamp).
 * 3. On completion, updates push notification to indicate download is complete.
 */
export async function downloadDriveFile(
  item: DriveItem,
  onProgress?: (percent: number) => void
): Promise<DownloadFileResult> {
  if (item.isFolder) {
    const err = "Folders cannot be downloaded as a single file.";
    emitDriveToast("Cannot Download", "error", err);
    return { success: false, error: err };
  }

  const remoteUrl = item.cloudflareUrl || (item.uri?.startsWith("http") ? item.uri : null);
  const localSourceUri = item.uri?.startsWith("file://") ? item.uri : null;

  if (!remoteUrl && !localSourceUri) {
    const err = "File location is not available to download.";
    emitDriveToast("Download Failed", "error", err);
    return { success: false, error: err };
  }

  // Request notification permissions
  try {
    await notifee.requestPermission();
  } catch {}

  const exactFileName = (item.name || "downloaded_file").trim();
  const notificationId = `download_${item.id || Date.now()}`;
  const mimeType = getMimeTypeForFile(exactFileName, item.mimeType);

  emitDriveToast(exactFileName, "export", "Downloading file...");

  // Show 0% initial progress notification
  await showProgressNotification(notificationId, exactFileName, 0);

  let tempDownloadedUri: string | null = null;

  try {
    if (remoteUrl) {
      // Use clean alphanumeric name for temp staging file to avoid URI encoding issues on disk
      const tempSafeToken = `temp_dl_${Date.now()}`;
      const ext = exactFileName.includes(".") ? `.${exactFileName.split(".").pop()}` : "";
      const tempPath = `${FileSystem.cacheDirectory}${tempSafeToken}${ext}`;
      let lastReportedPercent = 0;

      const downloadResumable = FileSystem.createDownloadResumable(
        remoteUrl,
        tempPath,
        {},
        (downloadProgress) => {
          const totalBytes = downloadProgress.totalBytesExpectedToWrite;
          const written = downloadProgress.totalBytesWritten;
          if (totalBytes > 0) {
            const pct = Math.round((written / totalBytes) * 100);
            if (pct >= lastReportedPercent + 5 || pct === 100) {
              lastReportedPercent = pct;
              onProgress?.(pct);
              showProgressNotification(notificationId, exactFileName, pct);
            }
          }
        }
      );

      activeDownloads.set(notificationId, downloadResumable);
      const downloadResult = await downloadResumable.downloadAsync();
      activeDownloads.delete(notificationId);

      if (!downloadResult || downloadResult.status < 200 || downloadResult.status >= 300 || !downloadResult.uri) {
        throw new Error(`Download failed with status ${downloadResult?.status || "unknown"}`);
      }
      tempDownloadedUri = downloadResult.uri;
    } else if (localSourceUri) {
      // Local source already exists, check if present
      const info = await FileSystem.getInfoAsync(localSourceUri);
      if (!info.exists) {
        throw new Error("Local file not found on device storage.");
      }
      tempDownloadedUri = localSourceUri;
      showProgressNotification(notificationId, exactFileName, 100);
    }

    if (!tempDownloadedUri) {
      throw new Error("Unable to obtain downloaded file.");
    }

    // Now save to device with the EXACT name requested by the user
    let finalSavedPath = tempDownloadedUri;
    const cleanTempPath = normalizeLocalPath(tempDownloadedUri);

    if (Platform.OS === "android") {
      let savedToMediaStore = false;

      // 1. Try ReactNativeBlobUtil MediaCollection.copyToMediaStore to save into Downloads folder
      if (ReactNativeBlobUtil?.MediaCollection?.copyToMediaStore) {
        try {
          const contentUri = await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
            {
              name: exactFileName,
              parentFolder: "",
              mimeType: mimeType,
            },
            "Download",
            cleanTempPath
          );
          if (contentUri) {
            finalSavedPath = contentUri;
            savedToMediaStore = true;
          }
        } catch (e: any) {
          console.warn("[DriveDownloadService] MediaCollection copy failed:", e?.message);
        }
      }

      // 2. If copyToMediaStore is unavailable or failed, write to public Download directory
      if (!savedToMediaStore) {
        try {
          const downloadDir = ReactNativeBlobUtil.fs?.dirs?.DownloadDir;
          if (downloadDir) {
            const destPath = `${downloadDir}/${exactFileName}`;
            await ReactNativeBlobUtil.fs.cp(cleanTempPath, destPath);
            finalSavedPath = destPath;

            // Register in Android DownloadManager
            if (ReactNativeBlobUtil.android?.addCompleteDownload) {
              await ReactNativeBlobUtil.android.addCompleteDownload({
                title: exactFileName,
                description: "Downloaded from Mark-X Drive",
                mime: mimeType,
                path: destPath,
                showNotification: false,
              }).catch(() => {});
            }
          }
        } catch (cpErr: any) {
          console.warn("[DriveDownloadService] Fallback to DownloadDir copy failed:", cpErr?.message);
        }
      }

      // 3. Fallback if MediaStore / DownloadDir was unavailable: save into documentDirectory and share
      if (!savedToMediaStore && finalSavedPath === tempDownloadedUri) {
        try {
          const dest = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${exactFileName}`;
          await FileSystem.copyAsync({
            from: tempDownloadedUri,
            to: dest,
          }).catch(() => {});
          finalSavedPath = dest;

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(dest, {
              mimeType,
              dialogTitle: `Save ${exactFileName}`,
            });
          }
        } catch (fErr) {
          console.warn("[DriveDownloadService] Standard document copy fallback notice:", fErr);
        }
      }
    } else {
      // iOS: Save into FileSystem.documentDirectory with exact name
      const iosDest = `${FileSystem.documentDirectory}${exactFileName}`;
      await FileSystem.copyAsync({
        from: tempDownloadedUri,
        to: iosDest,
      }).catch(() => {});
      finalSavedPath = iosDest;
    }

    // Show completion notification (clean notification without locate button)
    await showCompletionNotification(notificationId, exactFileName);

    emitDriveToast(exactFileName, "success", "Downloaded successfully");
    return { success: true, savedPath: finalSavedPath };
  } catch (error: any) {
    activeDownloads.delete(notificationId);
    console.error("[DriveDownloadService] Download error:", error);
    const errorMsg = error?.message || "Failed to download file.";
    await showFailureNotification(notificationId, exactFileName, errorMsg);
    emitDriveToast(exactFileName, "error", errorMsg);
    return { success: false, error: errorMsg };
  }
}
