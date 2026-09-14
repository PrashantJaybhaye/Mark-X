import React from "react";
import {
  Platform,
  StatusBar as RNStatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../../utils/haptics";

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) : 16
  );

  const handleBack = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/profile");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Clean Minimal Header */}
      <View style={{ paddingTop: topInset }} className="bg-white px-4 pb-2">
        <View className="flex-row items-center justify-between h-12 relative">
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-10 h-10 items-center justify-center z-10"
          >
            <Ionicons name="chevron-back" size={24} color="#111111" />
          </TouchableOpacity>

          <View className="absolute inset-0 items-center justify-center pointer-events-none">
            <Text
              className="text-[17px] text-[#111111]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              About This Version
            </Text>
          </View>

          <View className="w-10 h-10" />
        </View>
      </View>

      {/* Centered Minimal Content (Nike-style) */}
      <View className="flex-1 items-center justify-center px-6 pb-24">
        {/* App Squircle Icon */}
        <View className="w-[154px] h-[154px] rounded-[38px] bg-white items-center justify-center shadow-lg border border-[#F0F0F0] overflow-hidden mb-8">
          <Image
            source={require("../../../assets/images/icon.png")}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>

        {/* Version */}
        <Text
          className="text-[18px] text-[#111111] mb-1.5"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Version 1.0.0
        </Text>

        {/* Build Number */}
        <Text
          className="text-[14px] text-[#71717A] mb-12"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          Build: 57.0.22
        </Text>

        {/* Copyright */}
        <Text
          className="text-[13px] text-[#8E8E93] text-center leading-5"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          Copyright {new Date().getFullYear()} Mark-X, Inc.{"\n"}
          All Rights Reserved
        </Text>
      </View>
    </View>
  );
}
