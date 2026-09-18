import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceType, HardwareInfo } from "../../types/device";

const INSTALLATION_ID_KEY = "@markx_installation_device_id";

/**
 * Returns a persistent UUID for this app installation.
 */
export async function getPersistentDeviceId(): Promise<string> {
  try {
    const existingId = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
    if (existingId) {
      return existingId;
    }

    const newId = crypto.randomUUID();
    await AsyncStorage.setItem(INSTALLATION_ID_KEY, newId);
    return newId;
  } catch (err) {
    console.warn("[deviceHardwareService] Error accessing device ID in storage:", err);
    return "markx-default-device-id";
  }
}

/**
 * Resolves the device type enum to our domain DeviceType.
 */
function resolveDeviceType(): DeviceType {
  if (Platform.OS === "web") {
    return "browser";
  }

  switch (Device.deviceType) {
    case Device.DeviceType.TABLET:
      return "tablet";
    case Device.DeviceType.DESKTOP:
      return "desktop";
    case Device.DeviceType.PHONE:
      return "phone";
    default:
      return Platform.OS === "ios" || Platform.OS === "android" ? "phone" : "desktop";
  }
}

/**
 * Inspects the current device's hardware & OS properties using Expo SDK 57.
 */
export function getHardwareInfo(): HardwareInfo {
  const brand = Device.brand || Platform.select({ ios: "Apple", android: "Android", default: "Generic" });
  const manufacturer = Device.manufacturer || brand;
  const modelName = Device.modelName || Platform.select({
    ios: "iPhone",
    android: "Android Device",
    default: "Web Client",
  });
  const deviceName = Device.deviceName || modelName;
  const osName = Device.osName || Platform.select({ ios: "iOS", android: "Android", default: "Web" });
  const osVersion = Device.osVersion || (Platform.Version ? String(Platform.Version) : "1.0");
  const apiLevel = Device.platformApiLevel ?? null;
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const cpuArchitectures = Device.supportedCpuArchitectures || [Platform.OS === "android" ? "arm64-v8a" : "arm64"];
  const isPhysical = Device.isDevice ?? (Platform.OS !== "web");

  return {
    brand,
    manufacturer,
    modelName,
    deviceName,
    deviceType: resolveDeviceType(),
    osName,
    osVersion,
    apiLevel,
    appVersion,
    cpuArchitectures,
    isPhysical,
  };
}

/**
 * Generates a clean human-friendly label for the current device.
 * (e.g. "Google Pixel 8", "Apple iPhone 15 Pro", "Samsung Galaxy S23")
 */
export function getFormattedDeviceLabel(info: HardwareInfo): string {
  if (info.deviceName && info.deviceName !== info.modelName) {
    return info.deviceName;
  }
  if (info.brand && info.modelName && !info.modelName.toLowerCase().startsWith(info.brand.toLowerCase())) {
    return `${info.brand} ${info.modelName}`;
  }
  return info.modelName || "My Device";
}
