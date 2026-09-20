import * as FileSystem from "expo-file-system/legacy";

const SERVER_URL = process.env.EXPO_PUBLIC_CLOUDFLARE_WORKER_URL?.replace(/\/+$/, "");
const UPLOAD_SECRET = process.env.EXPO_PUBLIC_CLOUDFLARE_UPLOAD_SECRET;

export interface MarkxUploadResponse {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export type CloudflareUploadResponse = MarkxUploadResponse;

/**
 * Uploads a local file to the Mark-X Storage Server.
 */
export async function uploadFileToMarkx(
  localUri: string,
  mimeType: string = "image/jpeg",
  filename: string = "upload.jpg"
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

    const response = await FileSystem.uploadAsync(uploadEndpoint, localUri, {
      fieldName: "file",
      httpMethod: "POST",
      uploadType: 1 as any, // FileSystemUploadType.MULTIPART
      mimeType: mimeType || "image/jpeg",
      headers,
    });

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

// Backward-compatible alias
export const uploadFileToCloudflare = uploadFileToMarkx;

