import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { triggerHaptic } from "../../utils/haptics";

export interface NoteItem {
  id: string;
  title: string;
  body?: string;
  category?: string;
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
        {/* Left: Tonal Icon Capsule */}
        <View className="w-11 h-11 rounded-2xl bg-[#F6F7F9] border border-black/[0.03] items-center justify-center mr-3.5">
          <Ionicons name={iconName} size={20} color="#3E140A" />
        </View>

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
                name="pin"
                size={13}
                color="#EB5B49"
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
            {note.category ? (
              <View className="bg-[#F6F7F9] px-2 py-0.5 rounded-full mr-2">
                <Text
                  allowFontScaling={false}
                  className="text-[10px] text-[#4B5563]"
                  style={{ fontFamily: "Outfit_500Medium" }}
                >
                  {note.category}
                </Text>
              </View>
            ) : null}
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
      {/* Top Row: Category tag and subtle floating icon badge */}
      <View className="flex-row items-center justify-between w-full mb-3">
        {note.category ? (
          <View className="bg-[#F6F7F9] px-2.5 py-1 rounded-full border border-black/[0.03]">
            <Text
              allowFontScaling={false}
              className="text-[11px] text-[#4B5563]"
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              {note.category}
            </Text>
          </View>
        ) : (
          <View />
        )}

        <View className="w-8 h-8 rounded-full bg-[#F6F7F9] items-center justify-center border border-black/[0.03]">
          <Ionicons name={iconName} size={15} color="#3E140A" />
        </View>
      </View>

      {/* Middle Content: Clean typography */}
      <View className="flex-1 justify-start">
        <Text
          allowFontScaling={false}
          className="text-[16px] text-[#111111] leading-[22px] tracking-tight mb-1.5"
          style={{ fontFamily: "Outfit_600SemiBold" }}
          numberOfLines={3}
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
          <Ionicons name="pin" size={12} color="#EB5B49" />
        )}
      </View>
    </TouchableOpacity>
  );
});

