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
  cloudflareUrl?: string;
  cloudflareKey?: string;
  createdAt?: number;
  uploading?: boolean;
  uploadProgress?: number;
}

export function splitFileName(fileName: string, isFolder?: boolean): { base: string; ext: string } {
  if (isFolder) return { base: fileName, ext: "" };
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return { base: fileName, ext: "" };
  }
  return {
    base: fileName.slice(0, lastDotIndex),
    ext: fileName.slice(lastDotIndex),
  };
}

export function getFileDisplayName(fileName?: string, isFolder?: boolean): string {
  if (!fileName) return "";
  if (isFolder) return fileName;
  return splitFileName(fileName, isFolder).base;
}

export function getKindLabel(item: DriveItem): string {
  if (item.isFolder) return "Folder";
  const ext = item.name.split(".").pop()?.toUpperCase();
  if (ext === "PDF" || item.category === "pdf") return "PDF Document (.pdf)";
  if (ext === "DOC" || ext === "DOCX") return "Word Document (.docx)";
  if (ext === "XLS" || ext === "XLSX") return "Excel Spreadsheet (.xlsx)";
  if (ext === "PPT" || ext === "PPTX") return "PowerPoint Presentation (.pptx)";
  if (ext === "TXT") return "Plain Text Document (.txt)";
  if (item.category === "image") return `Image (${ext || "IMG"})`;
  return item.mimeType || `${item.category.toUpperCase()} File`;
}
