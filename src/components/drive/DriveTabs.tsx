import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { triggerHaptic } from "../../utils/haptics";

interface DriveTabsProps {
  activeTab: "suggested" | "activity";
  onTabChange: (tab: "suggested" | "activity") => void;
}

export function DriveTabs({ activeTab, onTabChange }: DriveTabsProps) {
  return (
    <View className="flex-row px-5 border-b border-[#E6E8EC] bg-white" style={{ columnGap: 24 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          triggerHaptic();
          onTabChange("suggested");
        }}
        className="pb-2.5 pt-1.5 relative items-center"
      >
        <Text
          className={`text-[14px] ${
            activeTab === "suggested"
              ? "text-[#0B57D0] font-outfit-semibold"
              : "text-[#6B7078] font-outfit-medium"
          }`}
        >
          Suggested
        </Text>
        {activeTab === "suggested" && (
          <View
            className="bg-[#0B57D0] rounded-full"
            style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2.5 }}
          />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          triggerHaptic();
          onTabChange("activity");
        }}
        className="pb-2.5 pt-1.5 relative items-center"
      >
        <Text
          className={`text-[14px] ${
            activeTab === "activity"
              ? "text-[#0B57D0] font-outfit-semibold"
              : "text-[#6B7078] font-outfit-medium"
          }`}
        >
          Activity
        </Text>
        {activeTab === "activity" && (
          <View
            className="bg-[#0B57D0] rounded-full"
            style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2.5 }}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}
