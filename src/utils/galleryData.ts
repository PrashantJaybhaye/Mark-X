export interface GalleryPin {
  id: string;
  author?: string;
  authorAvatar?: string;
  imageUrl: string;
  fileName?: string;
  mediaType?: "image" | "video";
  duration?: number;
  aspectRatio: number; // width / height (e.g. 0.65 to 1.3)
  likes: number;
  isLiked?: boolean;
  saved?: boolean;
  uploadStatus?: "uploading" | "synced" | "failed";
  // Rich media metadata
  width?: number;
  height?: number;
  fileSize?: number;
  fileSizeFormatted?: string;
  mimeType?: string;
  createdAt?: any;
  updatedAt?: any;
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Derives or generates a unique time-based file name (e.g. 1726838846565.jpg or 1726838846565.mp4).
 * Millisecond timestamps are always unique.
 */
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

  // 1. If explicit fileName is ALREADY a valid millisecond timestamp (12-14 digits)
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

  // 2. If createdAt timestamp exists, use its unique millisecond time
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

  // 3. If ID contains timestamp digits (e.g. pin-1726838846565), extract them
  const digits = (options.id || "").replace(/\D/g, "");
  if (digits.length >= 12) {
    return `${digits.slice(-13)}${defaultExt}`;
  }

  // 4. Default: Always unique millisecond time
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

  const uploadStatus: "uploading" | "synced" | "failed" =
    pin.uploadStatus ||
    (pin.imageUrl && (pin.imageUrl.startsWith("http://") || pin.imageUrl.startsWith("https://"))
      ? "synced"
      : "uploading");

  return {
    id: pin.id,
    imageUrl: pin.imageUrl,
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

