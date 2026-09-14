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

export interface DeviceSession {
  id: string;
  deviceId: string;
  name: string;
  customName?: string;
  brand: string;
  modelName: string;
  deviceType: DeviceType;
  osName: string;
  osVersion: string;
  appVersion: string;
  isCurrent: boolean;
  isPhysical: boolean;
  isDemo?: boolean;
  firstLogin: string; // ISO 8601 string
  lastActive: string; // ISO 8601 string
  location?: string;
  ipAddress?: string;
  sessionFingerprint: string;
}
