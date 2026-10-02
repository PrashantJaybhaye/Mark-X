import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DriveItem } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";
import { FileCategoryIcon } from "./FileCategoryIcon";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (visible) {
      setIsRenaming(false);
      setNewName("");
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
      setIsRenaming(false);
      setNewName("");
      onClose();
      callback?.();
    });
  };

  if (!item) return null;

  const startRename = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setNewName(item.name);
    setIsRenaming(true);
  };

  const handleSaveRename = () => {
    if (newName.trim() && newName.trim() !== item.name) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      onRename(item.id, newName.trim());
    }
    animateClose();
  };

  const handleDelete = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      item.isFolder ? "Delete Folder" : "Delete File",
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            animateClose(() => onDelete(item.id));
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => animateClose()}>
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

        {/* Animated Sheet Container Matched to Gallery Theme */}
        <TouchableWithoutFeedback>
          <Animated.View
            className="bg-[#F5F4F0] rounded-t-[32px] px-5 pt-3 shadow-2xl relative border-t border-black/[0.05]"
            style={{
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, 24) + 16,
            }}
          >
            {/* Top Handlebar */}
            <View className="items-center mb-3">
              <View className="w-10 h-1 rounded-full bg-black/15" />
            </View>

            {/* Header Item Banner Card */}
            <View className="flex-row items-center p-4 rounded-[24px] bg-[#E7E4DC] border border-black/[0.04] mb-3.5">
              <View className="w-12 h-12 rounded-2xl bg-black/[0.06] items-center justify-center mr-3.5">
                <FileCategoryIcon
                  category={item.isFolder ? "folder" : item.category}
                  size={26}
                  uri={item.uri}
                  id={item.id}
                />
              </View>
              <View className="flex-1 pr-2">
                <Text className="text-[16px] font-outfit-bold text-[#1C1C1E]" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-[12.5px] font-outfit-medium text-[#70757A] mt-0.5">
                  {item.isFolder ? "Folder" : item.size ? `${item.size} • ` : ""}{item.updatedAt}
                </Text>
              </View>
            </View>

            {isRenaming ? (
              /* Inline Rename Card View */
              <View className="p-4 rounded-[24px] bg-[#E7E4DC] border border-black/[0.04] mb-2">
                <Text className="text-[13.5px] font-outfit-semibold text-[#1C1C1E] mb-2.5">
                  Rename {item.isFolder ? "folder" : "document"}
                </Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  selectTextOnFocus
                  className="bg-white/80 border border-black/10 rounded-2xl px-4 h-12 text-[14.5px] text-[#1C1C1E] font-outfit mb-3"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveRename}
                />
                <View className="flex-row justify-end space-x-2">
                  <TouchableOpacity
                    onPress={() => setIsRenaming(false)}
                    className="px-4 py-2.5 rounded-xl"
                  >
                    <Text className="text-[14px] font-outfit-medium text-[#70757A]">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveRename}
                    className="px-5 py-2.5 rounded-xl bg-[#1C1C1E]"
                  >
                    <Text className="text-[14px] font-outfit-semibold text-white">Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Grouped Actions Card containing Rename, Share & Delete */
              <View className="rounded-[24px] bg-[#E7E4DC] border border-black/[0.04] overflow-hidden">
                {/* Option 1: Rename */}
                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={startRename}
                  className="flex-row items-center px-4 py-3.5 border-b border-black/[0.05] active:bg-[#DCD8CD]"
                >
                  <View className="w-9 h-9 rounded-xl bg-black/[0.05] items-center justify-center mr-3.5">
                    <Ionicons name="create-sharp" size={19} color="#1C1C1E" />
                  </View>
                  <Text className="text-[14.5px] font-outfit-semibold text-[#1C1C1E] flex-1">
                    Rename
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#A0A5AA" />
                </TouchableOpacity>

                {/* Option 2: Share or Export */}
                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                    animateClose(() => onShare?.(item));
                  }}
                  className="flex-row items-center px-4 py-3.5 border-b border-black/[0.05] active:bg-[#DCD8CD]"
                >
                  <View className="w-9 h-9 rounded-xl bg-black/[0.05] items-center justify-center mr-3.5">
                    <Ionicons name="download-outline" size={19} color="#1C1C1E" />
                  </View>
                  <Text className="text-[14.5px] font-outfit-semibold text-[#1C1C1E] flex-1">
                    Export
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#A0A5AA" />
                </TouchableOpacity>

                {/* Option 3: Delete */}
                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={handleDelete}
                  className="flex-row items-center px-4 py-3.5 active:bg-[#DCD8CD]"
                >
                  <View className="w-9 h-9 rounded-xl bg-red-500/10 items-center justify-center mr-3.5">
                    <Ionicons name="trash-bin-outline" size={19} color="#E53935" />
                  </View>
                  <Text className="text-[14.5px] font-outfit-semibold text-[#E53935] flex-1">
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}


