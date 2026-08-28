import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface StorageHeroCardProps {
  usedStorage: string;
  onManageStorage?: () => void;
  onUploadFile: () => void;
  onAddPhoto: () => void;
}

export function StorageHeroCard({
  usedStorage,
  onManageStorage,
  onUploadFile,
  onAddPhoto,
}: StorageHeroCardProps) {
  return (
    <View className="w-full bg-white rounded-[28px] p-6 mb-3.5 border border-black/[0.04] shadow-sm">
      {/* Card Header */}
      <View className="flex-row items-center justify-between mb-1">
        <Text
          allowFontScaling={false}
          className="text-[15px] text-[#111111]"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Cloud Storage
        </Text>
        <TouchableOpacity
          activeOpacity={0.65}
          className="flex-row items-center"
          onPress={onManageStorage}
        >
          <Text
            allowFontScaling={false}
            className="text-[13px] text-[#8E8E93] mr-0.5"
            style={{ fontFamily: "Outfit_500Medium" }}
          >
            Manage Storage
          </Text>
          <Ionicons name="chevron-forward" size={13} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* Storage Figure */}
      <View className="flex-row items-baseline my-3">
        <Text
          allowFontScaling={false}
          className="text-[52px] text-[#111111] tracking-tight mr-2 leading-[56px]"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          {usedStorage}
        </Text>
        <Text
          allowFontScaling={false}
          className="text-2xl text-[#8E8E93]"
          style={{ fontFamily: "Outfit_500Medium" }}
        >
          GB
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="flex-row items-center justify-between mt-3 gap-3">
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onUploadFile}
          className="flex-1 h-[48px] rounded-full bg-[#F0F2F4] items-center justify-center"
        >
          <Text
            allowFontScaling={false}
            className="text-[15px] text-[#111111]"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Upload File
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onAddPhoto}
          className="flex-1 h-[48px] rounded-full bg-[#F0F2F4] items-center justify-center"
        >
          <Text
            allowFontScaling={false}
            className="text-[15px] text-[#111111]"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Add Photo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
