import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { DriveItem, getCategoryIcon } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";

interface DriveFileOptionsSheetProps {
  visible: boolean;
  item: DriveItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onShare?: (item: DriveItem) => void;
}

export function DriveFileOptionsSheet({
  visible,
  item,
  onClose,
  onDelete,
  onRename,
  onShare,
}: DriveFileOptionsSheetProps) {
  const insets = useSafeAreaInsets();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  if (!item) return null;

  const iconConfig = getCategoryIcon(item.category);

  const startRename = () => {
    setNewName(item.name);
    setIsRenaming(true);
  };

  const handleSaveRename = () => {
    if (newName.trim() && newName.trim() !== item.name) {
      onRename(item.id, newName.trim());
    }
    setIsRenaming(false);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      item.isFolder ? "Delete Folder" : "Delete File",
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            onDelete(item.id);
            onClose();
          },
        },
      ]
    );
  };

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

              {/* Item Summary Header */}
              <View className="flex-row items-center pb-3.5 mb-2 border-b border-[#F0F2F5]">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${iconConfig.color}15` }}
                >
                  <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
                </View>
                <View className="flex-1 pr-2">
                  <Text className="text-[15px] font-outfit-bold text-[#1F1F1F]" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-[12px] font-outfit text-[#70757A] mt-0.5">
                    {item.size ? `${item.size} • ` : ""}{item.updatedAt}
                  </Text>
                </View>
              </View>

              {isRenaming ? (
                /* Rename Input View */
                <View className="py-2">
                  <Text className="text-[13px] font-outfit-medium text-[#70757A] mb-2">
                    Rename item
                  </Text>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    autoFocus
                    selectTextOnFocus
                    className="bg-[#F8F9FA] border border-[#0B57D0] rounded-xl px-3.5 h-11 text-[14px] text-[#1F1F1F] font-outfit mb-3"
                    returnKeyType="done"
                    onSubmitEditing={handleSaveRename}
                  />
                  <View className="flex-row justify-end space-x-2">
                    <TouchableOpacity
                      onPress={() => setIsRenaming(false)}
                      className="px-4 py-2 rounded-xl"
                    >
                      <Text className="text-[14px] font-outfit-medium text-[#70757A]">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveRename}
                      className="px-4 py-2 rounded-xl bg-[#0B57D0]"
                    >
                      <Text className="text-[14px] font-outfit-semibold text-white">Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Standard Action Options */
                <View className="gap-1">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic();
                      startRename();
                    }}
                    className="flex-row items-center p-3 rounded-2xl active:bg-[#F5F7FA]"
                  >
                    <Ionicons name="pencil-outline" size={20} color="#444746" style={{ marginRight: 14 }} />
                    <Text className="text-[14px] font-outfit-medium text-[#1F1F1F]">Rename</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic();
                      onClose();
                      onShare?.(item);
                    }}
                    className="flex-row items-center p-3 rounded-2xl active:bg-[#F5F7FA]"
                  >
                    <Ionicons name="share-social-outline" size={20} color="#444746" style={{ marginRight: 14 }} />
                    <Text className="text-[14px] font-outfit-medium text-[#1F1F1F]">Share or Export</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleDelete}
                    className="flex-row items-center p-3 rounded-2xl active:bg-[#FEECEB]"
                  >
                    <Ionicons name="trash-outline" size={20} color="#D93025" style={{ marginRight: 14 }} />
                    <Text className="text-[14px] font-outfit-semibold text-[#D93025]">Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
