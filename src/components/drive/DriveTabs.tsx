import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { triggerHaptic } from "../../utils/haptics";

interface DriveTabsProps {
  activeTab: "suggested" | "activity";
  onTabChange: (tab: "suggested" | "activity") => void;
}

export function DriveTabs({ activeTab, onTabChange }: DriveTabsProps) {
  return (
    <View className="flex-row w-full bg-white border-b border-[#E0E2E6]">
      {/* Suggested Tab */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          triggerHaptic();
          onTabChange("suggested");
        }}
        className="flex-1 items-center justify-center pt-2 pb-3 relative"
      >
        <Text
          className={`text-[14px] ${
            activeTab === "suggested"
              ? "text-[#000000] font-outfit-bold"
              : "text-[#444746] font-outfit-medium"
          }`}
        >
          Suggested
        </Text>
        {activeTab === "suggested" && (
          <View
            className="bg-[#000000] rounded-t-full"
            style={{
              position: "absolute",
              bottom: 0,
              width: 72,
              height: 3,
            }}
          />
        )}
      </TouchableOpacity>

      {/* Activity Tab */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          triggerHaptic();
          onTabChange("activity");
        }}
        className="flex-1 items-center justify-center pt-2 pb-3 relative"
      >
        <Text
          className={`text-[14px] ${
            activeTab === "activity"
              ? "text-[#000000] font-outfit-bold"
              : "text-[#444746] font-outfit-medium"
          }`}
        >
          Activity
        </Text>
        {activeTab === "activity" && (
          <View
            className="bg-[#000000] rounded-t-full"
            style={{
              position: "absolute",
              bottom: 0,
              width: 72,
              height: 3,
            }}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

