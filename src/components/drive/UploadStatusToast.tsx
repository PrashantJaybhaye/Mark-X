import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { triggerHaptic } from "../../utils/haptics";

export type ToastStatusType =
  | "success"
  | "uploading"
  | "delete"
  | "folder"
  | "star"
  | "rename"
  | "export"
  | "error"
  | "info";

interface UploadStatusToastProps {
  visible: boolean;
  fileName: string;
  detail: string;
  type?: ToastStatusType;
  onClose: () => void;
  bottomInset?: number;
}

function resolveToastIcon(
  type?: ToastStatusType,
  fileName = "",
  detail = ""
): {
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  isLoading?: boolean;
} {
  const combined = `${fileName} ${detail}`.toLowerCase();

  if (type === "delete" || combined.includes("delete") || combined.includes("removed")) {
    return {
      iconName: "trash-outline",
      color: "#FF453A",
      bgColor: "bg-red-500/10",
    };
  }

  if (
    type === "error" ||
    combined.includes("failed") ||
    combined.includes("error") ||
    combined.includes("cannot")
  ) {
    return {
      iconName: "alert-circle-outline",
      color: "#FF453A",
      bgColor: "bg-red-500/10",
    };
  }

  if (
    type === "uploading" ||
    combined.includes("uploading") ||
    combined.includes("preparing")
  ) {
    return {
      iconName: "cloud-upload-outline",
      color: "#1A73E8",
      bgColor: "bg-blue-500/10",
      isLoading: true,
    };
  }

  if (
    type === "folder" ||
    combined.includes("folder created") ||
    combined.includes("folder")
  ) {
    return {
      iconName: "folder-outline",
      color: "#F59E0B",
      bgColor: "bg-amber-500/10",
    };
  }

  if (type === "star" || combined.includes("starred")) {
    const isUnstar = combined.includes("removed");
    return {
      iconName: isUnstar ? "star-outline" : "star",
      color: "#FFB800",
      bgColor: "bg-yellow-500/10",
    };
  }

  if (
    type === "rename" ||
    combined.includes("renamed") ||
    combined.includes("name updated")
  ) {
    return {
      iconName: "create-outline",
      color: "#1A73E8",
      bgColor: "bg-blue-500/10",
    };
  }

  if (type === "export" || combined.includes("export")) {
    return {
      iconName: "share-outline",
      color: "#6366F1",
      bgColor: "bg-indigo-500/10",
    };
  }

  return {
    iconName: "checkmark-circle-outline",
    color: "#1E8E3E",
    bgColor: "bg-green-500/10",
  };
}

export function UploadStatusToast({
  visible,
  fileName,
  detail,
  type,
  onClose,
  bottomInset = 0,
}: UploadStatusToastProps) {
  if (!visible) return null;

  const { iconName, color, bgColor, isLoading } = resolveToastIcon(type, fileName, detail);

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
      <View className="flex-row items-center flex-1 mr-3">
        <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${bgColor}`}>
          {isLoading ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Ionicons name={iconName} size={20} color={color} />
          )}
        </View>

        <View className="flex-1">
          <Text className="text-[13.5px] font-outfit-semibold text-[#1F1F1F]" numberOfLines={1}>
            {fileName || "Task complete"}
          </Text>
          <Text className="text-[11.5px] font-outfit text-[#5F6368] mt-0.5" numberOfLines={1}>
            {detail || 'Saved to "My Drive"'}
          </Text>
        </View>
      </View>

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
