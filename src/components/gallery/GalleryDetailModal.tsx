import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { GalleryPin } from "../../utils/galleryData";
import { triggerHaptic } from "../../utils/haptics";

interface GalleryDetailModalProps {
  pin: GalleryPin | null;
  visible: boolean;
  onClose: () => void;
  onLikeToggle: (pinId: string) => void;
  onSaveToggle: (pinId: string) => void;
}

export function GalleryDetailModal({
  pin,
  visible,
  onClose,
  onLikeToggle,
  onSaveToggle,
}: GalleryDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (!pin) return null;

  const handleShare = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${pin.title || "Check out this pin"}\n${pin.imageUrl}`,
      });
    } catch {
      // ignore
    }
  };

  const handleSave = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onSaveToggle(pin.id);
  };

  // Pinterest preview height
  const previewHeight = Math.min(
    Math.max((windowWidth - 32) / pin.aspectRatio, 240),
    windowHeight * 0.58
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        {/* Dismiss touch backdrop */}
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Pinterest Sheet */}
        <View
          className="bg-white rounded-t-[32px] overflow-hidden max-h-[92%]"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          {/* Header Bar */}
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-[#F0F2F4] items-center justify-center"
            >
              <Ionicons name="close" size={22} color="#111111" />
            </TouchableOpacity>

            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleShare}
                className="w-10 h-10 rounded-full bg-[#F0F2F4] items-center justify-center"
              >
                <Ionicons name="share-outline" size={20} color="#111111" />
              </TouchableOpacity>

              {/* Pinterest Red Save Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSave}
                className={`px-5 py-2.5 rounded-full ${
                  pin.saved ? "bg-[#111111]" : "bg-[#E60023]"
                }`}
              >
                <Text className="text-[14px] font-outfit-bold text-white">
                  {pin.saved ? "Saved" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 }}
          >
            {/* Main Rounded Image */}
            <View
              className="w-full rounded-3xl overflow-hidden bg-[#ECEEEF]"
              style={{ height: previewHeight }}
            >
              <Image
                source={{ uri: pin.imageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            </View>

            {/* Author Row */}
            <View className="flex-row items-center justify-between mt-4 py-2 border-b border-[#F0F2F4]">
              <View className="flex-row items-center flex-1 mr-3">
                {pin.authorAvatar ? (
                  <Image
                    source={{ uri: pin.authorAvatar }}
                    style={{ width: 38, height: 38, borderRadius: 19, marginRight: 10 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="w-9 h-9 rounded-full bg-[#E5E7EB] items-center justify-center mr-2.5">
                    <Ionicons name="person" size={18} color="#6B7280" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-[14px] font-outfit-bold text-[#111111]">
                    {pin.author}
                  </Text>
                  {pin.domain && (
                    <Text className="text-[12px] font-outfit text-[#8E8E93]">
                      {pin.domain}
                    </Text>
                  )}
                </View>
              </View>

              <View className="bg-[#F0F2F4] px-4 py-2 rounded-full">
                <Text className="text-[13px] font-outfit-semibold text-[#111111]">
                  Follow
                </Text>
              </View>
            </View>

            {/* Title & Description */}
            {pin.title && (
              <Text className="text-[20px] font-outfit-bold text-[#111111] mt-3.5 leading-6">
                {pin.title}
              </Text>
            )}

            {pin.description && (
              <Text className="text-[14px] font-outfit text-[#4B5563] mt-2 leading-5">
                {pin.description}
              </Text>
            )}

            {/* Tags */}
            {pin.tags && pin.tags.length > 0 && (
              <View className="mt-4 flex-row flex-wrap gap-2">
                {pin.tags.map((tag) => (
                  <View
                    key={tag}
                    className="bg-[#F0F2F4] px-3.5 py-1.5 rounded-full"
                  >
                    <Text className="text-[12px] font-outfit-medium text-[#111111]">
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
