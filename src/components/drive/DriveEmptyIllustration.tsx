import React from "react";
import Svg, { Path, Rect, Circle, Line, G } from "react-native-svg";

interface DriveIllustrationProps {
  width?: number;
  height?: number;
}

export function DriveEmptyIllustration({ width = 240, height = 200 }: DriveIllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 240 200" fill="none">
      {/* Base baseline */}
      <Line
        x1="20"
        y1="175"
        x2="220"
        y2="175"
        stroke="#202124"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Blue document behind folder */}
      <G transform="rotate(-10 65 95)">
        <Rect
          x="40"
          y="60"
          width="60"
          height="75"
          rx="6"
          fill="#4285F4"
          stroke="#202124"
          strokeWidth="2"
        />
        {/* Document lines */}
        <Line x1="48" y1="75" x2="80" y2="75" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="48" y1="85" x2="90" y2="85" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="48" y1="95" x2="75" y2="95" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      </G>

      {/* Folder Back Tab */}
      <Path
        d="M 90 90 L 150 90 L 165 140 L 90 140 Z"
        fill="#374151"
        stroke="#202124"
        strokeWidth="2"
      />

      {/* Green spreadsheet / sheet */}
      <G transform="rotate(8 160 120)">
        <Rect
          x="135"
          y="85"
          width="48"
          height="65"
          rx="5"
          fill="#A7F3D0"
          stroke="#202124"
          strokeWidth="2"
        />
        {/* Green inner cells */}
        <Rect x="140" y="92" width="18" height="12" fill="#10B981" rx="1" />
        <Rect x="160" y="92" width="18" height="12" fill="#059669" rx="1" />
        <Rect x="140" y="106" width="18" height="12" fill="#059669" rx="1" />
        <Rect x="160" y="106" width="18" height="12" fill="#10B981" rx="1" />
      </G>

      {/* Yellow / Amber Notification Bell */}
      <G transform="rotate(22 170 85)">
        {/* Bell Body */}
        <Path
          d="M 160 50 C 160 38 180 38 180 50 C 180 65 198 80 198 86 L 142 86 C 142 80 160 65 160 50 Z"
          fill="#FBBC04"
          stroke="#202124"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Bell Lip */}
        <Rect
          x="138"
          y="85"
          width="64"
          height="6"
          rx="3"
          fill="#F59E0B"
          stroke="#202124"
          strokeWidth="2"
        />
        {/* Bell Clapper */}
        <Circle cx="170" cy="95" r="5" fill="#D97706" stroke="#202124" strokeWidth="2" />
        {/* Top Handle Loop */}
        <Path
          d="M 167 38 C 167 33 173 33 173 38"
          stroke="#202124"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </G>

      {/* Sound / notification lines near bell */}
      <Line x1="202" y1="92" x2="210" y2="92" stroke="#202124" strokeWidth="2" strokeLinecap="round" />
      <Line x1="200" y1="100" x2="208" y2="105" stroke="#202124" strokeWidth="2" strokeLinecap="round" />
      <Line x1="200" y1="84" x2="208" y2="79" stroke="#202124" strokeWidth="2" strokeLinecap="round" />

      {/* Front Folder (Light Blue with angled perspective) */}
      <Path
        d="M 15 105 L 85 105 L 105 115 L 165 115 L 180 175 L 45 175 Z"
        fill="#C2E7FF"
        stroke="#202124"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
