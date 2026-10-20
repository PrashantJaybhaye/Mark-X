import React, { memo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import Svg, {
  Path,
  Rect,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
  G,
  Circle,
} from "react-native-svg";
import { DriveFileCategory } from "../../utils/driveFileTypes";

export interface FileCategoryIconProps {
  category: DriveFileCategory;
  fileName?: string;
  size?: number;
  uri?: string;
  id?: string;
}

export const FileCategoryIcon = memo(function FileCategoryIcon({
  category,
  fileName = "",
  size = 28,
  uri,
  id,
}: FileCategoryIconProps) {

  if (category === "image" && uri) {
    return (
      <View
        style={{
          width: size + 4,
          height: size + 4,
          borderRadius: 8,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "#F3F4F6",
        }}
      >
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={id}
        />
      </View>
    );
  }

  if (category === "folder") {
    const width = Math.round(size * 1.15);
    const height = size;
    return (
      <Svg width={width} height={height} viewBox="0 0 38 32" fill="none">
        <Defs>
          <LinearGradient id="folderFront" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FBBF24" />
            <Stop offset="1" stopColor="#F59E0B" />
          </LinearGradient>
          <LinearGradient id="folderBack" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F59E0B" />
            <Stop offset="1" stopColor="#D97706" />
          </LinearGradient>
        </Defs>

        <Path
          d="M 4 5 A 3 3 0 0 1 7 2 H 15 A 2 2 0 0 1 16.6 2.8 L 19 6 H 33 A 3 3 0 0 1 36 9 V 25 A 3 3 0 0 1 33 28 H 5 A 3 3 0 0 1 2 25 V 7 A 2 2 0 0 1 4 5 Z"
          fill="url(#folderBack)"
        />

        <Rect x="7" y="5" width="24" height="12" rx="2" fill="#FFFFFF" fillOpacity={0.9} />

        <Path
          d="M 2 12 A 3 3 0 0 1 5 9 H 33 A 3 3 0 0 1 36 12 V 25 A 3 3 0 0 1 33 28 H 5 A 3 3 0 0 1 2 25 Z"
          fill="url(#folderFront)"
        />
        <Path
          d="M 2 12 A 3 3 0 0 1 5 9 H 33 A 3 3 0 0 1 36 12"
          stroke="#FDE68A"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  const name = fileName.toLowerCase();
  const docWidth = Math.round(size * 0.82);
  const docHeight = size;

  let bodyColor = "#4285F4";
  let foldColor = "#A1C2FA";
  let docType: "docs" | "sheets" | "slides" | "pdf" | "image" | "video" | "audio" | "zip" | "code" | "generic" = "docs";

  if (category === "pdf" || name.endsWith(".pdf")) {
    bodyColor = "#EA4335";
    foldColor = "#F6AEA9";
    docType = "pdf";
  } else if (
    category === "presentation" ||
    name.endsWith(".pptx") ||
    name.endsWith(".ppt") ||
    name.endsWith(".key")
  ) {
    bodyColor = "#FBBC04";
    foldColor = "#FDE293";
    docType = "slides";
  } else if (
    category === "spreadsheet" ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv")
  ) {
    bodyColor = "#0F9D58";
    foldColor = "#81C995";
    docType = "sheets";
  } else if (
    category === "document" ||
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    name.endsWith(".odt")
  ) {
    bodyColor = "#4285F4";
    foldColor = "#A1C2FA";
    docType = "docs";
  } else if (category === "archive" || /\.(zip|rar|7z|tar|gz)$/.test(name)) {
    bodyColor = "#5F6368";
    foldColor = "#BDC1C6";
    docType = "zip";
  } else if (category === "code" || /\.(ts|tsx|js|jsx|json|html|css|py|rs|go|cpp|c|java|kt|swift|sql)$/.test(name)) {
    bodyColor = "#1A73E8";
    foldColor = "#A1C2FA";
    docType = "code";
  } else if (category === "image") {
    bodyColor = "#EA4335";
    foldColor = "#F6AEA9";
    docType = "image";
  } else if (category === "video" || /\.(mp4|mov|mkv|avi|webm)$/.test(name)) {
    bodyColor = "#EA4335";
    foldColor = "#F6AEA9";
    docType = "video";
  } else if (category === "audio" || /\.(mp3|wav|m4a|aac|flac)$/.test(name)) {
    bodyColor = "#EA4335";
    foldColor = "#F6AEA9";
    docType = "audio";
  } else {
    bodyColor = "#5F6368";
    foldColor = "#BDC1C6";
    docType = "generic";
  }

  return (
    <Svg width={docWidth} height={docHeight} viewBox="0 0 28 34" fill="none">
      <Path
        d="M 4 1 A 2.5 2.5 0 0 0 1.5 3.5 V 30.5 A 2.5 2.5 0 0 0 4 33 H 24 A 2.5 2.5 0 0 0 26.5 30.5 V 9 L 18.5 1 H 4 Z"
        fill={bodyColor}
      />

      <Path
        d="M 18.5 1 V 7 A 2 2 0 0 0 20.5 9 H 26.5 Z"
        fill={foldColor}
      />

      {docType === "docs" && (
        <G>
          <Path
            d="M 6.5 12 A 1.8 1.8 0 0 0 5 13.8 V 27.2 A 1.8 1.8 0 0 0 6.8 29 H 21.2 A 1.8 1.8 0 0 0 23 27.2 V 17 L 18 12 H 6.5 Z"
            fill="#FFFFFF"
          />

          <Path
            d="M 18 12 V 15.8 A 1.2 1.2 0 0 0 19.2 17 H 23 Z"
            fill="#E8F0FE"
          />

          <Rect x="7.5" y="17.8" width="11" height="1.6" rx="0.8" fill="#4285F4" />
          <Rect x="7.5" y="21.2" width="11" height="1.6" rx="0.8" fill="#4285F4" />
          <Rect x="7.5" y="24.6" width="7" height="1.6" rx="0.8" fill="#4285F4" />
        </G>
      )}

      {docType === "sheets" && (
        <G>
          <Path
            d="M 6.5 12 A 1.8 1.8 0 0 0 5 13.8 V 27.2 A 1.8 1.8 0 0 0 6.8 29 H 21.2 A 1.8 1.8 0 0 0 23 27.2 V 17 L 18 12 H 6.5 Z"
            fill="#FFFFFF"
          />

          <Path
            d="M 18 12 V 15.8 A 1.2 1.2 0 0 0 19.2 17 H 23 Z"
            fill="#E6F4EA"
          />

          <Rect x="7.5" y="16.5" width="11" height="9.5" rx="1" fill="#FFFFFF" stroke="#0F9D58" strokeWidth="1.1" />
          <Rect x="7.5" y="16.5" width="11" height="3.2" rx="0.8" fill="#0F9D58" opacity={0.2} />
          <Line x1="13" y1="16.5" x2="13" y2="26" stroke="#0F9D58" strokeWidth="1.1" />
          <Line x1="7.5" y1="19.7" x2="18.5" y2="19.7" stroke="#0F9D58" strokeWidth="1.1" />
          <Line x1="7.5" y1="22.8" x2="18.5" y2="22.8" stroke="#0F9D58" strokeWidth="1.1" />
        </G>
      )}

      {docType === "slides" && (
        <G>
          <Path
            d="M 6.5 12 A 1.8 1.8 0 0 0 5 13.8 V 27.2 A 1.8 1.8 0 0 0 6.8 29 H 21.2 A 1.8 1.8 0 0 0 23 27.2 V 17 L 18 12 H 6.5 Z"
            fill="#FFFFFF"
          />

          <Path
            d="M 18 12 V 15.8 A 1.2 1.2 0 0 0 19.2 17 H 23 Z"
            fill="#FEF7E0"
          />

          <Rect x="7.5" y="16.5" width="11" height="8.5" rx="1.2" fill="#FBBC04" />
          <Rect x="8.8" y="17.8" width="8.4" height="5.9" rx="0.6" fill="#FFFFFF" />
          <Rect x="10" y="19.2" width="4.5" height="1.2" rx="0.6" fill="#FBBC04" />
          <Rect x="10" y="21.2" width="6" height="1.2" rx="0.6" fill="#FBBC04" />
        </G>
      )}

      {docType === "pdf" && (
        <G>
          <Path
            d="M 6.5 12 A 1.8 1.8 0 0 0 5 13.8 V 27.2 A 1.8 1.8 0 0 0 6.8 29 H 21.2 A 1.8 1.8 0 0 0 23 27.2 V 17 L 18 12 H 6.5 Z"
            fill="#FFFFFF"
          />

          <Path
            d="M 18 12 V 15.8 A 1.2 1.2 0 0 0 19.2 17 H 23 Z"
            fill="#FEE2E2"
          />

          <Rect x="7.5" y="17.8" width="11" height="1.6" rx="0.8" fill="#EA4335" />
          <Rect x="7.5" y="21.2" width="11" height="1.6" rx="0.8" fill="#EA4335" />
          <Rect x="7.5" y="24.6" width="7" height="1.6" rx="0.8" fill="#EA4335" />
        </G>
      )}

      {docType === "code" && (
        <G>
          <Path
            d="M 6.5 12 A 1.8 1.8 0 0 0 5 13.8 V 27.2 A 1.8 1.8 0 0 0 6.8 29 H 21.2 A 1.8 1.8 0 0 0 23 27.2 V 17 L 18 12 H 6.5 Z"
            fill="#FFFFFF"
          />

          <Path
            d="M 18 12 V 15.8 A 1.2 1.2 0 0 0 19.2 17 H 23 Z"
            fill="#E8F0FE"
          />

          <Path
            d="M 10 18.2 L 8 20.5 L 10 22.8"
            stroke="#1A73E8"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d="M 16 18.2 L 18 20.5 L 16 22.8"
            stroke="#1A73E8"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Line
            x1="14.2"
            y1="17.5"
            x2="11.8"
            y2="23.5"
            stroke="#1A73E8"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </G>
      )}

      {docType === "zip" && (
        <G stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" fill="none">
          <Line x1="14" y1="12" x2="14" y2="25" strokeDasharray="1.5,1.5" />
          <Rect x="12" y="17" width="4" height="4" rx="1" fill="#FFFFFF" />
        </G>
      )}

      {docType === "video" && (
        <G fill="#FFFFFF">
          <Rect x="6" y="13" width="16" height="12" rx="1.5" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
          <Path d="M 12 16 L 17 19 L 12 22 Z" />
        </G>
      )}

      {docType === "audio" && (
        <G fill="#FFFFFF">
          <Circle cx="10" cy="22" r="2" />
          <Circle cx="17" cy="20" r="2" />
          <Path d="M 12 22 V 14 L 19 12 V 20" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
        </G>
      )}

      {docType === "image" && (
        <G stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <Rect x="6" y="13" width="16" height="12" rx="1.5" />
          <Circle cx="10" cy="16.5" r="1.2" fill="#FFFFFF" />
          <Path d="M 8 22 L 12 18 L 15 20.5 L 17 19 L 20 22" />
        </G>
      )}

      {docType === "generic" && (
        <G>
          <Path
            d="M 6.5 12 A 1.8 1.8 0 0 0 5 13.8 V 27.2 A 1.8 1.8 0 0 0 6.8 29 H 21.2 A 1.8 1.8 0 0 0 23 27.2 V 17 L 18 12 H 6.5 Z"
            fill="#FFFFFF"
          />

          <Path
            d="M 18 12 V 15.8 A 1.2 1.2 0 0 0 19.2 17 H 23 Z"
            fill="#F1F3F4"
          />

          <Rect x="7.5" y="17.8" width="11" height="1.6" rx="0.8" fill="#5F6368" />
          <Rect x="7.5" y="21.2" width="11" height="1.6" rx="0.8" fill="#5F6368" />
          <Rect x="7.5" y="24.6" width="7" height="1.6" rx="0.8" fill="#5F6368" />
        </G>
      )}
    </Svg>
  );
});
