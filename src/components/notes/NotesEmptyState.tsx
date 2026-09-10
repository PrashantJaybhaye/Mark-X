import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { triggerHaptic } from "../../utils/haptics";
import { NoteViewMode } from "./NotesHeader";

interface NotesEmptyStateProps {
  searchQuery?: string;
  viewMode?: NoteViewMode;
  columnWidth?: number;
  onClearSearch?: () => void;
  onCreateNote?: () => void;
}

export function NotesEmptyState({
  searchQuery,
  viewMode = "grid",
  columnWidth,
  onClearSearch,
  onCreateNote,
}: NotesEmptyStateProps) {
  const handleCreate = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onCreateNote?.();
  };

  const handleClear = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onClearSearch?.();
  };

  // Search Empty State: Clean, compact Notion search result
  if (searchQuery && searchQuery.trim().length > 0) {
    return (
      <View className="w-full py-6 items-center justify-center">
        <View className="w-9 h-9 rounded-xl bg-white/80 items-center justify-center border border-black/[0.06] mb-2 shadow-2xs">
          <Ionicons name="search-outline" size={16} color="#787774" />
        </View>
        <Text
          allowFontScaling={false}
          className="text-[14px] text-[#37352F] text-center mb-0.5"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          No notes found
        </Text>
        <Text
          allowFontScaling={false}
          className="text-[12px] text-[#9B9A97] text-center max-w-[240px] mb-3"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          No notes matched "{searchQuery}"
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleClear}
          className="px-3.5 py-1.5 bg-black/[0.05] active:bg-black/[0.1] rounded-lg"
        >
          <Text
            allowFontScaling={false}
            className="text-[12px] text-[#37352F]"
            style={{ fontFamily: "Outfit_500Medium" }}
          >
            Clear search
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Notion List Mode: Minimal Dashed Row ---
  if (viewMode === "list") {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleCreate}
        className="w-full bg-white/50 active:bg-white/80 rounded-[22px] p-4 border border-dashed border-[#C8C6C0] flex-row items-center justify-center gap-2 mb-2 min-h-[58px]"
      >
        <Ionicons name="add" size={18} color="#37352F" />
        <Text
          allowFontScaling={false}
          className="text-[14px] text-[#37352F]"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          New note
        </Text>
      </TouchableOpacity>
    );
  }

  // --- Notion Grid Mode: Minimal Ghost Note Card (Gallery / Board Slot) ---
  return (
    <View className="flex-row justify-between w-full">
      {/* Ghost Card Slot 1: Active + New Note */}
      <TouchableOpacity
        activeOpacity={0.72}
        onPress={handleCreate}
        style={columnWidth ? { width: columnWidth } : undefined}
        className="bg-white/55 active:bg-white/85 rounded-[24px] p-4 border border-dashed border-[#C8C6C0] items-center justify-center min-h-[160px] shadow-2xs"
      >
        <View className="w-10 h-10 rounded-full bg-white/90 items-center justify-center border border-black/[0.06] shadow-2xs mb-2.5">
          <Ionicons name="add" size={20} color="#37352F" />
        </View>
        <Text
          allowFontScaling={false}
          className="text-[14px] text-[#37352F] text-center tracking-tight"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          New note
        </Text>
        <Text
          allowFontScaling={false}
          className="text-[11px] text-[#9B9A97] text-center mt-0.5"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          Empty page
        </Text>
      </TouchableOpacity>

      {/* Ghost Card Slot 2: Translucent Outline Guide */}
      <View
        style={columnWidth ? { width: columnWidth } : undefined}
        className="rounded-[24px] border border-dashed border-black/[0.08] items-center justify-center min-h-[160px]"
      />
    </View>
  );
}
