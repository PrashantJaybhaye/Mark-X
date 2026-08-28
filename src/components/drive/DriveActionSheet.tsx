import React from "react";
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { triggerHaptic } from "../../utils/haptics";

interface DriveActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onUploadFile: () => void;
  onScanDocument: () => void;
  onImportPhoto: () => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
}

export function DriveActionSheet({
  visible,
  onClose,
  onUploadFile,
  onScanDocument,
  onImportPhoto,
  onCreateFolder,
  onCreateNote,
}: DriveActionSheetProps) {
  const insets = useSafeAreaInsets();

  const options = [
    {
      id: "upload",
      title: "Upload File",
      subtitle: "Add documents or archives",
      icon: "cloud-upload-outline" as const,
      onPress: onUploadFile,
      tint: "#0B57D0",
      bg: "#E8F0FE",
    },
    {
      id: "scan",
      title: "Scan Document",
      subtitle: "Capture with device camera",
      icon: "scan-outline" as const,
      onPress: onScanDocument,
      tint: "#188038",
      bg: "#E6F4EA",
    },
    {
      id: "photo",
      title: "Import Photo",
      subtitle: "Upload from library",
      icon: "images-outline" as const,
      onPress: onImportPhoto,
      tint: "#8E24AA",
      bg: "#F3E8FD",
    },
    {
      id: "folder",
      title: "Create Folder",
      subtitle: "Organize files cleanly",
      icon: "folder-outline" as const,
      onPress: onCreateFolder,
      tint: "#F29900",
      bg: "#FEF7E0",
    },
    {
      id: "note",
      title: "Create Note",
      subtitle: "Write a quick encrypted note",
      icon: "create-outline" as const,
      onPress: onCreateNote,
      tint: "#17181A",
      bg: "#F5F7FA",
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/45 justify-end">
          <TouchableWithoutFeedback>
            <View
              className="bg-white rounded-t-[28px] px-5 pt-3 border-t border-[#E6E8EC]"
              style={{ paddingBottom: Math.max(insets.bottom, 20) + 16 }}
            >
              {/* Top Handlebar */}
              <View className="items-center mb-3.5">
                <View className="w-10 h-1 rounded-full bg-[#E6E8EC]" />
              </View>

              <Text className="text-[17px] font-outfit-bold text-[#17181A] mb-3 px-1">
                Add to Mark X Drive
              </Text>

              {/* Action List */}
              <View className="gap-1.5">
                {options.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic();
                      onClose();
                      item.onPress();
                    }}
                    className="flex-row items-center p-2.5 rounded-2xl active:bg-[#F5F7FA]"
                  >
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center mr-3.5"
                      style={{ backgroundColor: item.bg }}
                    >
                      <Ionicons name={item.icon} size={20} color={item.tint} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-outfit-semibold text-[#17181A]">
                        {item.title}
                      </Text>
                      <Text className="text-[12px] font-outfit text-[#6B7078] mt-0.5">
                        {item.subtitle}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B4B8BF" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
