import React from "react";
import { View, TextInput, Platform, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface DriveHeaderProps {
  search: string;
  onSearchChange: (text: string) => void;
  topInset: number;
}

export function DriveHeader({ search, onSearchChange, topInset }: DriveHeaderProps) {
  return (
    <View
      className="bg-white px-4 pb-3"
      style={{ paddingTop: Math.max(topInset, 16) + (Platform.OS === "android" ? 10 : 4) }}
    >
      <View className="flex-row items-center bg-[#F8F9FA] border border-[#E8EAED] rounded-2xl px-3.5 h-11">
        <Ionicons name="search" size={18} color="#5F6368" style={{ marginRight: 8 }} />

        <TextInput
          placeholder="Search files and folders"
          placeholderTextColor="#80868B"
          value={search}
          onChangeText={onSearchChange}
          className="flex-1 text-[14px] text-[#1F1F1F] font-outfit py-0"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        {search.length > 0 && Platform.OS === "android" && (
          <TouchableOpacity
            onPress={() => onSearchChange("")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="p-1"
          >
            <Ionicons name="close-circle" size={18} color="#80868B" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

