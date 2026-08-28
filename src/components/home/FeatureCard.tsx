import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface FeatureCardProps {
  title: string;
  count: number | string;
  subtitle: string;
  children: React.ReactNode;
  onPress: () => void;
}

export function FeatureCard({
  title,
  count,
  subtitle,
  children,
  onPress,
}: FeatureCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="flex-1 bg-white rounded-[22px] p-3.5 justify-between border border-black/[0.04]"
      style={{ minHeight: 135 }}
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <Text
          allowFontScaling={false}
          className="text-[14px] text-[#111111]"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          {title}
        </Text>
        <Ionicons name="chevron-forward" size={12} color="#8E8E93" />
      </View>

      <View className="my-1 w-full">{children}</View>

      <View className="mt-1">
        <Text
          allowFontScaling={false}
          className="text-[20px] text-[#111111] leading-tight"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          {count}
        </Text>
        <Text
          allowFontScaling={false}
          className="text-[11px] text-[#8E8E93] mt-0.5"
          style={{ fontFamily: "Outfit_400Regular" }}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
