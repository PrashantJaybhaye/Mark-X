export interface GalleryPin {
  id: string;
  author?: string;
  authorAvatar?: string;
  imageUrl: string;
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
}
