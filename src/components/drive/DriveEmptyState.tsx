import React from "react";
import { View, Text } from "react-native";
import { DriveEmptyIllustration } from "./DriveEmptyIllustration";

export function DriveEmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-6 pt-10 pb-16">
      <View className="items-center justify-center mb-6">
        <DriveEmptyIllustration width={220} height={175} />
      </View>

      <Text className="text-[20px] font-outfit-bold text-[#17181A] text-center tracking-tight">
        A place for everything
      </Text>

      <Text className="text-[14px] font-outfit text-[#6B7078] text-center mt-2 px-5 leading-5">
        Upload, organize, and access your files securely from anywhere.
      </Text>
    </View>
  );
}
