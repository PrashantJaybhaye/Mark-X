import React from "react";
import { View, TextInput, Platform, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { triggerHaptic } from "../../utils/haptics";

export type DriveTabType = "drive" | "folders";

interface DriveHeaderProps {
  search: string;
  onSearchChange: (text: string) => void;
  activeTab?: DriveTabType;
  onTabChange?: (tab: DriveTabType) => void;
  sortOrder?: "asc" | "desc";
  onToggleSort?: () => void;
  viewMode?: "list" | "grid";
  onToggleViewMode?: () => void;
  topInset: number;
}

export function DriveHeader({
  search,
  onSearchChange,
  activeTab = "drive",
  onTabChange,
  sortOrder = "asc",
  onToggleSort,
  viewMode = "list",
  onToggleViewMode,
  topInset,
}: DriveHeaderProps) {
  return (
    <View className="bg-white border-b border-[#E6E8EC]">
      {/* 1. Top Safe Container + Redesigned Floating Search Bar */}
      <View
        className="px-4 pb-2.5"
        style={{
          paddingTop: Math.max(topInset, 16) + (Platform.OS === "android" ? 18 : 12),
        }}
      >
        <View className="flex-row items-center bg-[#F0F2F5] border border-[#E2E8F0] rounded-full px-4 h-[48px]">
          {/* Left: Search Icon */}
          <Ionicons name="search" size={19} color="#5F6368" />

          {/* Center: Search Input */}
          <TextInput
            placeholder="Search files & folders..."
            placeholderTextColor="#70757A"
            value={search}
            onChangeText={onSearchChange}
            className="flex-1 text-[15px] text-[#1F1F1F] px-2.5 py-0"
            style={{ fontFamily: "Outfit_400Regular" }}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />

          {/* Right: Clear button when search query exists */}
          {search.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic();
                onSearchChange("");
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="p-1 rounded-full"
            >
              <Ionicons name="close-circle" size={18} color="#70757A" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Tabs Switcher Row: "Drive" | "Folders" + Sort & Layout Controls */}
      <View className="flex-row items-center justify-between px-4 pt-1">
        {/* Left: Drive & Folders Tabs */}
        <View className="flex-row items-center gap-6">
          {/* Tab 1: My Drive */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic();
              onTabChange?.("drive");
            }}
            className="items-center py-2"
          >
            <Text
              className={`text-[15px] ${
                activeTab === "drive"
                  ? "text-[#0B57D0] font-outfit-semibold"
                  : "text-[#5F6368] font-outfit-medium"
              }`}
            >
              My Drive
            </Text>
            {activeTab === "drive" && (
              <View className="h-[3px] w-full bg-[#0B57D0] rounded-t-full mt-1.5" />
            )}
          </TouchableOpacity>

          {/* Tab 2: Folders */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic();
              onTabChange?.("folders");
            }}
            className="items-center py-2"
          >
            <Text
              className={`text-[15px] ${
                activeTab === "folders"
                  ? "text-[#0B57D0] font-outfit-semibold"
                  : "text-[#5F6368] font-outfit-medium"
              }`}
            >
              Folders
            </Text>
            {activeTab === "folders" && (
              <View className="h-[3px] w-full bg-[#0B57D0] rounded-t-full mt-1.5" />
            )}
          </TouchableOpacity>
        </View>

        {/* Right: Sort & Grid/List View Mode Controls */}
        <View className="flex-row items-center pb-1 gap-1.5">
          {/* Sort Order Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic();
              onToggleSort?.();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            className="p-1.5 rounded-full"
          >
            <Ionicons
              name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
              size={18}
              color="#444746"
            />
          </TouchableOpacity>

          {/* Grid / List Layout Switcher Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic();
              onToggleViewMode?.();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            className="p-1.5 rounded-full"
          >
            <Ionicons
              name={viewMode === "grid" ? "list-outline" : "grid-outline"}
              size={19}
              color="#444746"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
