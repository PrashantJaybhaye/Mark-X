import { requireOptionalNativeModule } from "expo-modules-core";

export interface OtaCheckResult {
  hasUpdate: boolean;
  title: string;
  message: string;
  applyUpdate?: () => Promise<void>;
}

/**
 * Safe OTA update service using expo-updates.
 * Returns structured result for custom iOS modal display.
 */
export async function checkOtaUpdate(): Promise<OtaCheckResult> {
  const hasNativeUpdates = !!requireOptionalNativeModule("ExpoUpdates");

  // In local development or if native module is not compiled into running binary
  if (__DEV__ || !hasNativeUpdates) {
    return {
      hasUpdate: false,
      title: "You're Up to Date",
      message: "Mark-X v1.0.0 is currently running the latest build. Over-The-Air updates will automatically apply in production releases.",
    };
  }

  try {
    const Updates = await import("expo-updates");

    if (!Updates.isEnabled) {
      return {
        hasUpdate: false,
        title: "You're Up to Date",
        message: "Mark-X is running the latest build.",
      };
    }

    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      return {
        hasUpdate: true,
        title: "Update Available",
        message: "A new version of Mark-X is ready. Would you like to download and restart the app to apply it now?",
        applyUpdate: async () => {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        },
      };
    }

    return {
      hasUpdate: false,
      title: "You're Up to Date",
      message: "Mark-X is running the latest available release.",
    };
  } catch (error: any) {
    console.warn("[UpdateService] Error checking for OTA updates:", error);
    return {
      hasUpdate: false,
      title: "Update Check",
      message: "Unable to check for updates at this moment. Please try again later.",
    };
  }
}
