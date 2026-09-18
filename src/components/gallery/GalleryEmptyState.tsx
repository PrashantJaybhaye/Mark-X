import React from "react";
import { View, Text } from "react-native";
import Svg, {
  Path,
  Rect,
  Circle,
  Defs,
  ClipPath,
  G,
  Line,
  Polygon,
} from "react-native-svg";

interface GalleryEmptyStateProps {
  cardWidth?: number;
  onAddPhoto?: () => void;
}

function GalleryIllustration() {
  return (
    <Svg width={230} height={214} viewBox="58 116 525 488" fill="none">
      <Defs>
        <ClipPath id="mountainPhotoClip">
          <Rect x={194} y={287} width={202} height={190} rx={4} />
        </ClipPath>
      </Defs>

      <Path
        d="M 115 179 C 115 215 97 239 84 239 C 97 239 115 263 115 299 C 115 263 133 239 146 239 C 133 239 115 215 115 179 Z"
        fill="#FDD13A"
      />

      <Line
        x1={198}
        y1={230}
        x2={230}
        y2={202}
        stroke="#FDD13A"
        strokeWidth={14}
        strokeLinecap="round"
      />

      <Line
        x1={86}
        y1={352}
        x2={122}
        y2={340}
        stroke="#EF6E1D"
        strokeWidth={15}
        strokeLinecap="round"
      />

      <Line
        x1={274}
        y1={236}
        x2={296}
        y2={255}
        stroke="#6A8AC5"
        strokeWidth={12}
        strokeLinecap="round"
      />

      <Path
        d="M 284 152 C 284 186 337 186 337 152"
        stroke="#E55624"
        strokeWidth={16}
        strokeLinecap="round"
        fill="none"
      />

      <Line
        x1={358}
        y1={222}
        x2={385}
        y2={206}
        stroke="#6A8AC5"
        strokeWidth={14}
        strokeLinecap="round"
      />

      <Line
        x1={454}
        y1={230}
        x2={486}
        y2={256}
        stroke="#EF6E1D"
        strokeWidth={14}
        strokeLinecap="round"
      />

      <G transform="translate(444 161)">
        <Line x1={-22} y1={0} x2={22} y2={0} stroke="#FDD13A" strokeWidth={12} strokeLinecap="round" />
        <Line x1={-11} y1={-19} x2={11} y2={19} stroke="#FDD13A" strokeWidth={12} strokeLinecap="round" />
        <Line x1={11} y1={-19} x2={-11} y2={19} stroke="#FDD13A" strokeWidth={12} strokeLinecap="round" />
      </G>

      <Path
        d="M 488 359 C 488 397 469 423 457 423 C 469 423 488 449 488 487 C 488 449 507 423 519 423 C 507 423 488 397 488 359 Z"
        fill="#FDD13A"
      />
      <Rect x={484} y={327} width={11} height={15} rx={3} fill="#FDD13A" />
      <Rect x={481} y={506} width={10} height={14} rx={3} fill="#FDD13A" />
      <Rect x={432} y={419} width={8} height={10} rx={2} fill="#FDD13A" />
      <Rect x={536} y={422} width={22} height={11} rx={3} fill="#FDD13A" />

      <Rect
        x={200}
        y={320}
        width={255}
        height={264}
        rx={14}
        fill="#DAE5D9"
      />

      <Rect
        x={192}
        y={284}
        width={259}
        height={283}
        rx={14}
        fill="#25232A"
      />

      <Rect
        x={173}
        y={264}
        width={244}
        height={268}
        rx={14}
        fill="#DEE7DC"
      />

      <Rect
        x={194}
        y={287}
        width={202}
        height={190}
        rx={4}
        fill="#FFFFFF"
      />

      <G clipPath="url(#mountainPhotoClip)">
        <Rect x={194} y={287} width={202} height={190} fill="#FFFFFF" />

        <Circle cx={341} cy={336} r={19} fill="#FBD453" />

        <Path
          d="M 194 402 L 240 353 L 322 414 L 322 477 L 194 477 Z"
          fill="#1D4D43"
        />
        <Path
          d="M 240 353 L 284 394 L 274 406 L 235 380 Z"
          fill="#3D6B58"
        />

        <Path
          d="M 312 410 L 376 378 L 396 388 L 396 477 L 312 477 Z"
          fill="#255348"
        />
        <Path
          d="M 376 378 L 396 388 L 396 406 L 368 392 Z"
          fill="#3D6B5A"
        />

        <Path
          d="M 194 424 C 234 400 318 406 396 394 L 396 477 L 194 477 Z"
          fill="#366555"
        />
        <Path
          d="M 194 446 C 242 422 308 430 396 414 L 396 477 L 194 477 Z"
          fill="#224C41"
        />
        <Path
          d="M 216 477 C 260 448 332 444 396 436 L 396 477 Z"
          fill="#3F6958"
        />
        <Path
          d="M 320 440 C 342 452 364 446 396 450 L 396 462 C 362 458 338 464 314 450 Z"
          fill="#4A7763"
        />
      </G>

      <Path
        d="M 235 520 L 255 510 L 275 518 L 298 508 L 370 504"
        stroke="#FFFFFF"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.95}
      />

      <G>
        <Polygon
          points="229,398 239,424 215,536 185,523 158,563 121,551 114,518 153,531 175,501 206,514"
          fill="#292F49"
        />

        <Polygon
          points="226,393 116,470 137,483 116,516 152,528 174,498 204,510"
          fill="#FDD552"
          stroke="#292F49"
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

export function GalleryEmptyState(_props: GalleryEmptyStateProps) {
  return (
    <View className="flex-1 w-full items-center justify-center px-6 pt-6 pb-24">
      <View className="items-center justify-center mb-6">
        <GalleryIllustration />
      </View>

      <Text
        allowFontScaling={false}
        className="text-[20px] font-outfit-bold text-[#17181A] text-center tracking-tight"
        style={{ fontFamily: "Outfit_700Bold" }}
      >
        A canvas for your vision
      </Text>

      <Text
        allowFontScaling={false}
        className="text-[14px] font-outfit text-[#6B7078] text-center mt-2 px-5 leading-5 max-w-[300px]"
        style={{ fontFamily: "Outfit_400Regular" }}
      >
        Save, organize, and explore your photos and visual inspirations in one place.
      </Text>
    </View>
  );
}
