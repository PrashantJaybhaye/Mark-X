import * as FileSystem from "expo-file-system/legacy";
import { auth } from "./firebase";

const SERVER_URL = process.env.EXPO_PUBLIC_CLOUDFLARE_WORKER_URL?.replace(/\/+$/, "");
const UPLOAD_SECRET = process.env.EXPO_PUBLIC_CLOUDFLARE_UPLOAD_SECRET;

export interface MarkxUploadResponse {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export type CloudflareUploadResponse = MarkxUploadResponse;
export type UploadProgressCallback = (
  progressPercent: number,
  bytesSent: number,
  totalBytes: number
) => void;

export async function uploadFileToMarkx(
  localUri: string,
  mimeType: string = "image/jpeg",
  filename: string = "upload.jpg",
  onProgress?: UploadProgressCallback
): Promise<MarkxUploadResponse> {
  if (!SERVER_URL) {
    console.warn("[MarkxStorage] Storage server URL is not configured in .env");
    return {
      success: false,
      error: "Mark-X Storage server is not configured.",
    };
  }

  try {
    const uploadEndpoint = `${SERVER_URL}/upload`;
    const headers: Record<string, string> = {};
    if (UPLOAD_SECRET) {
      headers["X-Auth-Key"] = UPLOAD_SECRET;
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken();
        if (idToken) {
          headers["Authorization"] = `Bearer ${idToken}`;
        }
        headers["X-User-Id"] = currentUser.uid;
      } catch {}
    }

    const task = FileSystem.createUploadTask(
      uploadEndpoint,
      localUri,
      {
        fieldName: "file",
        httpMethod: "POST",
        uploadType: 1 as any,
        mimeType: mimeType || "image/jpeg",
        headers,
      },
      (data) => {
        if (data.totalBytesExpectedToSend > 0 && onProgress) {
          const percent = Math.min(
            100,
            Math.max(0, Math.round((data.totalBytesSent / data.totalBytesExpectedToSend) * 100))
          );
          onProgress(percent, data.totalBytesSent, data.totalBytesExpectedToSend);
        }
      }
    );

    const response = await task.uploadAsync();
    if (!response) {
      return { success: false, error: "Upload process was interrupted" };
    }

    let result: any = {};
    try {
      result = JSON.parse(response.body);
    } catch {}

    if (response.status >= 200 && response.status < 300 && result.success && result.url) {
      return { success: true, url: result.url, key: result.key };
    }

    return {
      success: false,
      error: result.error || `Upload failed with status ${response.status}`,
    };
  } catch (error: any) {
    console.error("[MarkxStorage] Upload Error:", error);
    return { success: false, error: error?.message || "Failed to upload file to Mark-X Storage" };
  }
}

export const uploadFileToCloudflare = uploadFileToMarkx;

export async function deleteFileFromMarkx(keyOrUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!SERVER_URL || !keyOrUrl) {
    return { success: false, error: "Mark-X Storage server is not configured or key is missing." };
  }

  try {
    let key = keyOrUrl.trim();
    if (key.startsWith("http://") || key.startsWith("https://")) {
      try {
        const parsed = new URL(key);
        key = parsed.pathname.replace(/^\/+/, "");
      } catch {
        const parts = key.split("/");
        key = parts.slice(3).join("/");
      }
    }

    if (!key) return { success: false, error: "Invalid file key" };

    const headers: Record<string, string> = {};
    if (UPLOAD_SECRET) {
      headers["X-Auth-Key"] = UPLOAD_SECRET;
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken();
        if (idToken) {
          headers["Authorization"] = `Bearer ${idToken}`;
        }
        headers["X-User-Id"] = currentUser.uid;
      } catch {}
    }

    const deleteEndpoint = `${SERVER_URL}/${encodeURIComponent(key)}`;
    const response = await fetch(deleteEndpoint, {
      method: "DELETE",
      headers,
    });

    if (response.ok) {
      return { success: true };
    }

    const json = await response.json().catch(() => ({}));
    return { success: false, error: json.error || `Delete failed with status ${response.status}` };
  } catch (err: any) {
    console.warn("[MarkxStorage] Delete error:", err);
    return { success: false, error: err?.message || "Delete request failed" };
  }
}

export const deleteFileFromCloudflare = deleteFileFromMarkx;
