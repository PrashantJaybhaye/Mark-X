import React from "react";
import { View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { triggerHaptic } from "../../utils/haptics";

interface NotesStackedBannerProps {
  onPress?: () => void;
}

export function NotesStackedBanner({ onPress }: NotesStackedBannerProps) {
  const { width: screenWidth } = useWindowDimensions();

  const handlePress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  // Card dimensions (enlarged for substantial hero presence)
  const containerPadding = 20;
  const availableWidth = screenWidth - containerPadding * 2;
  const frontCardWidth = availableWidth - 24;
  const cardHeight = 180;

  return (
    <View className="w-full px-5 pt-1 pb-4">
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        className="relative w-full justify-center"
        style={{ height: cardHeight + 12 }}
      >
        {/* Card 3: Warm Amber Back Card (Peeking on right) */}
        <View
          style={{
            position: "absolute",
            right: 0,
            top: 7,
            width: frontCardWidth,
            height: cardHeight,
            backgroundColor: "#F6A87C",
            borderRadius: 30,
            transform: [{ rotate: "2.4deg" }],
          }}
          className="shadow-sm"
        />

        {/* Card 2: Mark-X Signature Coral Middle Peeking Card */}
        <View
          style={{
            position: "absolute",
            right: 12,
            top: 3.5,
            width: frontCardWidth,
            height: cardHeight,
            backgroundColor: "#EB5B49",
            borderRadius: 30,
            transform: [{ rotate: "1.2deg" }],
          }}
          className="shadow-sm"
        />

        {/* Card 1: Front Executive Obsidian Card */}
        <View
          style={{
            width: frontCardWidth,
            height: cardHeight,
            backgroundColor: "#1A1718",
            borderRadius: 30,
          }}
          className="p-6 justify-between shadow-xl shadow-black/40 border border-white/10"
        >
          {/* Top Label */}
          <View className="flex-row items-center">
            <Text
              allowFontScaling={false}
              className="text-white/75 text-[12px] tracking-wider uppercase"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Mark Notes
            </Text>
          </View>

          {/* Headline & Snippet */}
          <View className="mt-auto">
            <Text
              allowFontScaling={false}
              className="text-white text-[25px] tracking-tight leading-tight mb-1.5"
              style={{ fontFamily: "Outfit_700Bold" }}
            >
              ideas become reality
            </Text>
            <Text
              allowFontScaling={false}
              className="text-white/85 text-[14px] leading-[20px]"
              style={{ fontFamily: "Outfit_400Regular" }}
              numberOfLines={2}
            >
              End-to-end encrypted notes, quick ideas & checklists synced in real time.
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
