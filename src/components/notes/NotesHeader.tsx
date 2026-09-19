import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { triggerHaptic } from "../../utils/haptics";

export type NoteViewMode = "grid" | "list";

export interface NotesHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: NoteViewMode;
  onToggleViewMode: () => void;
  onAddNote?: () => void;
  onOptionsPress?: () => void;
}

export function NotesHeader({
  searchQuery,
  onSearchChange,
  viewMode,
  onToggleViewMode,
  onAddNote,
  onOptionsPress,
}: NotesHeaderProps) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const handleToggleSearch = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (isSearchActive) {
      setIsSearchActive(false);
      onSearchChange("");
    } else {
      setIsSearchActive(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 120);
    }
  };

  const handleViewModePress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onToggleViewMode();
  };

  const handleAddPress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onAddNote?.();
  };

  return (
    <View className="w-full">
      {/* Top Header Bar */}
      <View className="flex-row items-center justify-between px-5 pt-6 pb-3">
        {/* Left: Notes Title in Extreme Bold */}
        <View className="justify-center">
          <Text
            allowFontScaling={false}
            className="text-[32px] text-[#111111] tracking-tight leading-tight"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Notes
          </Text>
        </View>

        {/* Right Actions: Neutral Pill */}
        <View className="flex-row items-center bg-[#F0F0F0] border border-black/[0.06] rounded-full px-4 py-2 gap-4">
          {/* Search Toggle */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleToggleSearch}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Ionicons
              name={isSearchActive ? "close" : "search"}
              size={19}
              color="#374151"
            />
          </TouchableOpacity>

          {/* Grid / List Layout Switcher */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleViewModePress}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Ionicons
              name={viewMode === "grid" ? "list-outline" : "grid-outline"}
              size={19}
              color="#374151"
            />
          </TouchableOpacity>

          {/* Add Note Action */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleAddPress}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Ionicons name="add" size={23} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expandable Search Bar */}
      {isSearchActive && (
        <View className="px-5 pt-1 pb-3">
          <View className="flex-row items-center bg-[#F0F0F0] border border-black/[0.06] rounded-full px-4 h-[46px]">
            <Ionicons name="search" size={18} color="#6B7280" />
            <TextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Search notes and ideas..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-[15px] text-[#111111] px-2.5 py-0"
              style={{ fontFamily: "Outfit_400Regular" }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => onSearchChange("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
