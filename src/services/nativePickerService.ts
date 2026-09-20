import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

export interface PickedFileResult {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
}

export interface PickedImageResult {
  fileName?: string;
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
  mimeType?: string;
  type?: "image" | "video";
  duration?: number;
}

export async function safePickDocument(): Promise<PickedFileResult | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["*/*"],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      return {
        name: asset.name,
        uri: asset.uri,
        size: asset.size || 250000,
        mimeType: asset.mimeType || "application/octet-stream",
      };
    }
    return null;
  } catch (err) {
    console.warn("[SafePicker] Error during document picking:", err);
    return null;
  }
}

export async function safePickImage(): Promise<PickedImageResult | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === "video";
      return {
        fileName: asset.fileName || undefined,
        uri: asset.uri,
        width: asset.width || 800,
        height: asset.height || 1000,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
        type: isVideo ? "video" : "image",
        duration: asset.duration ? (asset.duration > 1000 ? Math.round(asset.duration / 1000) : Math.round(asset.duration)) : undefined,
      };
    }
    return null;
  } catch (err) {
    console.warn("[SafePicker] Error during media picking:", err);
    return null;
  }
}
