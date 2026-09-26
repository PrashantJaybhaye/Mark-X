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
const DRIVE_DISCS = [
  { y: 40, grad: "discBottomGrad", topFill: "#0EA5E9", innerStroke: "#BAE6FD" },
  { y: 28, grad: "discMiddleGrad", topFill: "#38BDF8", innerStroke: "#E0F2FE" },
  { y: 16, grad: "discTopGrad", topFill: "#7DD3FC", innerStroke: null },
];

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
        <Ellipse cx="80" cy="56" rx="42" ry="6" fill="#64748B" fillOpacity="0.12" />

        {/* Stacked Cylinder Discs */}
        {DRIVE_DISCS.map(({ y, grad, topFill, innerStroke }) => (
          <React.Fragment key={y}>
            <Path
              d={`M44,${y} L44,${y + 8} A36,9 0 0,0 116,${y + 8} L116,${y} Z`}
              fill={`url(#${grad})`}
            />
            <Ellipse cx="80" cy={y} rx="36" ry="8.5" fill={topFill} stroke="#FFFFFF" strokeWidth="0.8" />
            {innerStroke && (
              <Ellipse
                cx="80"
                cy={y}
                rx="26"
                ry="5.5"
                stroke={innerStroke}
                strokeWidth="0.8"
                strokeDasharray="16,8"
                fill="none"
                opacity="0.6"
              />
            )}
          </React.Fragment>
        ))}

        {/* Center Spindle Core */}
        <Ellipse cx="80" cy="16" rx="14" ry="4.5" fill="#0284C7" stroke="#BAE6FD" strokeWidth="1" />
        <Circle cx="80" cy="16" r="3.5" fill="#FFFFFF" />

        {/* Light Surface Glint */}
        <Path d="M52,14 A32,7 0 0,1 92,10" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      </Svg>
    </View>
  );
}

/**
 * Notes / Waves Art
 */
const NOTE_WAVES = [
  { d: "M0,28 C60,14 110,16 160,28 C215,42 260,42 310,24 C350,10 380,12 400,20 L400,64 L0,64 Z", fill: "#EDE9FE" },
  { d: "M0,36 C60,22 110,24 160,36 C215,49 260,48 310,32 C350,20 380,22 400,28 L400,64 L0,64 Z", fill: "#DDD6FE" },
  { d: "M0,45 C60,33 110,35 160,45 C215,57 260,57 310,42 C350,32 380,34 400,40 L400,64 L0,64 Z", fill: "#A78BFA" },
  { d: "M0,54 C60,44 110,45 160,54 C215,64 260,63 310,53 C350,45 380,47 400,51 L400,64 L0,64 Z", fill: "#7C3AED" },
];

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
        {NOTE_WAVES.map((wave, idx) => (
          <Path key={idx} d={wave.d} fill={wave.fill} />
        ))}
      </Svg>
    </View>
  );
}

/**
 * Camera Capture Art — Golden Amber & Honey Polaroid & Lens Composition
 */
export function CameraCardArt() {
  return (
    <View className="h-16 w-full overflow-hidden rounded-2xl bg-[#FFFBEB]">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 160 64"
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          <LinearGradient id="amberBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFFDF5" />
            <Stop offset="100%" stopColor="#FEF3C7" />
          </LinearGradient>

          <LinearGradient id="amberPhotoGrad1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FDE68A" />
            <Stop offset="100%" stopColor="#F59E0B" />
          </LinearGradient>

          <LinearGradient id="amberPhotoGrad2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FBBF24" />
            <Stop offset="100%" stopColor="#D97706" />
          </LinearGradient>

          <LinearGradient id="amberLensRingGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#B45309" />
          </LinearGradient>

          <LinearGradient id="amberLensCoreGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#D97706" />
            <Stop offset="100%" stopColor="#78350F" />
          </LinearGradient>

          <RadialGradient id="amberCenterGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Base Light Background */}
        <Rect x="0" y="0" width="160" height="64" fill="url(#amberBg)" />

        {/* Ambient Center Glow */}
        <Circle cx="80" cy="32" r="32" fill="url(#amberCenterGlow)" />

        {/* Left Tilted Photo Card */}
        <Rect
          x="22"
          y="12"
          width="46"
          height="34"
          rx="6"
          fill="#FFFFFF"
          stroke="#FDE68A"
          strokeWidth="1.2"
          transform="rotate(-11 45 29)"
          opacity="0.95"
        />
        <Rect
          x="26"
          y="16"
          width="38"
          height="22"
          rx="4"
          fill="url(#amberPhotoGrad1)"
          transform="rotate(-11 45 27)"
          opacity="0.8"
        />
        <Circle cx="45" cy="27" r="4" fill="#FEF3C7" opacity="0.8" transform="rotate(-11 45 27)" />

        {/* Right Tilted Photo Card */}
        <Rect
          x="92"
          y="12"
          width="46"
          height="34"
          rx="6"
          fill="#FFFFFF"
          stroke="#FDE68A"
          strokeWidth="1.2"
          transform="rotate(11 115 29)"
          opacity="0.95"
        />
        <Rect
          x="96"
          y="16"
          width="38"
          height="22"
          rx="4"
          fill="url(#amberPhotoGrad2)"
          transform="rotate(11 115 27)"
          opacity="0.8"
        />
        <Circle cx="115" cy="27" r="4" fill="#FDE68A" opacity="0.8" transform="rotate(11 115 27)" />

        {/* Ground Soft Drop Shadow */}
        <Ellipse cx="80" cy="54" rx="26" ry="4" fill="#B45309" opacity="0.14" />

        {/* Center 3D Camera Lens Badge (Pure White & Golden Amber, No Black) */}
        <Circle cx="80" cy="32" r="23" fill="#FFFFFF" stroke="#FDE68A" strokeWidth="1.5" />
        <Circle cx="80" cy="32" r="19" fill="url(#amberLensRingGrad)" />
        <Circle cx="80" cy="32" r="15" fill="url(#amberLensCoreGrad)" />

        {/* Aperture Shutter Blade Accents */}
        <Path d="M72,24 L84,24 L78,32 Z" fill="#FDE68A" opacity="0.65" />
        <Path d="M88,28 L88,40 L80,34 Z" fill="#FBBF24" opacity="0.65" />
        <Path d="M72,36 L84,36 L78,28 Z" fill="#F59E0B" opacity="0.65" />

        {/* Core Optics & Reticle Center */}
        <Circle cx="80" cy="32" r="6.5" fill="#78350F" />
        <Circle cx="80" cy="32" r="3" fill="#FDE68A" />
        <Circle cx="82" cy="30" r="1.3" fill="#FFFFFF" opacity="0.95" />

        {/* Glass Reflection Highlight Arc */}
        <Path d="M69,21 A15,15 0 0,1 91,21" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85" />

        {/* Sparkle / Flash Starburst Accents */}
        <Path d="M128,14 L129.5,18 L133.5,19.5 L129.5,21 L128,25 L126.5,21 L122.5,19.5 L126.5,18 Z" fill="#F59E0B" opacity="0.9" />
        <Path d="M32,42 L33,44 L35,45 L33,46 L32,48 L31,46 L29,45 L31,44 Z" fill="#FBBF24" opacity="0.9" />
      </Svg>
    </View>
  );
}
