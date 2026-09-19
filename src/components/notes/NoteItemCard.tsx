import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { triggerHaptic } from "../../utils/haptics";

export interface NoteItem {
  id: string;
  title: string;
  body?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  createdAt: string;
  isPinned?: boolean;
}

interface NoteItemCardProps {
  note: NoteItem;
  viewMode?: "grid" | "list";
  onPress?: (note: NoteItem) => void;
  onOptionsPress?: (note: NoteItem) => void;
}

export const NoteItemCard = React.memo(function NoteItemCard({
  note,
  viewMode = "grid",
  onPress,
  onOptionsPress,
}: NoteItemCardProps) {
  const handlePress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(note);
  };

  const handleOptions = (e: any) => {
    e?.stopPropagation?.();
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onOptionsPress?.(note);
  };

  const iconName = note.iconName || "document-text-outline";

  // --- 1. Row / List View Mode (Premium Light Card) ---
  if (viewMode === "list") {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        className="w-full bg-white rounded-[22px] p-4 mb-3 border border-black/[0.05] shadow-xs flex-row items-center justify-between"
      >

        {/* Center: Title, Body, and Timestamp */}
        <View className="flex-1 mr-3 justify-center">
          <View className="flex-row items-center mb-0.5">
            <Text
              allowFontScaling={false}
              className="text-[16px] text-[#111111] tracking-tight leading-tight flex-1"
              style={{ fontFamily: "Outfit_600SemiBold" }}
              numberOfLines={1}
            >
              {note.title}
            </Text>
            {note.isPinned && (
              <Ionicons
                name="bookmark-sharp"
                size={13}
                color="#E5A93C"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>

          {note.body ? (
            <Text
              allowFontScaling={false}
              className="text-[13px] text-[#6B7280] leading-snug mb-1"
              style={{ fontFamily: "Outfit_400Regular" }}
              numberOfLines={1}
            >
              {note.body}
            </Text>
          ) : null}

          <View className="flex-row items-center">
            <Text
              allowFontScaling={false}
              className="text-[11px] text-[#9CA3AF]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              {note.createdAt}
            </Text>
          </View>
        </View>

        {/* Right: Chevron or Action */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOptions}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1"
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // --- 2. Grid Block View Mode (Consistent Premium Light Aesthetic) ---
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      className="w-full bg-white rounded-[24px] p-4 mb-3.5 border border-black/[0.05] shadow-sm shadow-black/[0.03] justify-between min-h-[160px]"
    >

      {/* Middle Content: Clean typography */}
      <View className="flex-1 justify-start">
        <Text
          allowFontScaling={false}
          className="text-[16px] text-[#111111] leading-[22px] tracking-tight mb-1.5"
          style={{ fontFamily: "Outfit_600SemiBold" }}
          numberOfLines={1}
        >
          {note.title}
        </Text>
        {note.body ? (
          <Text
            allowFontScaling={false}
            className="text-[12px] text-[#6B7280] leading-[17px]"
            style={{ fontFamily: "Outfit_400Regular" }}
            numberOfLines={3}
          >
            {note.body}
          </Text>
        ) : null}
      </View>

      {/* Bottom Row: Timestamp and Pin status */}
      <View className="flex-row items-center justify-between pt-3 mt-1 border-t border-black/[0.04]">
        <Text
          allowFontScaling={false}
          className="text-[11px] text-[#9CA3AF]"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          {note.createdAt}
        </Text>
        {note.isPinned && (
          <Ionicons name="bookmark-sharp" size={13} color="#E5A93C" />
        )}
      </View>
    </TouchableOpacity>
  );
});

