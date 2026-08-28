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
      style={{
        paddingTop: Math.max(topInset, 16) + (Platform.OS === "android" ? 16 : 10),
      }}
    >
      {/* Google Drive Style Floating Search Bar */}
      <View className="flex-row items-center bg-[#EDF2FA] rounded-full px-3.5 h-[52px]">
        {/* Left: Search Icon */}
        <View className="w-8 h-8 items-center justify-center -ml-1 mr-1.5">
          <Ionicons name="search" size={20} color="#444746" />
        </View>

        {/* Center: Search Input */}
        <TextInput
          placeholder="Search in Drive"
          placeholderTextColor="#444746"
          value={search}
          onChangeText={onSearchChange}
          className="flex-1 text-[15px] text-[#1F1F1F] font-outfit py-0"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        {/* Right: Clear button when search query exists */}
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange("")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="p-1.5 -mr-1"
          >
            <Ionicons name="close-circle" size={20} color="#444746" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}



