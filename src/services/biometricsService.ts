import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  enrolledLevel: LocalAuthentication.SecurityLevel;
  sensorName: string;
  sensorIcon: "finger-print" | "scan-outline" | "shield-checkmark-outline";
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

/**
 * Inspects device hardware and enrolled biometric security status.
 */
export async function checkBiometricsCapability(): Promise<BiometricCapability> {
  try {
    if (Platform.OS === "web") {
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        enrolledLevel: LocalAuthentication.SecurityLevel.NONE,
        sensorName: "Biometrics",
        sensorIcon: "finger-print",
      };
    }

    const [hasHardware, isEnrolled, supportedTypes, enrolledLevel] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);

    let sensorName = "Biometrics";
    let sensorIcon: BiometricCapability["sensorIcon"] = "finger-print";

    const hasFace = supportedTypes.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    );
    const hasFingerprint = supportedTypes.includes(
      LocalAuthentication.AuthenticationType.FINGERPRINT
    );
    const hasIris = supportedTypes.includes(
      LocalAuthentication.AuthenticationType.IRIS
    );

    if (Platform.OS === "ios") {
      if (hasFace) {
        sensorName = "Face ID";
        sensorIcon = "scan-outline";
      } else if (hasFingerprint) {
        sensorName = "Touch ID";
        sensorIcon = "finger-print";
      }
    } else {
      if (hasFace && hasFingerprint) {
        sensorName = "Biometrics";
        sensorIcon = "finger-print";
      } else if (hasFingerprint) {
        sensorName = "Fingerprint";
        sensorIcon = "finger-print";
      } else if (hasFace) {
        sensorName = "Face Unlock";
        sensorIcon = "scan-outline";
      } else if (hasIris) {
        sensorName = "Iris Unlock";
        sensorIcon = "scan-outline";
      }
    }

    return {
      hasHardware,
      isEnrolled,
      supportedTypes,
      enrolledLevel,
      sensorName,
      sensorIcon,
    };
  } catch (error) {
    console.warn("[BiometricsService] Failed to check capability:", error);
    return {
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      enrolledLevel: LocalAuthentication.SecurityLevel.NONE,
      sensorName: "Biometrics",
      sensorIcon: "finger-print",
    };
  }
}

/**
 * Triggers native system biometric prompt (Touch ID, Face ID, Android BiometricPrompt).
 */
export async function authenticateWithBiometrics(options?: {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
}): Promise<BiometricAuthResult> {
  try {
    if (Platform.OS === "web") {
      return { success: true };
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return {
        success: false,
        error: "Biometric hardware is not available on this device.",
      };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return {
        success: false,
        error: "No biometrics enrolled. Please set up fingerprint or face unlock in device settings.",
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options?.promptMessage || "Unlock Mark-X",
      cancelLabel: options?.cancelLabel || "Cancel",
      fallbackLabel: options?.fallbackLabel || "Use Passcode",
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    const isCancelled =
      result.error === "user_cancel" ||
      result.error === "app_cancel" ||
      result.error === "system_cancel";

    let readableError = "Authentication failed.";
    switch (result.error) {
      case "user_cancel":
      case "app_cancel":
      case "system_cancel":
        readableError = "Authentication was cancelled.";
        break;
      case "lockout":
        readableError = "Too many failed attempts. Please use your device passcode.";
        break;
      case "not_enrolled":
        readableError = "No biometric credentials enrolled on this device.";
        break;
      case "passcode_not_set":
        readableError = "No device passcode or PIN is set on this device.";
        break;
      case "timeout":
        readableError = "Authentication timed out. Tap to retry.";
        break;
      case "authentication_failed":
        readableError = "Biometric not recognized. Please try again.";
        break;
      case "user_fallback":
        readableError = "Device passcode requested.";
        break;
      default:
        readableError = result.warning || "Biometric authentication was unsuccessful.";
        break;
    }

    return {
      success: false,
      cancelled: isCancelled,
      error: readableError,
    };
  } catch (error: any) {
    console.warn("[BiometricsService] Authentication error:", error);
    return {
      success: false,
      error: error?.message || "An unexpected error occurred during authentication.",
    };
  }
}

/**
 * Cancels active authentication prompt if running on Android.
 */
export async function cancelBiometrics(): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await LocalAuthentication.cancelAuthenticate();
    }
  } catch (error) {
    console.warn("[BiometricsService] Cancel error:", error);
  }
}
