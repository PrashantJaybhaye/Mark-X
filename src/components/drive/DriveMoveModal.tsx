import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DriveItem, getFileDisplayName } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";
import { FileCategoryIcon } from "./FileCategoryIcon";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface DriveMoveModalProps {
  visible: boolean;
  item: DriveItem | null;
  allItems: DriveItem[];
  onClose: () => void;
  onMove: (itemId: string, targetFolderId: string | null) => void;
}

interface DestinationFolder {
  id: string | null;
  name: string;
  path: string;
  itemCount: number;
  isRoot?: boolean;
}

function getDescendantFolderIds(folderId: string, allFiles: DriveItem[]): Set<string> {
  const descendants = new Set<string>([folderId]);
  let added = true;
  while (added) {
    added = false;
    for (const file of allFiles) {
      if (file.isFolder && file.parentId && descendants.has(file.parentId) && !descendants.has(file.id)) {
        descendants.add(file.id);
        added = true;
      }
    }
  }
  return descendants;
}

function getFolderPath(folderId: string | null, allFiles: DriveItem[]): string {
  if (!folderId) return "Drive";
  const parts: string[] = [];
  let curr: string | null = folderId;
  const visited = new Set<string>();
  while (curr && !visited.has(curr)) {
    visited.add(curr);
    const f = allFiles.find((x) => x.id === curr);
    if (!f) break;
    parts.unshift(f.name);
    curr = f.parentId || null;
  }
  return ["Drive", ...parts].join(" › ");
}

export function DriveMoveModal({
  visible,
  item,
  allItems,
  onClose,
  onMove,
}: DriveMoveModalProps) {
  const insets = useSafeAreaInsets();
  const currentParentId = item?.parentId ?? null;
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentParentId);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible && item) {
      setSelectedFolderId(item.parentId ?? null);
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
  }, [visible, item]);

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

  const destinations: DestinationFolder[] = useMemo(() => {
    if (!item) return [];

    const invalidFolderIds = item.isFolder
      ? getDescendantFolderIds(item.id, allItems)
      : new Set<string>();

    const rootItemCount = allItems.filter((f) => !f.parentId && f.id !== item.id).length;

    const list: DestinationFolder[] = [
      {
        id: null,
        name: "Drive",
        path: "Root Directory",
        itemCount: rootItemCount,
        isRoot: true,
      },
    ];

    const folders = allItems.filter(
      (f) => f.isFolder && f.id !== item.id && !invalidFolderIds.has(f.id)
    );

    folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    for (const folder of folders) {
      const count = allItems.filter((f) => f.parentId === folder.id && f.id !== item.id).length;
      list.push({
        id: folder.id,
        name: folder.name,
        path: getFolderPath(folder.parentId || null, allItems),
        itemCount: count,
      });
    }

    return list;
  }, [item, allItems]);

  const handleSelect = (destId: string | null) => {
    triggerHaptic();
    setSelectedFolderId(destId);
  };

  const isCurrentLocation = selectedFolderId === currentParentId;
  const canMove = !isCurrentLocation;

  const selectedDestination = destinations.find((d) => d.id === selectedFolderId);
  const targetLabel = selectedDestination ? selectedDestination.name : "Selected Location";

  const handleConfirmMove = () => {
    if (!item || !canMove) return;
    triggerHaptic();
    animateClose(() => {
      onMove(item.id, selectedFolderId);
    });
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => animateClose()}
    >
      <View className="flex-1 justify-end">
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

        <Animated.View
          className="bg-[#F5F4F0] rounded-t-[32px] px-5 pt-3 shadow-2xl relative border-t border-black/[0.05]"
          style={{
            transform: [{ translateY: slideAnim }],
            maxHeight: SCREEN_HEIGHT * 0.82,
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          }}
        >
          <View className="items-center mb-3">
            <View className="w-10 h-1 rounded-full bg-black/15" />
          </View>

          <View className="flex-row items-center justify-between mb-3 px-1">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-11 h-11 rounded-2xl bg-[#E7E4DC] items-center justify-center mr-3 border border-black/[0.04]">
                <FileCategoryIcon
                  category={item.isFolder ? "folder" : item.category}
                  size={26}
                  fileName={item.name}
                  uri={item.uri}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[17px] text-[#1C1C1E]"
                  style={{ fontFamily: "Outfit_700Bold" }}
                  numberOfLines={1}
                >
                  Move to
                </Text>
                <Text
                  className="text-[12.5px] text-[#70757A] mt-0.5"
                  style={{ fontFamily: "Outfit_400Regular" }}
                  numberOfLines={1}
                >
                  {getFileDisplayName(item.name, item.isFolder)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => animateClose()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-8 h-8 rounded-full bg-[#E7E4DC] items-center justify-center"
            >
              <Ionicons name="close" size={18} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <View className="px-1 mb-2.5">
            <Text
              className="text-[12px] uppercase text-[#8E8E93]"
              style={{ fontFamily: "Outfit_600SemiBold", letterSpacing: 0.6 }}
            >
              Choose destination
            </Text>
          </View>

          <ScrollView
            style={{ maxHeight: SCREEN_HEIGHT * 0.42 }}
            contentContainerStyle={{ paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="bg-white rounded-[24px] border border-black/10 overflow-hidden">
              {destinations.map((dest, index) => {
                const isSelected = dest.id === selectedFolderId;
                const isCurrent = dest.id === currentParentId;
                const isLast = index === destinations.length - 1;

                return (
                  <TouchableOpacity
                    key={dest.id || "root"}
                    activeOpacity={0.7}
                    onPress={() => handleSelect(dest.id)}
                    className={`flex-row items-center px-4 py-3.5 ${
                      !isLast ? "border-b border-black/[0.06]" : ""
                    } ${isSelected ? "bg-[#007AFF]/[0.06]" : "active:bg-black/[0.03]"}`}
                  >
                    <View
                      className={`w-10 h-10 rounded-xl items-center justify-center mr-3.5 ${
                        dest.isRoot ? "bg-[#007AFF]/10" : "bg-[#FFF8E1]"
                      }`}
                    >
                      {dest.isRoot ? (
                        <Ionicons name="cloud-outline" size={22} color="#007AFF" />
                      ) : (
                        <FileCategoryIcon category="folder" size={24} id={dest.id || undefined} />
                      )}
                    </View>

                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center">
                        <Text
                          className={`text-[15px] mr-1.5 ${
                            isSelected ? "text-[#007AFF]" : "text-[#1C1C1E]"
                          }`}
                          style={{
                            fontFamily: isSelected ? "Outfit_700Bold" : "Outfit_600SemiBold",
                          }}
                          numberOfLines={1}
                        >
                          {dest.name}
                        </Text>
                        {isCurrent && (
                          <View className="px-2 py-0.5 rounded-md bg-black/5">
                            <Text
                              className="text-[10px] text-[#70757A]"
                              style={{ fontFamily: "Outfit_600SemiBold" }}
                            >
                              Current
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className="text-[12px] text-[#70757A] mt-0.5"
                        style={{ fontFamily: "Outfit_400Regular" }}
                        numberOfLines={1}
                      >
                        {dest.path} • {dest.itemCount} {dest.itemCount === 1 ? "item" : "items"}
                      </Text>
                    </View>

                    <View className="w-6 h-6 items-center justify-center">
                      {isSelected ? (
                        <Ionicons name="checkmark" size={21} color="#007AFF" />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View className="pt-3">
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!canMove}
              onPress={handleConfirmMove}
              className={`w-full py-3.5 rounded-[20px] items-center justify-center ${
                canMove ? "bg-[#1C1C1E] active:bg-black" : "bg-[#DCD8CD]"
              }`}
            >
              <Text
                className={`text-[15px] ${canMove ? "text-white" : "text-[#8E8E93]"}`}
                style={{ fontFamily: "Outfit_700Bold" }}
              >
                {canMove ? `Move to "${targetLabel}"` : "Already in this location"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
