import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { DriveItem } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";
import { FileCategoryIcon } from "./FileCategoryIcon";

interface DriveFileItemProps {
  item: DriveItem;
  viewMode?: "list" | "grid";
  childCount?: number;
  onPress?: (item: DriveItem) => void;
  onOptionsPress?: (item: DriveItem) => void;
}

function DriveFileItemComponent({
  item,
  viewMode = "list",
  childCount,
  onPress,
  onOptionsPress,
}: DriveFileItemProps) {
  const handleRowPress = useCallback(() => {
    triggerHaptic();
    onPress?.(item);
  }, [item, onPress]);

  const handleOptions = useCallback(() => {
    triggerHaptic();
    onOptionsPress?.(item);
  }, [item, onOptionsPress]);

  // ==================== GRID VIEW MODE ====================
  if (viewMode === "grid") {
    if (item.isFolder) {
      return (
        <View className="flex-1 m-1.5 bg-[#F8F9FA] border border-[#E8EAED] rounded-2xl p-3 h-[140px] justify-between shadow-xs">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleRowPress}
            className="flex-1 items-center justify-center pt-2"
          >
            <View className="w-16 h-16 rounded-2xl bg-[#F1F3F4] items-center justify-center">
              <FileCategoryIcon category="folder" size={38} />
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center justify-between pt-2 border-t border-[#EBECEF]">
            <Text
              className="flex-1 text-[13px] font-outfit-semibold text-[#1F1F1F] mr-1"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={handleOptions}
              className="p-1"
            >
              <Ionicons name="ellipsis-horizontal" size={16} color="#70757A" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View className="flex-1 m-1.5 bg-white border border-[#EBECEF] rounded-2xl overflow-hidden h-[145px] shadow-xs">
        {/* Upper Preview Thumbnail Box */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleRowPress}
          className="h-[95px] bg-[#F1F3F4] items-center justify-center overflow-hidden relative"
        >
          {item.category === "image" && item.uri ? (
            <Image
              source={{ uri: item.uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={item.id}
            />
          ) : (
            <View className="w-12 h-12 rounded-xl bg-[#F1F3F4] items-center justify-center">
              <FileCategoryIcon category={item.category} size={28} id={item.id} />
            </View>
          )}
        </TouchableOpacity>

        {/* Lower Info Bar */}
        <View className="flex-row items-center justify-between px-2.5 py-2 bg-white flex-1 border-t border-[#F0F2F5]">
          <View className="flex-row items-center flex-1 mr-1">
            <FileCategoryIcon category={item.category} size={15} id={item.id} />
            <Text
              className="text-[12px] font-outfit-semibold text-[#1F1F1F] flex-1 ml-1.5"
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </View>

          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={handleOptions}
            className="p-1"
          >
            <Ionicons name="ellipsis-horizontal" size={16} color="#70757A" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==================== LIST VIEW MODE ====================
  const itemCountText =
    item.isFolder && childCount !== undefined
      ? `${childCount} ${childCount === 1 ? "item" : "items"}`
      : null;

  return (
    <View className="flex-row items-center justify-between py-3 px-1">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleRowPress}
        className="flex-1 flex-row items-center pr-2"
      >
        {/* Category Icon / Thumbnail */}
        <View className="w-9 h-9 items-center justify-center mr-3.5">
          <FileCategoryIcon
            category={item.isFolder ? "folder" : item.category}
            size={26}
            uri={item.uri}
            id={item.id}
          />
        </View>

        {/* File / Folder Metadata */}
        <View className="flex-1">
          <Text className="text-[15px] font-outfit-medium text-[#1F1F1F]" numberOfLines={1}>
            {item.name}
          </Text>
          <View className="flex-row items-center mt-0.5">
            {item.starred && (
              <Ionicons name="star" size={13} color="#5F6368" style={{ marginRight: 4 }} />
            )}
            {item.sharedBy && (
              <Ionicons name="people" size={13} color="#5F6368" style={{ marginRight: 4 }} />
            )}
            {itemCountText && (
              <>
                <Text className="text-[12px] font-outfit text-[#5F6368]">{itemCountText}</Text>
                <Text className="text-[12px] font-outfit text-[#B4B8BF] mx-1">•</Text>
              </>
            )}
            <Text className="text-[12px] font-outfit text-[#5F6368]" numberOfLines={1}>
              {item.updatedAt.includes("opened") ||
              item.updatedAt.includes("modified") ||
              item.updatedAt.includes("edited")
                ? item.updatedAt
                : `You opened • ${item.updatedAt}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Options 3-Dots Button */}
      <TouchableOpacity
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={handleOptions}
        accessibilityLabel={`Options for ${item.name}`}
        className="p-2"
      >
        <Ionicons name="ellipsis-horizontal" size={20} color="#444746" />
      </TouchableOpacity>
    </View>
  );
}

export const DriveFileItem = memo(
  DriveFileItemComponent,
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.name === next.item.name &&
      prev.item.updatedAt === next.item.updatedAt &&
      prev.item.starred === next.item.starred &&
      prev.item.sharedBy === next.item.sharedBy &&
      prev.item.size === next.item.size &&
      prev.item.uri === next.item.uri &&
      prev.viewMode === next.viewMode &&
      prev.childCount === next.childCount &&
      prev.onPress === next.onPress &&
      prev.onOptionsPress === next.onOptionsPress
    );
  }
);
