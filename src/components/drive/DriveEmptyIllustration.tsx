import React from "react";
import Svg, {
  Path,
  Rect,
  Circle,
  G,
  Line,
  Polygon,
} from "react-native-svg";

interface DriveIllustrationProps {
  width?: number;
  height?: number;
}

export function DriveEmptyIllustration({
  width = 230,
  height = 214,
}: DriveIllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="58 116 525 488" fill="none">
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

      <Path
        d="M 173 278 C 173 270 179 264 187 264 L 246 264 C 253 264 259 268 263 275 L 273 286 L 403 286 C 411 286 417 292 417 300 L 417 518 C 417 526 411 532 403 532 L 187 532 C 179 532 173 526 173 518 Z"
        fill="#C8D7C7"
        stroke="#25232A"
        strokeWidth={3}
      />

      <G transform="rotate(-6 225 310)">
        <Rect
          x={182}
          y={248}
          width={98}
          height={125}
          rx={8}
          fill="#4E6EB3"
          stroke="#25232A"
          strokeWidth={2.8}
        />
        <Polygon
          points="262,248 280,266 262,266"
          fill="#2B437B"
          stroke="#25232A"
          strokeWidth={2}
        />
        <Line x1={196} y1={274} x2={248} y2={274} stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />
        <Line x1={196} y1={290} x2={262} y2={290} stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />
        <Line x1={196} y1={306} x2={244} y2={306} stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />
        <Line x1={196} y1={322} x2={256} y2={322} stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />

        <Path
          d="M 206 236 L 206 262 C 206 267 210 271 215 271 C 220 271 224 267 224 262 L 224 231 C 224 224 217 218 210 218 C 202 218 196 224 196 232 L 196 268"
          stroke="#25232A"
          strokeWidth={3.2}
          fill="none"
          strokeLinecap="round"
        />
      </G>

      <G transform="rotate(2 295 310)">
        <Rect
          x={248}
          y={246}
          width={90}
          height={120}
          rx={8}
          fill="#EF6E1D"
          stroke="#25232A"
          strokeWidth={2.8}
        />
        <Circle cx={293} cy={278} r={14} fill="#FBD453" />
        <Path
          d="M 260 314 L 276 296 L 293 310 L 308 294 L 326 314"
          stroke="#FFFFFF"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>

      <G transform="rotate(7 360 320)">
        <Rect
          x={312}
          y={258}
          width={96}
          height={118}
          rx={8}
          fill="#E8F4EC"
          stroke="#25232A"
          strokeWidth={2.8}
        />
        <Rect x={322} y={268} width={76} height={15} rx={3} fill="#1D4D43" />
        <Rect x={322} y={290} width={35} height={12} rx={2} fill="#3D6B58" />
        <Rect x={363} y={290} width={35} height={12} rx={2} fill="#A7D0C0" />
        <Rect x={322} y={308} width={35} height={12} rx={2} fill="#A7D0C0" />
        <Rect x={363} y={308} width={35} height={12} rx={2} fill="#3D6B58" />
        <Rect x={322} y={326} width={35} height={12} rx={2} fill="#3D6B58" />
        <Rect x={363} y={326} width={35} height={12} rx={2} fill="#A7D0C0" />
      </G>

      <Path
        d="M 173 372 C 173 365 179 358 187 358 L 256 358 C 263 358 269 363 273 370 L 284 384 L 405 384 C 412 384 417 389 417 396 L 417 518 C 417 526 411 532 403 532 L 187 532 C 179 532 173 526 173 518 Z"
        fill="#DEE7DC"
        stroke="#25232A"
        strokeWidth={3}
      />

      <Rect
        x={228}
        y={440}
        width={140}
        height={44}
        rx={8}
        fill="#FFFFFF"
        stroke="#25232A"
        strokeWidth={2.4}
      />
      <Rect x={240} y={450} width={26} height={9} rx={4.5} fill="#6A8AC5" />
      <Line x1={274} y1={455} x2={352} y2={455} stroke="#25232A" strokeWidth={5} strokeLinecap="round" />
      <Line x1={240} y1={471} x2={326} y2={471} stroke="#94A3B8" strokeWidth={4} strokeLinecap="round" />

      <Circle cx={390} cy={474} r={15} fill="#E55624" stroke="#25232A" strokeWidth={2.4} />
      <Line x1={383} y1={474} x2={397} y2={474} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
      <Line x1={390} y1={467} x2={390} y2={481} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />

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
