import React, { useEffect, useState } from "react";
import { View, Animated } from "react-native";

interface GallerySkeletonProps {
  cardWidth: number;
  heights?: number[];
}

export function GallerySkeletonCard({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const [pulseAnim] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View className="mb-2" style={{ width }}>
      {/* Image Skeleton with Rounded Corners */}
      <Animated.View
        className="w-full bg-[#E5E7EB] rounded-2xl"
        style={{
          height,
          opacity: pulseAnim,
        }}
      />
    </View>
  );
}

export function GalleryMasonrySkeleton({
  cardWidth,
}: GallerySkeletonProps) {
  const leftHeights = [220, 160, 260];
  const rightHeights = [170, 250, 190];

  return (
    <View className="flex-row w-full" style={{ gap: 6 }}>
      <View style={{ width: cardWidth }}>
        {leftHeights.map((h, i) => (
          <GallerySkeletonCard key={`l-${i}`} width={cardWidth} height={h} />
        ))}
      </View>
      <View style={{ width: cardWidth }}>
        {rightHeights.map((h, i) => (
          <GallerySkeletonCard key={`r-${i}`} width={cardWidth} height={h} />
        ))}
      </View>
    </View>
  );
}
