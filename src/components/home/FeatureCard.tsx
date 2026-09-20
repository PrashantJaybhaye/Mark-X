import React, { useState, useEffect } from "react";
import { Text, TouchableOpacity, View, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface FeatureCardProps {
  title: string;
  count: number | string;
  subtitle: string;
  isLoading?: boolean;
  children: React.ReactNode;
  onPress: () => void;
}

export function FeatureCard({
  title,
  count,
  subtitle,
  isLoading = false,
  children,
  onPress,
}: FeatureCardProps) {
  const [pulseAnim] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    if (isLoading) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isLoading, pulseAnim]);

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
        {isLoading ? (
          <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-10 h-6 bg-black/10 rounded-md my-0.5"
          />
        ) : (
          <Text
            allowFontScaling={false}
            className="text-[20px] text-[#111111] leading-tight"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            {count}
          </Text>
        )}
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

