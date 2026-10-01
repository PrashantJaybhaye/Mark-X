import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { triggerHaptic } from "../../utils/haptics";

interface UploadStatusToastProps {
  visible: boolean;
  fileName: string;
  category?: any;
  detail: string;
  onClose: () => void;
  bottomInset?: number;
}

export function UploadStatusToast({
  visible,
  fileName,
  detail,
  onClose,
  bottomInset = 0,
}: UploadStatusToastProps) {
  if (!visible) return null;

  return (
    <View
      className="bg-white border-t border-[#E5E5EA] rounded-t-2xl px-4 py-2.5 flex-row items-center justify-between"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: bottomInset,
        elevation: 6,
        zIndex: 50,
      }}
    >
      {/* Left: Green checkmark in circle */}
      <View className="flex-row items-center flex-1 mr-3">
        <Ionicons name="checkmark-circle-outline" size={22} color="#1E8E3E" />
        <View className="flex-1 ml-3">
          <Text className="text-[13.5px] font-outfit-semibold text-[#1F1F1F]" numberOfLines={1}>
            {fileName || "1 upload complete"}
          </Text>
          <Text className="text-[11.5px] font-outfit text-[#5F6368] mt-0.5" numberOfLines={1}>
            {detail || 'Saved to "My Drive"'}
          </Text>
        </View>
      </View>

      {/* Right: Close X + Chevron Up */}
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            triggerHaptic();
            onClose();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={20} color="#444746" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => triggerHaptic()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-up" size={20} color="#444746" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

