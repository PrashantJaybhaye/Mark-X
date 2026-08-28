import { Ionicons } from "@expo/vector-icons";

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

export function getFileCategory(fileName?: string, mimeType?: string): DriveFileCategory {
  if (!fileName && !mimeType) return "other";
  const name = (fileName || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  if (mime.includes("image") || /\.(jpg|jpeg|png|gif|webp|svg|heic)$/.test(name)) return "image";
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (mime.includes("spreadsheet") || mime.includes("excel") || /\.(xls|xlsx|csv|numbers)$/.test(name)) return "spreadsheet";
  if (mime.includes("presentation") || mime.includes("powerpoint") || /\.(ppt|pptx|key)$/.test(name)) return "presentation";
  if (mime.includes("word") || mime.includes("document") || /\.(doc|docx|pages|txt|rtf|md)$/.test(name)) return "document";
  if (mime.includes("video") || /\.(mp4|mov|mkv|avi|webm)$/.test(name)) return "video";
  if (mime.includes("audio") || /\.(mp3|wav|m4a|aac|flac)$/.test(name)) return "audio";
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return "archive";
  if (/\.(ts|tsx|js|jsx|json|html|css|py|rs|go|cpp|c|java|kt|swift)$/.test(name)) return "code";

  return "other";
}

export function getCategoryIcon(category: DriveFileCategory): {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  switch (category) {
    case "folder":
      return { name: "folder", color: "#0B57D0" };
    case "image":
      return { name: "image", color: "#8E24AA" };
    case "pdf":
      return { name: "document-text", color: "#D93025" };
    case "spreadsheet":
      return { name: "grid", color: "#188038" };
    case "presentation":
      return { name: "easel", color: "#F29900" };
    case "document":
      return { name: "document-text", color: "#0B57D0" };
    case "video":
      return { name: "videocam", color: "#E52592" };
    case "audio":
      return { name: "musical-notes", color: "#FA7B17" };
    case "archive":
      return { name: "archive", color: "#5F6368" };
    case "code":
      return { name: "code-slash", color: "#1A73E8" };
    default:
      return { name: "document-outline", color: "#5F6368" };
  }
}

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

