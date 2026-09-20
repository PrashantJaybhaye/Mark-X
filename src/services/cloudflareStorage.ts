import * as FileSystem from "expo-file-system/legacy";

const WORKER_URL = process.env.EXPO_PUBLIC_CLOUDFLARE_WORKER_URL?.replace(/\/+$/, "");
const UPLOAD_SECRET = process.env.EXPO_PUBLIC_CLOUDFLARE_UPLOAD_SECRET;

export interface CloudflareUploadResponse {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Uploads a local file to the Cloudflare Worker which saves to R2.
 */
export async function uploadFileToCloudflare(
  localUri: string,
  mimeType: string = "image/jpeg",
  filename: string = "upload.jpg"
): Promise<CloudflareUploadResponse> {
  if (!WORKER_URL) {
    console.warn("[CloudflareStorage] EXPO_PUBLIC_CLOUDFLARE_WORKER_URL is not configured in .env");
    return {
      success: false,
      error: "Cloudflare Worker URL is not configured. Please set EXPO_PUBLIC_CLOUDFLARE_WORKER_URL.",
    };
  }

  try {
    const uploadEndpoint = `${WORKER_URL}/upload`;
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
    console.error("[CloudflareStorage] Upload Error:", error);
    return { success: false, error: error?.message || "Failed to upload file to Cloudflare" };
  }
}
