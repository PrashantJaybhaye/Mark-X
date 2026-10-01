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

export interface DriveItem {
  id: string;
  name: string;
  category: DriveFileCategory;
  size?: string;
  updatedAt: string;
  uri?: string;
  mimeType?: string;
  sharedBy?: string;
  starred?: boolean;
  isFolder?: boolean;
  parentId?: string | null;
}

