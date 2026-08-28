import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DriveFileCategory, getCategoryIcon } from "../../utils/driveFileTypes";

interface UploadStatusToastProps {
  visible: boolean;
  fileName: string;
  category: DriveFileCategory;
  onClose: () => void;
  bottomInset?: number;
}

export function UploadStatusToast({
  visible,
  fileName,
  category,
  onClose,
  bottomInset = 20,
}: UploadStatusToastProps) {
  const icon = getCategoryIcon(category);

  if (!visible) return null;

  return (
    <View
      className="bg-[#17181A] rounded-2xl px-4 py-3 flex-row items-center justify-between shadow-lg"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: bottomInset + 16,
        elevation: 6,
        zIndex: 50,
      }}
    >
      <View className="flex-row items-center flex-1 mr-2">
        <View className="w-8 h-8 rounded-xl bg-white/10 items-center justify-center mr-3">
          <Ionicons name={icon.name} size={18} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-outfit-semibold text-white" numberOfLines={1}>
            {fileName || "File selected"}
          </Text>
          <Text className="text-[11px] font-outfit text-[#B4B8BF] mt-0.5">
            Ready to upload • Saved locally
          </Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onClose}
        className="p-1.5 rounded-full bg-white/10"
      >
        <Ionicons name="close" size={14} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

