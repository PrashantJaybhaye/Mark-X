import React from "react";
import {
  Platform,
  ScrollView,
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

import { useAuth } from "../../context/AuthContext";
import { triggerHaptic } from "../../utils/haptics";
import { APP_VERSION, BUILD_NUMBER } from "../../constants/version";

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) : 16
  );

  const handleDismiss = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(user ? "/(main)/profile" : "/(auth)/login");
    }
  };

  const handleNavigate = (path: string) => {
    triggerHaptic();
    router.push(path as any);
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View
        style={{ paddingTop: topInset + 8 }}
        className="bg-white px-4 pb-3.5 border-b border-[#F1F5F9]"
      >
        <View className="flex-row items-center justify-between min-h-[44px] relative">
          <TouchableOpacity
            onPress={handleDismiss}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom + 20, 28),
        }}
      >
        <View className="flex-1 items-center justify-center py-6">
          <View
            style={{ width: 154, height: 154 }}
            className="w-[154px] h-[154px] rounded-[38px] bg-white items-center justify-center shadow-lg border border-[#F0F0F0] overflow-hidden mb-6"
          >
            <Image
              source={require("../../../assets/images/icon.png")}
              style={{ width: 154, height: 154 }}
              contentFit="cover"
            />
          </View>

          <View className="items-center py-1">
            <Text
              className="text-[18px] text-[#111111] mb-1.5"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Version {APP_VERSION}
            </Text>

            <Text
              className="text-[14px] text-[#71717A]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Build {BUILD_NUMBER}
            </Text>
          </View>
        </View>

        <View className="w-full items-center">
          <View className="w-full bg-[#F8FAFC] rounded-[18px] border border-[#F1F5F9] overflow-hidden mb-6">
            <TouchableOpacity
              onPress={() => handleNavigate("/profile/terms")}
              activeOpacity={0.65}
              className="py-4 px-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="document-text-outline" size={20} color="#111111" />
                <Text
                  className="text-[16px] text-[#111111]"
                  style={{ fontFamily: "Outfit_500Medium" }}
                >
                  Terms of Service
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View className="h-[0.5px] bg-[#E2E8F0] ml-11" />

            <TouchableOpacity
              onPress={() => handleNavigate("/profile/privacy")}
              activeOpacity={0.65}
              className="py-4 px-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="shield-checkmark-outline" size={20} color="#111111" />
                <Text
                  className="text-[16px] text-[#111111]"
                  style={{ fontFamily: "Outfit_500Medium" }}
                >
                  Privacy Policy
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View className="h-[0.5px] bg-[#E2E8F0] ml-11" />

            <TouchableOpacity
              onPress={() => handleNavigate("/profile/help")}
              activeOpacity={0.65}
              className="py-4 px-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="help-circle-outline" size={20} color="#111111" />
                <Text
                  className="text-[16px] text-[#111111]"
                  style={{ fontFamily: "Outfit_500Medium" }}
                >
                  Help &amp; Support
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text
            className="text-[13px] text-[#8E8E93] text-center leading-5 mb-8"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Copyright {new Date().getFullYear()} Mark-X, Inc.{"\n"}
            All Rights Reserved
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
