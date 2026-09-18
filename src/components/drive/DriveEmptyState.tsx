import React from "react";
import { View, Text } from "react-native";
import { DriveEmptyIllustration } from "./DriveEmptyIllustration";

export function DriveEmptyState() {
  return (
    <View className="flex-1 w-full items-center justify-center px-6 pt-[44px] pb-[76px]">
      <View className="items-center justify-center mb-6">
        <DriveEmptyIllustration />
      </View>

      <Text
        allowFontScaling={false}
        className="text-[20px] font-outfit-bold text-[#17181A] text-center tracking-tight"
        style={{ fontFamily: "Outfit_700Bold" }}
      >
        A space for what matters
      </Text>

      <Text
        allowFontScaling={false}
        className="text-[14px] font-outfit text-[#6B7078] text-center mt-2 px-5 leading-5 max-w-[300px]"
        style={{ fontFamily: "Outfit_400Regular" }}
      >
        Store, organize, and access your documents and files in one secure place.
      </Text>
    </View>
  );
}
