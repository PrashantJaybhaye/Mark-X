import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const BOT_TOKEN = process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.EXPO_PUBLIC_TELEGRAM_CHAT_ID;

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const FILE_BASE = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

export interface TelegramUploadResponse {
  success: boolean;
  fileId?: string;
  error?: string;
}

/**
 * Uploads a file from local URI to Telegram using the Bot API.
 * Uses sendDocument by default, or sendPhoto for images.
 */
export async function uploadFileToTelegram(
  localUri: string,
  mimeType: string,
  filename: string,
  isPhoto: boolean = false
): Promise<TelegramUploadResponse> {
  if (!BOT_TOKEN || !CHAT_ID) {
    return { success: false, error: "Telegram configuration is missing in .env" };
  }

  try {
    const endpoint = isPhoto ? `${API_BASE}/sendPhoto` : `${API_BASE}/sendDocument`;
    
    // FileSystem.uploadAsync is much more stable for file uploads in Expo than fetch + FormData
    const response = await FileSystem.uploadAsync(endpoint, localUri, {
      fieldName: isPhoto ? "photo" : "document",
      httpMethod: "POST",
      uploadType: 1 as any, // FileSystemUploadType.MULTIPART
      parameters: {
        chat_id: CHAT_ID,
      },
      mimeType: mimeType || "application/octet-stream",
    });

    const result = JSON.parse(response.body);
    
    if (result.ok) {
      const fileId = isPhoto 
        ? result.result.photo?.at(-1)?.file_id 
        : result.result.document?.file_id;
        
      if (!fileId) {
        return { success: false, error: "Unknown response format from Telegram" };
      }
      return { success: true, fileId };
    } else {
      return { success: false, error: result.description || "Upload failed" };
    }
  } catch (error: any) {
    console.error("[TelegramStorage] Upload Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches the actual download URL for a Telegram file_id.
 * Note: Telegram file URLs expire after ~1 hour, so this should be called dynamically.
 */
export async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  if (!BOT_TOKEN) return null;

  try {
    const response = await fetch(`${API_BASE}/getFile?file_id=${fileId}`);
    const result = await response.json();

    if (result.ok && result.result.file_path) {
      const url = `${FILE_BASE}/${result.result.file_path}`;
      return url;
    }
    return null;
  } catch (error) {
    console.error("[TelegramStorage] getFileUrl Error:", error);
    return null;
  }
}
