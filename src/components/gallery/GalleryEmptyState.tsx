import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { triggerHaptic } from "../../utils/haptics";

interface GalleryEmptyStateProps {
  cardWidth?: number;
  onAddPhoto: () => void;
}

export function GalleryEmptyState({ onAddPhoto }: GalleryEmptyStateProps) {
  const handlePress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onAddPhoto();
  };

  return (
    <View className="flex-1 w-full items-center justify-center py-20 px-6">
      {/* Apple Photos Frosted Glyph Container with Sparkle Accent */}
      <View className="relative mb-4">
        <View className="w-18 h-18 rounded-[24px] bg-[#F2F2F7] items-center justify-center border border-black/[0.04] shadow-xs">
          <Ionicons name="images-outline" size={32} color="#8E8E93" />
        </View>
        <View className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white items-center justify-center border border-black/[0.06] shadow-xs">
          <Ionicons name="sparkles" size={12} color="#F59E0B" />
        </View>
      </View>

      {/* Apple Photos Headline */}
      <Text
        allowFontScaling={false}
        className="text-[21px] text-[#111111] text-center tracking-tight mb-1.5"
        style={{ fontFamily: "Outfit_600SemiBold" }}
      >
        No Photos or Videos
      </Text>

      {/* Apple Photos Secondary Subtitle */}
      <Text
        allowFontScaling={false}
        className="text-[14px] text-[#8E8E93] text-center max-w-[260px] leading-5 mb-6"
        style={{ fontFamily: "Outfit_400Regular" }}
      >
        Photos and videos you add will appear here.
      </Text>

      {/* Sleek Apple Action Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        className="flex-row items-center bg-[#111111] active:bg-[#2C2C2E] px-6 py-3 rounded-full shadow-sm gap-2"
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text
          allowFontScaling={false}
          className="text-[14px] text-white tracking-wide"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Add Photos
        </Text>
      </TouchableOpacity>
    </View>
  );
}
