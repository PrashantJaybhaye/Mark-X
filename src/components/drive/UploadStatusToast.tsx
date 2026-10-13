import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Text, TouchableOpacity, View } from "react-native";
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

interface ToastVisuals {
  iconName?: keyof typeof Ionicons.glyphMap;
  color: string;
  isSpinner?: boolean;
}

export function getToastVisuals(
  type?: ToastStatusType,
  fileName?: string,
  detail?: string
): ToastVisuals {
  const lowerDetail = (detail || "").toLowerCase();
  const lowerName = (fileName || "").toLowerCase();

  // 1. In-progress upload
  if (type === "uploading" || lowerDetail.includes("uploading") || lowerName.includes("uploading")) {
    return { isSpinner: true, color: "#1A73E8" };
  }

  // 2. Folder operations
  if (type === "folder" || lowerDetail.includes("folder created") || lowerName.startsWith("new folder")) {
    return { iconName: "folder-open-outline", color: "#F59E0B" }; // Amber / Google Drive folder
  }

  // 3. Star toggle
  if (type === "star" || lowerDetail.includes("starred")) {
    if (lowerDetail.includes("removed")) {
      return { iconName: "star-outline", color: "#5F6368" };
    }
    return { iconName: "star", color: "#FBBC04" }; // Google Drive gold star
  }

  // 4. Rename
  if (type === "rename" || lowerName.startsWith("renamed") || lowerDetail.includes("name updated")) {
    return { iconName: "pencil", color: "#1A73E8" }; // Google blue
  }

  // 5. Export / Share
  if (type === "export" || lowerDetail.includes("export") || lowerDetail.includes("attachment")) {
    return { iconName: "share-social", color: "#4F46E5" }; // Indigo
  }

  // 6. Delete
  if (type === "delete" || lowerName.startsWith("deleted") || lowerDetail.includes("removed from drive")) {
    return { iconName: "trash", color: "#D93025" }; // Google red
  }

  // 7. Error
  if (
    type === "error" ||
    lowerDetail.includes("failed") ||
    lowerName.includes("error") ||
    lowerName.includes("cannot")
  ) {
    return { iconName: "alert-circle", color: "#D93025" }; // Google red
  }

  // 8. Info
  if (type === "info") {
    return { iconName: "information-circle", color: "#1A73E8" };
  }

  // 9. Success (Solid checkmark-circle for clear, premium completion UX)
  return { iconName: "checkmark-circle-outline", color: "#1E8E3E" }; // Google green
}

interface UploadStatusToastProps {
  visible: boolean;
  fileName: string;
  detail: string;
  type?: ToastStatusType;
  onClose: () => void;
  bottomInset?: number;
}

export function UploadStatusToast({
  visible,
  fileName,
  detail,
  type = "success",
  onClose,
  bottomInset = 0,
}: UploadStatusToastProps) {
  const [rendered, setRendered] = useState(visible);
  const translateY = useRef(new Animated.Value(70)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const visuals = getToastVisuals(type, fileName, detail);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 70,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setRendered(false);
      });
    }
  }, [visible, translateY, opacity]);

  if (!rendered) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: bottomInset,
        transform: [{ translateY }],
        opacity,
        elevation: 8,
        zIndex: 50,
      }}
      className="bg-white border-t border-[#E5E5EA] rounded-t-2xl px-4 py-2.5 flex-row items-center justify-between shadow-lg shadow-black/10"
    >
      {/* Left: Bare contextual icon / spinner + Text */}
      <View className="flex-row items-center flex-1 mr-3">
        {visuals.isSpinner ? (
          <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="small" color={visuals.color} />
          </View>
        ) : (
          <Ionicons name={visuals.iconName!} size={22} color={visuals.color} />
        )}

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
    </Animated.View>
  );
}
