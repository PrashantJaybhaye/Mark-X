import React, { useEffect, useRef } from "react";
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
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

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
    <View className="mb-4" style={{ width }}>
      {/* Image Skeleton with Rounded Corners */}
      <Animated.View
        className="w-full bg-[#E5E7EB] rounded-2xl"
        style={{
          height,
          opacity: pulseAnim,
        }}
      />

      {/* Sub-row meta skeleton */}
      <View className="flex-row items-center justify-between mt-2 px-0.5">
        <Animated.View
          className="h-2.5 bg-[#E5E7EB] rounded-md"
          style={{
            width: width * 0.65,
            opacity: pulseAnim,
          }}
        />
        <Animated.View
          className="w-4 h-2.5 bg-[#E5E7EB] rounded-md"
          style={{ opacity: pulseAnim }}
        />
      </View>
    </View>
  );
}

export function GalleryMasonrySkeleton({
  cardWidth,
}: GallerySkeletonProps) {
  const leftHeights = [220, 160, 260];
  const rightHeights = [170, 250, 190];

  return (
    <View className="flex-row w-full justify-between">
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
