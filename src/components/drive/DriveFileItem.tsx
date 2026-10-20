import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { DriveItem, getFileDisplayName } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";
import { FileCategoryIcon } from "./FileCategoryIcon";
import { formatDriveTimestamp } from "../../services/driveFirebaseService";

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
  const displayName = getFileDisplayName(item.name, item.isFolder);

  const handleRowPress = useCallback(() => {
    triggerHaptic();
    onPress?.(item);
  }, [item, onPress]);

  const handleOptions = useCallback(() => {
    triggerHaptic();
    onOptionsPress?.(item);
  }, [item, onOptionsPress]);

  if (viewMode === "grid") {
    if (item.isFolder) {
      return (
        <View className="flex-1 m-1.5 bg-[#F8F9FA] border border-[#E8EAED] rounded-2xl p-3 h-[140px] justify-between shadow-xs">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleRowPress}
            className="flex-1 items-center justify-center pt-2"
          >
            <View className="w-16 h-16 rounded-2xl bg-[#F8F9FA] items-center justify-center">
              <FileCategoryIcon category="folder" size={42} fileName={item.name} />
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center justify-between pt-2 border-t border-[#EBECEF]">
            <Text
              className="flex-1 text-[13px] font-outfit-semibold text-[#1F1F1F] mr-1"
              numberOfLines={1}
            >
              {displayName}
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
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleRowPress}
          className="h-[95px] bg-[#F8F9FA] items-center justify-center overflow-hidden relative"
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
            <View className="w-14 h-14 items-center justify-center">
              <FileCategoryIcon category={item.category} size={36} id={item.id} fileName={item.name} />
            </View>
          )}
        </TouchableOpacity>

        <View className="flex-row items-center justify-between px-2.5 py-2 bg-white flex-1 border-t border-[#F0F2F5]">
          <View className="flex-row items-center flex-1 mr-1">
            <FileCategoryIcon category={item.category} size={18} id={item.id} fileName={item.name} />
            <Text
              className="text-[12px] font-outfit-semibold text-[#1F1F1F] flex-1 ml-1.5"
              numberOfLines={1}
            >
              {displayName}
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
        <View className="w-10 h-10 items-center justify-center mr-3.5">
          <FileCategoryIcon
            category={item.isFolder ? "folder" : item.category}
            size={32}
            uri={item.uri}
            id={item.id}
            fileName={item.name}
          />
        </View>

        <View className="flex-1">
          <Text className="text-[15px] font-outfit-medium text-[#1F1F1F]" numberOfLines={1}>
            {displayName}
          </Text>
          <View className="flex-row items-center mt-0.5">
            {item.starred && (
              <Ionicons name="star" size={13} color="#FFB800" style={{ marginRight: 4 }} />
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
              {`You opened • ${formatDriveTimestamp(item.updatedAt)}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={handleOptions}
        accessibilityLabel={`Options for ${displayName}`}
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
