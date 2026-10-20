export interface GalleryPin {
  id: string;
  author?: string;
  authorAvatar?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  localUri?: string;
  fileName?: string;
  mediaType?: "image" | "video";
  duration?: number;
  aspectRatio: number;
  likes: number;
  isLiked?: boolean;
  saved?: boolean;
  uploadStatus?: "uploading" | "synced" | "failed";

  width?: number;
  height?: number;
  fileSize?: number;
  fileSizeFormatted?: string;
  mimeType?: string;
  createdAt?: any;
  updatedAt?: any;
  blurHash?: string;
}

export const DEFAULT_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DGR4";

export async function createLocalThumbnail(localUri: string, width = 350): Promise<string> {
  if (!localUri || typeof localUri !== "string") return localUri;
  if (localUri.endsWith(".mp4") || localUri.endsWith(".mov") || localUri.endsWith(".webm")) {
    return localUri;
  }

  try {
    const ImageManipulator = require("expo-image-manipulator");
    const result = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (err) {
    console.warn("[GalleryData] Local thumbnail generation fallback:", err);
    return localUri;
  }
}

export function getGridThumbnailUrl(url: string, width = 350, quality = 80): string {
  if (!url || typeof url !== "string") return url;

  if (
    url.startsWith("file://") ||
    url.startsWith("ph://") ||
    url.startsWith("content://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  const cleanUrl = url.split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".mov") || cleanUrl.endsWith(".webm")) {
    return url;
  }

  const hasQuery = url.includes("?");
  const separator = hasQuery ? "&" : "?";

  if (!url.includes("width=") && !url.includes("w=")) {
    return `${url}${separator}width=${width}&format=webp&quality=${quality}`;
  }

  return url;
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function generateShortFileName(options: {
  fileName?: string;
  uri?: string;
  imageUrl?: string;
  mediaType?: "image" | "video";
  id?: string;
  createdAt?: any;
}): string {
  const isVideo = options.mediaType === "video";
  const defaultExt = isVideo ? ".mp4" : ".jpg";

  if (options.fileName && typeof options.fileName === "string") {
    const trimmed = options.fileName.trim();
    const baseWithoutExt = trimmed.replace(/\.[^/.]+$/, "");
    if (/^\d{12,14}$/.test(baseWithoutExt)) {
      const ext = trimmed.includes(".")
        ? trimmed.substring(trimmed.lastIndexOf(".")).toLowerCase()
        : defaultExt;
      return `${baseWithoutExt}${ext}`;
    }
  }

  if (options.createdAt) {
    if (typeof options.createdAt.toMillis === "function") {
      return `${options.createdAt.toMillis()}${defaultExt}`;
    }
    if (typeof options.createdAt.seconds === "number") {
      return `${options.createdAt.seconds * 1000}${defaultExt}`;
    }
    if (typeof options.createdAt === "number" && options.createdAt > 1000000000) {
      return `${options.createdAt}${defaultExt}`;
    }
    const parsed = new Date(options.createdAt).getTime();
    if (!isNaN(parsed) && parsed > 1000000000) {
      return `${parsed}${defaultExt}`;
    }
  }

  const digits = (options.id || "").replace(/\D/g, "");
  if (digits.length >= 12) {
    return `${digits.slice(-13)}${defaultExt}`;
  }

  return `${Date.now()}${defaultExt}`;
}

export function normalizeGalleryPin(pin: any): GalleryPin {
  const isVideo = pin.mediaType === "video";
  const width = pin.width || (pin.aspectRatio && pin.aspectRatio >= 1 ? 1920 : 1080);
  const height = pin.height || Math.round(width / (pin.aspectRatio || 1));
  const fileSize =
    typeof pin.fileSize === "number" && pin.fileSize > 0
      ? pin.fileSize
      : isVideo
      ? 14800000
      : 2800000;
  const fileSizeFormatted =
    pin.fileSizeFormatted || formatBytes(fileSize);

  const fileName =
    pin.fileName ||
    generateShortFileName({
      fileName: pin.fileName,
      imageUrl: pin.imageUrl,
      mediaType: pin.mediaType,
      id: pin.id,
      createdAt: pin.createdAt,
    });

  const isRemoteUrl =
    typeof pin.imageUrl === "string" &&
    (pin.imageUrl.startsWith("http://") || pin.imageUrl.startsWith("https://"));

  const uploadStatus: "uploading" | "synced" | "failed" = isRemoteUrl
    ? "synced"
    : pin.uploadStatus || "uploading";

  const rawThumb = pin.thumbnailUrl || pin.imageUrl;
  const thumbnailUrl = getGridThumbnailUrl(rawThumb);

  return {
    id: pin.id,
    imageUrl: pin.imageUrl,
    thumbnailUrl,
    localUri: pin.localUri || (pin.imageUrl?.startsWith("file://") ? pin.imageUrl : undefined),
    fileName,
    mediaType: pin.mediaType || "image",
    duration: pin.duration,
    aspectRatio: pin.aspectRatio || 0.75,
    width,
    height,
    mimeType: pin.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
    fileSize,
    fileSizeFormatted,
    author: pin.author || "You",
    likes: typeof pin.likes === "number" ? pin.likes : 0,
    isLiked: !!pin.isLiked,
    saved: !!pin.saved,
    uploadStatus,
    createdAt: pin.createdAt,
    updatedAt: pin.updatedAt,
  };
}
