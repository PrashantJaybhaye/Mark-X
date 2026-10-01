import React, { memo } from "react";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { DriveFileCategory } from "../../utils/driveFileTypes";

interface FileCategoryIconProps {
  category: DriveFileCategory;
  size?: number;
  uri?: string;
  id?: string;
}

export const FileCategoryIcon = memo(function FileCategoryIcon({
  category,
  size = 26,
  uri,
  id,
}: FileCategoryIconProps) {
  if (category === "image" && uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size + 6, height: size + 6, borderRadius: 6 }}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={id}
      />
    );
  }

  switch (category) {
    case "folder":
      return (
        <Ionicons name="folder" size={size + 2} color="#5F6368" />
      );

    case "document":
      // Google Docs Blue Document
      return (
        <MaterialCommunityIcons name="file-document" size={size + 4} color="#1A73E8" />
      );

    case "spreadsheet":
      // Google Sheets Green Grid
      return (
        <MaterialCommunityIcons name="file-table" size={size + 4} color="#188038" />
      );

    case "presentation":
      // Google Slides Yellow Presentation
      return (
        <MaterialCommunityIcons name="presentation-play" size={size + 2} color="#F4B400" />
      );

    case "pdf":
      // PDF Red Document Box
      return (
        <MaterialCommunityIcons name="file-pdf-box" size={size + 4} color="#D93025" />
      );

    case "image":
      // Photos Red Image Box
      return (
        <MaterialCommunityIcons name="file-image" size={size + 4} color="#EA4335" />
      );

    case "video":
      // Video Purple Play Box
      return (
        <MaterialCommunityIcons name="file-video" size={size + 4} color="#9333EA" />
      );

    case "audio":
      // Audio Orange Note
      return (
        <MaterialCommunityIcons name="file-music" size={size + 4} color="#FA7B17" />
      );

    case "archive":
      // Forms / Survey / Zip Purple Form Box
      return (
        <MaterialCommunityIcons name="clipboard-check" size={size + 2} color="#7C3AED" />
      );

    case "code":
      // Code File
      return (
        <MaterialCommunityIcons name="file-code" size={size + 4} color="#1A73E8" />
      );

    default:
      return (
        <MaterialCommunityIcons name="file-outline" size={size + 2} color="#5F6368" />
      );
  }
});
