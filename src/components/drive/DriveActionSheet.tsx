import React, { useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { triggerHaptic } from "../../utils/haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface DriveActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onUploadFile: () => void;
  onCreateFolder: () => void;
}

export function DriveActionSheet({
  visible,
  onClose,
  onUploadFile,
  onCreateFolder,
}: DriveActionSheetProps) {
  const insets = useSafeAreaInsets();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible]);

  const animateClose = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      callback?.();
    });
  };

  const options = [
    {
      id: "upload",
      title: "Upload document",
      subtitle: "PDFs, spreadsheets, text files",
      icon: "cloud-upload-outline" as const,
      onPress: onUploadFile,
    },
    {
      id: "folder",
      title: "Create folder",
      subtitle: "Create a new directory for files",
      icon: "folder-outline" as const,
      onPress: onCreateFolder,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={() => animateClose()}
    >
      <View className="flex-1 justify-end">
        {/* Animated Backdrop Fade Overlay */}
        <TouchableWithoutFeedback onPress={() => animateClose()}>
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.45)",
              opacity: backdropOpacity,
            }}
          />
        </TouchableWithoutFeedback>

        {/* Animated Sheet Container Matched to Gallery Tab */}
        <TouchableWithoutFeedback>
          <Animated.View
            className="bg-[#F5F4F0] rounded-t-[32px] px-5 pt-3 shadow-2xl relative border-t border-black/[0.05]"
            style={{
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, 24) + 24,
            }}
          >
            {/* Top Handlebar */}
            <View className="items-center mb-3.5">
              <View className="w-10 h-1 rounded-full bg-black/15" />
            </View>

            {/* Header Title */}
            <Text className="text-[18px] font-outfit-bold text-[#1C1C1E] mb-3 px-1">
              Add to Drive
            </Text>

            {/* Action Items: 2 horizontal icon buttons in a single row */}
            <View className="flex-row gap-3 mt-1 mb-2">
              {options.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                    animateClose(() => item.onPress());
                  }}
                  className="flex-1 items-center justify-center py-6 px-3 rounded-[22px] bg-[#E7E4DC] active:bg-[#DCD8CD]"
                >
                  <View className="mb-1.5 items-center justify-center">
                    <Ionicons name={item.icon} size={26} color="#1C1C1E" />
                  </View>
                  <Text className="text-[13.5px] font-outfit-semibold text-[#1C1C1E] text-center">
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}
