import type { Ionicons } from "@expo/vector-icons";

export type DriveFileCategory =
  | "folder"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "code"
  | "other";

export interface DriveItem {
  id: string;
  name: string;
  category: DriveFileCategory;
  size?: string;
  updatedAt: string;
  uri?: string;
  mimeType?: string;
  sharedBy?: string;
  isFolder?: boolean;
}
