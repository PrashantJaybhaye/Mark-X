import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { GalleryPin } from "../../utils/galleryData";
import { triggerHaptic } from "../../utils/haptics";

interface GalleryPinCardProps {
  pin: GalleryPin;
  cardWidth: number;
  onPress: (pin: GalleryPin) => void;
  onOptionsPress: (pin: GalleryPin) => void;
}

export const GalleryPinCard = React.memo(function GalleryPinCard({
  pin,
  cardWidth,
  onPress,
  onOptionsPress,
}: GalleryPinCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [pulseAnim] = useState(() => new Animated.Value(0.35));
  const spinAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (pin.uploadStatus === "uploading") {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    }
  }, [pin.uploadStatus, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Compute dynamic height based on aspect ratio (e.g. 0.58 -> tall, 1.1 -> wide)
  const imageHeight = Math.min(Math.max(cardWidth / pin.aspectRatio, 120), 320);

  const handleOptions = (e: any) => {
    e?.stopPropagation?.();
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onOptionsPress(pin);
  };

  const isUploading = pin.uploadStatus === "uploading";
  const isFailed = pin.uploadStatus === "failed";

  return (
    <View className="mb-2" style={{ width: cardWidth }}>
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

        {/* Upload Status Indicator: Shown only while uploading or on failure */}
        {isUploading ? (
          <View
            style={{ backgroundColor: "rgba(0,0,0,0.65)", borderColor: "rgba(255,255,255,0.25)", borderWidth: 1 }}
            className="absolute top-2.5 left-2.5 px-2 py-1 rounded-full flex-row items-center gap-1.5 shadow-md backdrop-blur-md"
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="sync" size={11} color="#FFFFFF" />
            </Animated.View>
            <Text className="text-[9px] font-outfit-bold text-white tracking-tight">
              Syncing
            </Text>
          </View>
        ) : isFailed ? (
          <View className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md w-6 h-6 rounded-full items-center justify-center border border-white/30 shadow-md">
            <Ionicons name="alert" size={11} color="#FFFFFF" />
          </View>
        ) : null}

        {/* Video Indicator Pill (Top-Right) */}
        {pin.mediaType === "video" && (
          <View className="absolute top-2.5 right-2.5 bg-black/60 px-2 py-1 rounded-full flex-row items-center gap-1">
            <Ionicons name="play" size={10} color="#FFFFFF" />
            {pin.duration ? (
              <Text className="text-[10px] font-outfit text-white">
                {Math.floor(pin.duration / 60)}:{String(Math.floor(pin.duration % 60)).padStart(2, "0")}
              </Text>
            ) : null}
          </View>
        )}
      </TouchableOpacity>

      {/* 2. Pin Sub-Row: Options menu action */}
      <View className="flex-row items-center justify-end mt-1 px-1 min-h-[20px]">
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={handleOptions}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-0.5 items-center justify-center"
        >
          <Ionicons name="ellipsis-horizontal" size={15} color="#484848" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

