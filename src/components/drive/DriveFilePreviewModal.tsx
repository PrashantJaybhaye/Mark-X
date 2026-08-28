import React from "react";
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { DriveItem, getCategoryIcon } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";

interface DriveFilePreviewModalProps {
  visible: boolean;
  item: DriveItem | null;
  onClose: () => void;
  onOptionsPress?: (item: DriveItem) => void;
}

export function DriveFilePreviewModal({
  visible,
  item,
  onClose,
  onOptionsPress,
}: DriveFilePreviewModalProps) {
  const insets = useSafeAreaInsets();

  if (!item) return null;

  const iconConfig = getCategoryIcon(item.category);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/60 justify-center items-center px-5">
          <TouchableWithoutFeedback>
            <View className="w-full bg-white rounded-3xl overflow-hidden p-5 shadow-2xl max-w-[360px]">
              {/* Header Bar */}
              <View className="flex-row items-center justify-between pb-3 border-b border-[#F0F2F5] mb-4">
                <View className="flex-row items-center flex-1 mr-2">
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center mr-2.5"
                    style={{ backgroundColor: `${iconConfig.color}15` }}
                  >
                    <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
                  </View>
                  <Text className="text-[15px] font-outfit-bold text-[#1F1F1F] flex-1" numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="p-1 rounded-full bg-[#F0F2F5]"
                >
                  <Ionicons name="close" size={18} color="#5F6368" />
                </TouchableOpacity>
              </View>

              {/* Media Preview or Document Icon Box */}
              {item.category === "image" && item.uri ? (
                <View className="w-full h-56 rounded-2xl overflow-hidden bg-[#F8F9FA] mb-4 border border-[#E8EAED]">
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                  />
                </View>
              ) : (
                <View className="w-full py-8 rounded-2xl bg-[#F8F9FA] items-center justify-center mb-4 border border-[#E8EAED]">
                  <Ionicons name={iconConfig.name} size={48} color={iconConfig.color} />
                  <Text className="text-[13px] font-outfit text-[#70757A] mt-2">
                    {item.isFolder ? "Folder ready for files" : "File stored securely"}
                  </Text>
                </View>
              )}

              {/* Metadata Details */}
              <View className="bg-[#F8F9FA] rounded-2xl p-3.5 mb-4">
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-[12px] font-outfit text-[#70757A]">Type</Text>
                  <Text className="text-[12px] font-outfit-semibold text-[#1F1F1F] capitalize">
                    {item.category}
                  </Text>
                </View>
                {item.size && (
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-[12px] font-outfit text-[#70757A]">Size</Text>
                    <Text className="text-[12px] font-outfit-semibold text-[#1F1F1F]">
                      {item.size}
                    </Text>
                  </View>
                )}
                <View className="flex-row justify-between">
                  <Text className="text-[12px] font-outfit text-[#70757A]">Modified</Text>
                  <Text className="text-[12px] font-outfit-semibold text-[#1F1F1F]">
                    {item.updatedAt}
                  </Text>
                </View>
              </View>

              {/* Bottom Actions */}
              <View className="flex-row space-x-2.5">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic();
                    onClose();
                    onOptionsPress?.(item);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-[#F0F2F5] items-center justify-center flex-row"
                >
                  <Ionicons name="ellipsis-horizontal" size={16} color="#1F1F1F" style={{ marginRight: 6 }} />
                  <Text className="text-[14px] font-outfit-semibold text-[#1F1F1F]">More Options</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onClose}
                  className="flex-1 py-3 rounded-2xl bg-[#0B57D0] items-center justify-center"
                >
                  <Text className="text-[14px] font-outfit-semibold text-white">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
