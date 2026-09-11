import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { triggerHaptic } from "../../utils/haptics";

interface ProfileCardRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  trailingText?: string;
  showDivider?: boolean;
  isDestructive?: boolean;
  rightElement?: React.ReactNode;
  onPress?: () => void;
}

export function ProfileCardRow({
  icon,
  title,
  subtitle,
  trailingText,
  showDivider = true,
  isDestructive = false,
  rightElement,
  onPress,
}: ProfileCardRowProps) {
  const handlePress = () => {
    if (onPress) {
      triggerHaptic();
      onPress();
    }
  };

  const iconColor = isDestructive ? "#EF4444" : "#222222";
  const textColor = isDestructive ? "text-[#EF4444]" : "text-[#222222]";

  const rowContent = (
    <View className="flex-row items-center justify-between py-3.5">
      <View className="flex-row items-center flex-1 pr-3">
        <View className="w-8 items-center justify-center mr-3.5">
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>

        <View className="flex-1">
          <Text
            className={`text-[16px] ${textColor}`}
            style={{ fontFamily: "Outfit_400Regular" }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="text-[13px] text-[#717171] mt-0.5"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center">
        {trailingText ? (
          <Text
            className="text-[14px] text-[#717171] mr-2"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            {trailingText}
          </Text>
        ) : null}

        {rightElement || (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDestructive ? "#EF4444" : "#A3A3A3"}
          />
        )}
      </View>
    </View>
  );

  return (
    <View>
      {onPress && !rightElement ? (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.6}>
          {rowContent}
        </TouchableOpacity>
      ) : (
        rowContent
      )}
      {showDivider && <View className="h-[1px] bg-[#EBEBEB] w-full" />}
    </View>
  );
}
