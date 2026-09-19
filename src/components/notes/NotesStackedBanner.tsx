import React from "react";
import { View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { triggerHaptic } from "../../utils/haptics";
import { NoteItem } from "./NoteItemCard";

interface NotesStackedBannerProps {
  notes?: NoteItem[];
  onPress?: () => void;
  onNotePress?: (note: NoteItem) => void;
}

export function NotesStackedBanner({ notes = [], onPress, onNotePress }: NotesStackedBannerProps) {
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
        {/* Card 3: Back card */}
        <View
          style={{
            position: "absolute",
            right: 0,
            top: 7,
            width: frontCardWidth,
            height: cardHeight,
            backgroundColor: "#D1D5DB",
            borderRadius: 30,
            transform: [{ rotate: "2.4deg" }],
          }}
          className="shadow-sm"
        />

        {/* Card 2: Mid card */}
        <View
          style={{
            position: "absolute",
            right: 12,
            top: 3.5,
            width: frontCardWidth,
            height: cardHeight,
            backgroundColor: "#6B7280",
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
              Capture every idea.
            </Text>
            <Text
              allowFontScaling={false}
              className="text-white/85 text-[14px] leading-[20px]"
              style={{ fontFamily: "Outfit_400Regular" }}
              numberOfLines={2}
            >
              Your notes, quick thoughts & checklists — all in one place.
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
