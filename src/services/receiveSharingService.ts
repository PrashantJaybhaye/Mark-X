import { NativeModules, NativeEventEmitter, Platform } from "react-native";

export interface SharedFileItem {
  filePath: string;
  uri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface SharedDataPayload {
  action: string;
  mimeType: string;
  text?: string;
  subject?: string;
  files: SharedFileItem[];
}

const { ReceiveSharingModule } = NativeModules;
const eventEmitter = ReceiveSharingModule ? new NativeEventEmitter(ReceiveSharingModule) : null;

export async function getInitialShare(): Promise<SharedDataPayload | null> {
  if (Platform.OS !== "android" || !ReceiveSharingModule) return null;
  try {
    const data = await ReceiveSharingModule.getInitialShare();
    if (data && ((data.files && data.files.length > 0) || data.text)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearShare(): Promise<void> {
  if (Platform.OS !== "android" || !ReceiveSharingModule) return;
  try {
    await ReceiveSharingModule.clearShare();
  } catch (_e) {
    return;
  }
}

export function subscribeToShares(callback: (data: SharedDataPayload) => void): () => void {
  if (Platform.OS !== "android" || !eventEmitter) {
    return () => undefined;
  }
  const subscription = eventEmitter.addListener("onNewShare", (data: SharedDataPayload) => {
    if (data && ((data.files && data.files.length > 0) || data.text)) {
      callback(data);
    }
  });
  return () => {
    subscription.remove();
  };
}
