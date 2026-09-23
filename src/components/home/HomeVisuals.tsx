import React from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  RadialGradient,
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
 * Camera Capture Art (Sleek DSLR)
 */
export function CameraCardArt() {
  return (
    <View className="h-16 w-full overflow-hidden rounded-2xl bg-[#F8FAFC] border border-slate-200/80 items-center justify-center">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 160 64"
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          <LinearGradient id="dslrBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#334155" />
            <Stop offset="100%" stopColor="#0F172A" />
          </LinearGradient>
          <LinearGradient id="silverRim" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#E2E8F0" />
            <Stop offset="50%" stopColor="#94A3B8" />
            <Stop offset="100%" stopColor="#475569" />
          </LinearGradient>
          <LinearGradient id="dslrLens" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#1E293B" />
            <Stop offset="100%" stopColor="#020617" />
          </LinearGradient>
          <RadialGradient id="lensCoating" cx="60%" cy="40%" r="50%">
            <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#A855F7" stopOpacity="0.1" />
          </RadialGradient>
        </Defs>

        {/* Drop shadow */}
        <Ellipse cx="80" cy="56" rx="44" ry="4" fill="#94A3B8" fillOpacity="0.15" />

        {/* Camera Body (Sleek minimalist rectangle) */}
        <Rect x="40" y="16" width="80" height="36" rx="4" fill="url(#dslrBody)" />
        
        {/* Top prism bump */}
        <Path d="M66,16 L70,8 L90,8 L94,16 Z" fill="#334155" />

        {/* The iconic Red Dot (Leica style) */}
        <Circle cx="106" cy="24" r="3" fill="#EF4444" />

        {/* Shutter Button */}
        <Rect x="46" y="12" width="10" height="4" rx="1" fill="#CBD5E1" />

        {/* Big Silver Lens Ring */}
        <Circle cx="80" cy="34" r="18" fill="url(#silverRim)" />
        <Circle cx="80" cy="34" r="16" fill="#0F172A" />
        
        {/* Inner Lens Elements */}
        <Circle cx="80" cy="34" r="12" fill="url(#dslrLens)" />
        <Circle cx="80" cy="34" r="12" fill="url(#lensCoating)" />
        
        {/* Glare/Reflection on Lens */}
        <Path d="M72,25 A12,12 0 0,1 87,23" stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
        <Circle cx="80" cy="34" r="4" fill="#020617" />
        <Circle cx="83" cy="31" r="1.5" fill="#FFFFFF" opacity="0.8" />

      </Svg>
    </View>
  );
}

// Removed backward-compatible alias because SecurityCardArt was deleted.
