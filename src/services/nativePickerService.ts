import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * Safe picker service that prevents crashes when newly added native modules
 * haven't been compiled into the currently running development APK yet.
 */

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
}

export async function safePickDocument(): Promise<PickedFileResult | null> {
  const hasNativeDocPicker = !!requireOptionalNativeModule("ExpoDocumentPicker");

  if (hasNativeDocPicker) {
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
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

  console.warn("[SafePicker] ExpoDocumentPicker native module is not available in this environment.");
  return null;
}

export async function safePickImage(): Promise<PickedImageResult | null> {
  const hasNativeImagePicker = !!requireOptionalNativeModule("ExponentImagePicker");

  if (hasNativeImagePicker) {
    try {
      const ImagePicker = await import("expo-image-picker");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        return {
          fileName: asset.fileName || undefined,
          uri: asset.uri,
          width: asset.width || 800,
          height: asset.height || 1000,
          fileSize: asset.fileSize,
          mimeType: asset.mimeType || undefined,
        };
      }
      return null;
    } catch (err) {
      console.warn("[SafePicker] Error during image picking:", err);
      return null;
    }
  }

  console.warn("[SafePicker] ExponentImagePicker native module is not available in this environment.");
  return null;
}
