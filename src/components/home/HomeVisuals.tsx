import React from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

/**
 * Gallery / Photos Art — Panoramic Landscape View
 */
export function GalleryCardArt() {
  return (
    <View className="h-16 w-full overflow-hidden rounded-2xl bg-[#FFF1F2] border border-rose-100/70">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 320 64"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%" }}
      >
        <Defs>
          <LinearGradient id="gallerySkyGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FECDD3" />
            <Stop offset="50%" stopColor="#FB7185" />
            <Stop offset="100%" stopColor="#E11D48" />
          </LinearGradient>

          <LinearGradient id="gallerySunGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FEF08A" />
            <Stop offset="100%" stopColor="#F59E0B" />
          </LinearGradient>

          <LinearGradient id="galleryMtnBack" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FDA4AF" />
            <Stop offset="100%" stopColor="#E11D48" />
          </LinearGradient>

          <LinearGradient id="galleryMtnFront" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#BE123C" />
            <Stop offset="100%" stopColor="#881337" />
          </LinearGradient>
        </Defs>

        {/* Ambient Background */}
        <Rect x="0" y="0" width="320" height="64" fill="#FFF1F2" />

        {/* Left Tilted Photo Card */}
        <Rect
          x="28"
          y="12"
          width="68"
          height="46"
          rx="8"
          fill="#FFFFFF"
          stroke="#FFE4E6"
          strokeWidth="1.2"
          transform="rotate(-6 62 35)"
          opacity="0.85"
        />
        <Rect
          x="33"
          y="16"
          width="58"
          height="28"
          rx="5"
          fill="#FECDD3"
          transform="rotate(-6 62 30)"
          opacity="0.7"
        />

        {/* Right Tilted Photo Card */}
        <Rect
          x="224"
          y="12"
          width="68"
          height="46"
          rx="8"
          fill="#FFFFFF"
          stroke="#FFE4E6"
          strokeWidth="1.2"
          transform="rotate(6 258 35)"
          opacity="0.85"
        />
        <Rect
          x="229"
          y="16"
          width="58"
          height="28"
          rx="5"
          fill="#FDA4AF"
          transform="rotate(6 258 30)"
          opacity="0.7"
        />

        {/* Center Panoramic Frame */}
        <Rect
          x="75"
          y="6"
          width="170"
          height="52"
          rx="10"
          fill="#FFFFFF"
          stroke="#FFE4E6"
          strokeWidth="1.5"
        />

        {/* Inner Scenery Viewport */}
        <Rect
          x="81"
          y="11"
          width="158"
          height="35"
          rx="6"
          fill="url(#gallerySkyGrad)"
        />

        {/* Golden Sun */}
        <Circle cx="135" cy="20" r="7" fill="url(#gallerySunGrad)" />

        {/* Mountain Silhouette - Back Ridge */}
        <Path
          d="M81,38 L115,24 L142,32 L170,22 L205,34 L239,26 L239,46 L81,46 Z"
          fill="url(#galleryMtnBack)"
          opacity="0.75"
        />

        {/* Mountain Silhouette - Front Ridge */}
        <Path
          d="M81,46 L100,32 L132,41 L162,28 L195,38 L222,30 L239,37 L239,46 Z"
          fill="url(#galleryMtnFront)"
        />

        {/* Diagonal Gloss Highlight */}
        <Path
          d="M82,12 L125,12 L98,46 L82,46 Z"
          fill="#FFFFFF"
          opacity="0.22"
        />

        {/* Polaroid Bar Accents */}
        <Circle cx="152" cy="51" r="2" fill="#FDA4AF" />
        <Rect
          x="160"
          y="50"
          width="22"
          height="2.5"
          rx="1.2"
          fill="#F43F5E"
          opacity="0.3"
        />
      </Svg>
    </View>
  );
}

/**
 * Document Drive / Storage Cylinder Art
 */
export function DriveCardArt() {
  return (
    <View className="h-16 w-full overflow-hidden rounded-2xl bg-[#F0F9FF] border border-sky-100/60 items-center justify-center">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 160 64"
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          <LinearGradient id="discBottomGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0369A1" />
            <Stop offset="100%" stopColor="#075985" />
          </LinearGradient>
          <LinearGradient id="discMiddleGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0284C7" />
            <Stop offset="100%" stopColor="#0369A1" />
          </LinearGradient>
          <LinearGradient id="discTopGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="100%" stopColor="#0284C7" />
          </LinearGradient>
        </Defs>

        {/* Ground Drop Shadow */}
        <Ellipse
          cx="80"
          cy="56"
          rx="42"
          ry="6"
          fill="#64748B"
          fillOpacity="0.12"
        />

        {/* Bottom Cylinder Disc */}
        <Path
          d="M44,40 L44,48 A36,9 0 0,0 116,48 L116,40 Z"
          fill="url(#discBottomGrad)"
        />
        <Ellipse
          cx="80"
          cy="40"
          rx="36"
          ry="8.5"
          fill="#0EA5E9"
          stroke="#E0F2FE"
          strokeWidth="0.8"
        />
        <Ellipse
          cx="80"
          cy="40"
          rx="26"
          ry="5.5"
          stroke="#BAE6FD"
          strokeWidth="0.8"
          strokeDasharray="16,8"
          fill="none"
          opacity="0.6"
        />

        {/* Middle Cylinder Disc */}
        <Path
          d="M44,28 L44,36 A36,9 0 0,0 116,36 L116,28 Z"
          fill="url(#discMiddleGrad)"
        />
        <Ellipse
          cx="80"
          cy="28"
          rx="36"
          ry="8.5"
          fill="#38BDF8"
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />
        <Ellipse
          cx="80"
          cy="28"
          rx="26"
          ry="5.5"
          stroke="#E0F2FE"
          strokeWidth="0.8"
          strokeDasharray="16,8"
          fill="none"
          opacity="0.6"
        />

        {/* Top Cylinder Disc */}
        <Path
          d="M44,16 L44,24 A36,9 0 0,0 116,24 L116,16 Z"
          fill="url(#discTopGrad)"
        />
        <Ellipse
          cx="80"
          cy="16"
          rx="36"
          ry="8.5"
          fill="#7DD3FC"
          stroke="#FFFFFF"
          strokeWidth="1"
        />

        {/* Center Spindle Core */}
        <Ellipse
          cx="80"
          cy="16"
          rx="14"
          ry="4.5"
          fill="#0284C7"
          stroke="#BAE6FD"
          strokeWidth="1"
        />
        <Circle cx="80" cy="16" r="3.5" fill="#FFFFFF" />

        {/* Light Surface Glint */}
        <Path
          d="M52,14 A32,7 0 0,1 92,10"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
      </Svg>
    </View>
  );
}

/**
 * Notes / Waves Art
 */
export function NotesCardArt() {
  return (
    <View className="h-16 w-full overflow-hidden rounded-2xl bg-[#F8F7FC] border border-violet-100/50">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 64"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%" }}
      >
        <Path
          d="M0,28 C60,14 110,16 160,28 C215,42 260,42 310,24 C350,10 380,12 400,20 L400,64 L0,64 Z"
          fill="#EDE9FE"
        />
        <Path
          d="M0,36 C60,22 110,24 160,36 C215,49 260,48 310,32 C350,20 380,22 400,28 L400,64 L0,64 Z"
          fill="#DDD6FE"
        />
        <Path
          d="M0,45 C60,33 110,35 160,45 C215,57 260,57 310,42 C350,32 380,34 400,40 L400,64 L0,64 Z"
          fill="#A78BFA"
        />
        <Path
          d="M0,54 C60,44 110,45 160,54 C215,64 260,63 310,53 C350,45 380,47 400,51 L400,64 L0,64 Z"
          fill="#7C3AED"
        />
      </Svg>
    </View>
  );
}

/**
 * Reminders / Tasks & Deadlines Art
 */
export function RemindersCardArt() {
  return (
    <View className="h-16 w-full overflow-hidden rounded-2xl bg-[#FFFBEB] border border-amber-100/70 items-center justify-center">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 160 64"
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          <LinearGradient id="reminderCardGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#FFFBEB" />
          </LinearGradient>

          <LinearGradient id="reminderBellGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FBBF24" />
            <Stop offset="100%" stopColor="#D97706" />
          </LinearGradient>

          <LinearGradient id="checkActiveGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#10B981" />
            <Stop offset="100%" stopColor="#059669" />
          </LinearGradient>
        </Defs>

        {/* Ground Drop Shadow */}
        <Ellipse
          cx="80"
          cy="56"
          rx="46"
          ry="6"
          fill="#78350F"
          fillOpacity="0.08"
        />

        {/* Back Reminder Card */}
        <Rect
          x="38"
          y="10"
          width="84"
          height="45"
          rx="8"
          fill="#FEF3C7"
          stroke="#FDE68A"
          strokeWidth="1.2"
          transform="rotate(-4 80 32)"
        />

        {/* Main Front Reminder Card */}
        <Rect
          x="36"
          y="8"
          width="88"
          height="46"
          rx="8"
          fill="url(#reminderCardGrad)"
          stroke="#FDE68A"
          strokeWidth="1.2"
        />

        {/* Task Item 1 - Completed Checkmark */}
        <Circle cx="49" cy="20" r="5" fill="url(#checkActiveGrad)" />
        <Path
          d="M46.5,20 L48.2,21.8 L51.5,18.2"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Rect
          x="58"
          y="19"
          width="34"
          height="2.5"
          rx="1.2"
          fill="#9CA3AF"
          opacity="0.6"
        />

        {/* Task Item 2 - Pending Circle */}
        <Circle
          cx="49"
          cy="32"
          r="5"
          fill="#FEF3C7"
          stroke="#F59E0B"
          strokeWidth="1.2"
        />
        <Rect x="58" y="31" width="46" height="2.5" rx="1.2" fill="#4B5563" />

        {/* Task Item 3 - Subtle Line */}
        <Circle
          cx="49"
          cy="44"
          r="5"
          fill="#FEF3C7"
          stroke="#D1D5DB"
          strokeWidth="1"
        />
        <Rect
          x="58"
          y="43"
          width="28"
          height="2.5"
          rx="1.2"
          fill="#9CA3AF"
          opacity="0.5"
        />

        {/* Top-Right Glowing Bell / Alert Badge */}
        <Circle cx="112" cy="14" r="8.5" fill="url(#reminderBellGrad)" />
        {/* Bell Vector Icon */}
        <Path
          d="M109,15 C109,12 115,12 115,15 L116.5,16.5 L107.5,16.5 L109,15 Z"
          fill="#FFFFFF"
        />
        <Circle cx="112" cy="17.5" r="1" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

/**
 * Personal Cloud / Document Sheets Art (Legacy)
 */
export function CloudCardArt() {
  return (
    <View className="h-16 w-full overflow-hidden rounded-2xl bg-amber-50/80 relative items-center justify-center border border-amber-100/50">
      {/* Back Layer Sheet */}
      <View
        className="absolute w-[56px] h-[40px] rounded-lg bg-amber-700 border border-amber-900/10"
        style={{
          transform: [{ rotate: "-12deg" }, { translateX: -6 }],
          shadowColor: "#92400E",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <View className="absolute top-2 left-2 w-6 h-[3px] rounded-full bg-amber-400/50" />
        <View className="absolute top-4 left-2 w-8 h-[2px] rounded-full bg-amber-300/40" />
      </View>

      {/* Middle Layer Sheet */}
      <View
        className="absolute w-[56px] h-[40px] rounded-lg bg-amber-500 border border-amber-700/10"
        style={{
          transform: [{ rotate: "-5deg" }, { translateX: -2 }],
          shadowColor: "#92400E",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
          elevation: 3,
        }}
      >
        <View className="absolute top-2 left-2 w-7 h-[3px] rounded-full bg-white/35" />
        <View className="absolute top-4 left-2 w-9 h-[2px] rounded-full bg-white/25" />
        <View className="absolute top-6 left-2 w-5 h-[2px] rounded-full bg-white/20" />
      </View>

      {/* Front Layer Sheet */}
      <View
        className="absolute w-[56px] h-[40px] rounded-lg bg-amber-400 border border-amber-500/20"
        style={{
          transform: [{ rotate: "5deg" }, { translateX: 4 }],
          shadowColor: "#78350F",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.18,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        {/* Document Header Indicator */}
        <View className="absolute top-[7px] left-[7px] right-[7px] flex-row items-center justify-between">
          <View className="w-5 h-[3px] rounded-full bg-white/90" />
          <View className="w-2 h-2 rounded-full bg-white/50" />
        </View>

        {/* Content Line Markers */}
        <View className="absolute top-[16px] left-[7px] w-[38px] h-[2px] rounded-full bg-white/65" />
        <View className="absolute top-[21px] left-[7px] w-[32px] h-[2px] rounded-full bg-white/50" />
        <View className="absolute top-[26px] left-[7px] w-[20px] h-[2px] rounded-full bg-white/45" />

        {/* Bottom Accent */}
        <View className="absolute bottom-[5px] left-[7px] w-[10px] h-[3px] rounded-full bg-amber-600/50" />
      </View>
    </View>
  );
}
