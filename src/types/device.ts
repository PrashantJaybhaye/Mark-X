export type DeviceType = "phone" | "tablet" | "desktop" | "browser";

export interface HardwareInfo {
  brand: string;
  manufacturer: string;
  modelName: string;
  deviceName: string;
  deviceType: DeviceType;
  osName: string;
  osVersion: string;
  apiLevel: number | null;
  appVersion: string;
  cpuArchitectures: string[];
  isPhysical: boolean;
}

