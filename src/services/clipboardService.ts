import * as Clipboard from "expo-clipboard";

/**
 * Copies string text to system clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    return await Clipboard.setStringAsync(text);
  } catch (err) {
    console.warn("[ClipboardService] Error writing to clipboard:", err);
    return false;
  }
}
