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
