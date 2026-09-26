import * as Updates from "expo-updates";
import { Alert } from "react-native";

export interface OtaCheckResult {
  title: string;
  message: string;
  hasUpdate: boolean;
  applyUpdate?: () => Promise<void>;
}

/**
 * Checks for OTA updates in production on app launch and prompts user to restart.
 */
export async function checkForAppUpdates(): Promise<boolean> {
  if (__DEV__) return false;

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      Alert.alert(
        "Update Available",
        "A new update has been downloaded. Restart Mark-X now to apply updates?",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Restart",
            onPress: () => {
              Updates.reloadAsync();
            },
          },
        ]
      );
      return true;
    }
  } catch (error) {
    console.log("[OTA Update] Skip check:", error);
  }
  return false;
}

/**
 * Manual OTA check invoked from the About screen.
 */
export async function checkOtaUpdate(): Promise<OtaCheckResult> {
  if (__DEV__) {
    return {
      title: "Development Build",
      message: "OTA updates are disabled in development mode.",
      hasUpdate: false,
    };
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      return {
        title: "Update Ready",
        message: "A new update for Mark-X is downloaded and ready to apply.",
        hasUpdate: true,
        applyUpdate: async () => {
          await Updates.reloadAsync();
        },
      };
    } else {
      return {
        title: "Up to Date",
        message: "Mark-X is already updated to the latest version.",
        hasUpdate: false,
      };
    }
  } catch (error) {
    return {
      title: "Check Failed",
      message: "Unable to check for updates at this time. Please try again later.",
      hasUpdate: false,
    };
  }
}
