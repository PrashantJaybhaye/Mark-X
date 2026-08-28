import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { DriveItem, getCategoryIcon } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";

interface DriveFileItemProps {
  item: DriveItem;
  onPress?: (item: DriveItem) => void;
  onOptionsPress?: (item: DriveItem) => void;
}

function DriveFileItemComponent({ item, onPress, onOptionsPress }: DriveFileItemProps) {
  const iconConfig = getCategoryIcon(item.category);

  const handleRowPress = useCallback(() => {
    triggerHaptic();
    onPress?.(item);
  }, [item, onPress]);

  const handleOptions = useCallback(() => {
    triggerHaptic();
    onOptionsPress?.(item);
  }, [item, onOptionsPress]);

  if (item.isFolder) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleRowPress}
        className="flex-row items-center bg-[#F8F9FA] border border-[#E8EAED] rounded-2xl p-3.5 h-[72px]"
      >
        <View className="w-10 h-10 rounded-xl bg-[#E8F0FE] items-center justify-center mr-3">
          <Ionicons name="folder" size={22} color="#0B57D0" />
        </View>

        <View className="flex-1">
          <Text className="text-[14px] font-outfit-semibold text-[#1F1F1F]" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-[12px] font-outfit text-[#70757A] mt-0.5">
            {item.updatedAt}
          </Text>
        </View>

        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleOptions}
          className="p-1.5"
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#70757A" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handleRowPress}
      className="flex-row items-center bg-white border border-[#EBECEF] rounded-2xl p-3.5 h-[72px]"
    >
      {/* File Icon / Thumbnail */}
      <View
        className="w-11 h-11 rounded-xl items-center justify-center mr-3.5 overflow-hidden"
        style={{ backgroundColor: `${iconConfig.color}15` }}
      >
        {item.category === "image" && item.uri ? (
          <Image
            source={{ uri: item.uri }}
            style={{ width: "100%", height: "100%", borderRadius: 12 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.id}
            transition={0}
          />
        ) : (
          <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
        )}
      </View>

      {/* File Information */}
      <View className="flex-1 pr-2">
        <Text className="text-[14px] font-outfit-semibold text-[#1F1F1F]" numberOfLines={1}>
          {item.name}
        </Text>
        <View className="flex-row items-center mt-0.5">
          {item.size && (
            <>
              <Text className="text-[12px] font-outfit text-[#70757A]">{item.size}</Text>
              <Text className="text-[12px] font-outfit text-[#B4B8BF] mx-1.5">•</Text>
            </>
          )}
          <Text className="text-[12px] font-outfit text-[#70757A]">{item.updatedAt}</Text>
        </View>
      </View>

      {/* Options Menu Button */}
      <TouchableOpacity
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={handleOptions}
        className="p-1.5"
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#70757A" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export const DriveFileItem = memo(
  DriveFileItemComponent,
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.name === next.item.name &&
      prev.item.updatedAt === next.item.updatedAt &&
      prev.item.size === next.item.size &&
      prev.item.uri === next.item.uri &&
      prev.onPress === next.onPress &&
      prev.onOptionsPress === next.onOptionsPress
    );
  }
);
