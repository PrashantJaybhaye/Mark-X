import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { GalleryPin } from "../../utils/galleryData";
import { triggerHaptic } from "../../utils/haptics";

interface GalleryPinOptionsSheetProps {
  pin: GalleryPin | null;
  visible: boolean;
  onClose: () => void;
  onSaveToggle: (pinId: string) => void;
  onHidePin?: (pinId: string) => void;
}

export function GalleryPinOptionsSheet({
  pin,
  visible,
  onClose,
  onSaveToggle,
  onHidePin,
}: GalleryPinOptionsSheetProps) {
  const insets = useSafeAreaInsets();

  if (!pin) return null;

  const handleShare = async () => {
    onClose();
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${pin.title || "Check out this pin on Mark-X Gallery"}\n${pin.imageUrl}`,
      });
    } catch {
      // ignore
    }
  };

  const handleSave = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onSaveToggle(pin.id);
    onClose();
  };

  const handleHide = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onHidePin?.(pin.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          className="bg-white rounded-t-[28px] px-6 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          {/* Handle */}
          <View className="items-center py-2">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>

          <Text className="text-[14px] font-outfit-semibold text-[#111111] mb-3 mt-1">
            Options
          </Text>

          <View className="gap-1">
            {/* Save Pin */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSave}
              className="flex-row items-center py-3.5"
            >
              <View className="w-9 h-9 rounded-full bg-[#F0F2F4] items-center justify-center mr-3.5">
                <Ionicons
                  name={pin.saved ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color={pin.saved ? "#E60023" : "#111111"}
                />
              </View>
              <Text className="text-[15px] font-outfit-medium text-[#111111]">
                {pin.saved ? "Remove from Saved" : "Save Pin"}
              </Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleShare}
              className="flex-row items-center py-3.5"
            >
              <View className="w-9 h-9 rounded-full bg-[#F0F2F4] items-center justify-center mr-3.5">
                <Ionicons name="share-social-outline" size={20} color="#111111" />
              </View>
              <Text className="text-[15px] font-outfit-medium text-[#111111]">
                Share Pin
              </Text>
            </TouchableOpacity>

            {/* Hide */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleHide}
              className="flex-row items-center py-3.5"
            >
              <View className="w-9 h-9 rounded-full bg-[#F0F2F4] items-center justify-center mr-3.5">
                <Ionicons name="eye-off-outline" size={20} color="#111111" />
              </View>
              <Text className="text-[15px] font-outfit-medium text-[#111111]">
                Hide Pin
              </Text>
            </TouchableOpacity>
          </View>

          {/* Close button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            className="mt-3 py-3.5 rounded-full bg-[#F0F2F4] items-center justify-center"
          >
            <Text className="text-[14px] font-outfit-semibold text-[#111111]">
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
