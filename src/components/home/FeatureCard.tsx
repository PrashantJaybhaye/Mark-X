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
      className="flex-1 bg-white rounded-3xl p-4 min-h-[180px] justify-between border border-black/[0.04] shadow-sm"
    >
      <View className="flex-row items-center justify-between">
        <Text
          allowFontScaling={false}
          className="text-[15px] text-[#111111]"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          {title}
        </Text>
        <Ionicons name="chevron-forward" size={13} color="#8E8E93" />
      </View>

      {children}

      <View>
        <Text
          allowFontScaling={false}
          className="text-[22px] text-[#111111] mt-1"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          {count}
        </Text>
        <Text
          allowFontScaling={false}
          className="text-[12px] text-[#8E8E93] mt-0.5"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
