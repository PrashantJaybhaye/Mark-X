import React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";

interface MarkXLogoProps extends SvgProps {
  width?: number | string;
  height?: number | string;
  color?: string;
}

export function MarkXLogo({
  width = 125,
  height = 16,
  color = "#111111",
  ...props
}: MarkXLogoProps) {
  return (
    <Svg
      viewBox="0 0 1896 242"
      width={width}
      height={height}
      fill="none"
      {...props}
    >
      <Path
        d="M 600.0,211.0 L 556.0,145.0 L 551.0,140.0 L 501.0,212.0 L 600.0,212.0 Z M 1665.0,182.0 L 1616.0,137.0 L 1614.0,137.0 L 1504.0,225.0 L 1491.0,237.0 L 1601.0,237.0 L 1659.0,189.0 Z M 1158.0,136.0 L 1268.0,237.0 L 1364.0,237.0 L 1252.0,136.0 Z M 1714.0,58.0 L 1768.0,105.0 L 1891.0,4.0 L 1773.0,4.0 L 1714.0,56.0 Z M 1494.0,4.0 L 1620.0,107.0 L 1770.0,237.0 L 1878.0,237.0 L 1610.0,4.0 Z M 1390.0,4.0 L 1281.0,4.0 L 1142.0,121.0 L 1247.0,121.0 Z M 1068.0,4.0 L 1067.0,237.0 L 1140.0,237.0 L 1140.0,4.0 Z M 674.0,4.0 L 713.0,56.0 L 975.0,57.0 L 974.0,87.0 L 744.0,87.0 L 744.0,237.0 L 813.0,237.0 L 813.0,152.0 L 861.0,150.0 L 809.0,97.0 L 829.0,95.0 L 968.0,235.0 L 1049.0,235.0 L 966.0,146.0 L 1026.0,144.0 L 1040.0,130.0 L 1040.0,35.0 L 1010.0,4.0 Z M 4.0,5.0 L 5.0,237.0 L 76.0,236.0 L 77.0,83.0 L 186.0,225.0 L 297.0,84.0 L 298.0,237.0 L 443.0,237.0 L 552.0,83.0 L 658.0,237.0 L 736.0,236.0 L 582.0,6.0 L 519.0,7.0 L 371.0,235.0 L 369.0,4.0 L 280.0,4.0 L 187.0,122.0 L 97.0,4.0 Z"
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  );
}
