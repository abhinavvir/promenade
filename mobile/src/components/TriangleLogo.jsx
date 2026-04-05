import React from "react";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

// Minimal triangle inspired by the Promenade logo pyramid
export default function TriangleLogo({ size = 32, color, gradientColors }) {
  const w = size;
  const h = size * 0.9;

  if (gradientColors) {
    return (
      <Svg width={w} height={h} viewBox="0 0 100 90">
        <Defs>
          <LinearGradient id="triGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradientColors[0]} />
            <Stop offset="1" stopColor={gradientColors[1]} />
          </LinearGradient>
        </Defs>
        <Path
          d="M50 5 L95 85 L5 85 Z"
          fill="none"
          stroke="url(#triGrad)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={w} height={h} viewBox="0 0 100 90">
      <Path
        d="M50 5 L95 85 L5 85 Z"
        fill="none"
        stroke={color || "#1B2838"}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
