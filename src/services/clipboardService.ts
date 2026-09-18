import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * Safe clipboard service that prevents crashes when newly added native modules
 * haven't been compiled into the currently running development APK / client yet.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Web fallback using navigator.clipboard
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn("[ClipboardService] Web clipboard write failed:", e);
    }
  }

  // Check if ExpoClipboard native module is present in the binary
  const hasNativeClipboard = !!requireOptionalNativeModule("ExpoClipboard");
  if (hasNativeClipboard) {
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(text);
      return true;
    } catch (err) {
      console.warn("[ClipboardService] Error writing to clipboard:", err);
      return false;
    }
  }

  console.warn(
    "[ClipboardService] ExpoClipboard native module is not compiled into the current development build. Run `npx expo run:android` to rebuild with native clipboard support."
  );
  return false;
}
