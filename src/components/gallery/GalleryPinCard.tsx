import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GalleryPin } from "../../utils/galleryData";
import { triggerHaptic } from "../../utils/haptics";

interface GalleryPinCardProps {
  pin: GalleryPin;
  cardWidth: number;
  onPress: (pin: GalleryPin) => void;
  onOptionsPress: (pin: GalleryPin) => void;
}

export function GalleryPinCard({
  pin,
  cardWidth,
  onPress,
  onOptionsPress,
}: GalleryPinCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!isLoaded) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isLoaded, pulseAnim]);

  // Compute dynamic height based on aspect ratio (e.g. 0.58 -> tall, 1.1 -> wide)
  const imageHeight = Math.min(Math.max(cardWidth / pin.aspectRatio, 120), 320);

  const handleOptions = (e: any) => {
    e?.stopPropagation?.();
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onOptionsPress(pin);
  };

  return (
    <View className="mb-4" style={{ width: cardWidth }}>
      {/* 1. Main Pin Image with Skeleton Loader */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
          onPress(pin);
        }}
        className="w-full bg-[#E5E7EB] rounded-2xl overflow-hidden relative"
        style={{ height: imageHeight }}
      >
        {/* Animated Skeleton Placeholder while image is loading */}
        {!isLoaded && (
          <Animated.View
            className="absolute inset-0 bg-[#D1D5DB] rounded-2xl"
            style={{ opacity: pulseAnim }}
          />
        )}

        <Image
          source={{ uri: pin.imageUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
          onLoad={() => setIsLoaded(true)}
        />
      </TouchableOpacity>

      {/* 2. Pin Sub-Row: Domain / Title snippet + 3 dots menu on the right */}
      <View className="flex-row items-center justify-between mt-1.5 px-0.5 min-h-[22px]">
        {pin.domain || pin.title ? (
          <Text
            className="text-[11px] font-outfit text-[#484848] flex-1 mr-1"
            numberOfLines={1}
          >
            {pin.domain || pin.title}
          </Text>
        ) : (
          <View className="flex-1" />
        )}

        <TouchableOpacity
          activeOpacity={0.6}
          onPress={handleOptions}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-0.5 items-center justify-center"
        >
          <Ionicons name="ellipsis-horizontal" size={15} color="#111111" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
