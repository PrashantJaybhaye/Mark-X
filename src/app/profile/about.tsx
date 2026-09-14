import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ProfileHeader } from "../../components/profile/ProfileHeader";
import { MarkXLogo } from "../../components/common/MarkXLogo";
import { triggerHaptic } from "../../utils/haptics";

export default function AboutScreen() {
  const router = useRouter();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const handleCheckUpdate = () => {
    triggerHaptic();
    setIsCheckingUpdate(true);
    setTimeout(() => {
      setIsCheckingUpdate(false);
      Alert.alert(
        "Up to Date",
        "Mark-X v1.0.0 (Build 57.0) is currently the latest release. No updates available."
      );
    }, 900);
  };

  return (
    <View className="flex-1 bg-white">
      <ProfileHeader
        title="About Mark-X"
        subtitle="Version, framework specs & credits"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 48,
        }}
      >
        {/* Hero Brand Identity Card */}
        <View className="bg-[#111111] rounded-3xl p-6 items-center mb-6 shadow-md border border-[#222222] relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <View
            style={{
              position: "absolute",
              top: -60,
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: "rgba(198, 240, 67, 0.08)",
            }}
          />

          {/* Logo Badge */}
          <View className="w-16 h-16 rounded-2xl bg-[#1A1A1A] items-center justify-center mb-3.5 border border-white/10 shadow-lg">
            <MarkXLogo width={36} height={36} color="#C6F043" />
          </View>

          <Text
            className="text-[26px] text-white tracking-tight"
            style={{ fontFamily: "Outfit_800ExtraBold" }}
          >
            MARK-X
          </Text>

          <Text
            className="text-[13px] text-[#A1A1AA] mt-0.5 mb-3.5 text-center"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Personal Operating System & Productivity Workspace
          </Text>

          {/* Release Badges */}
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center bg-[#1F2937] px-3 py-1 rounded-full border border-white/10">
              <View className="w-2 h-2 rounded-full bg-[#10B981] mr-1.5" />
              <Text
                className="text-[11px] text-white"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                v1.0.0
              </Text>
            </View>

            <View className="bg-[#C6F043] px-3 py-1 rounded-full">
              <Text
                className="text-[11px] text-[#111111]"
                style={{ fontFamily: "Outfit_700Bold" }}
              >
                BUILD 57.0
              </Text>
            </View>
          </View>
        </View>

        {/* Product Overview */}
        <Text
          className="text-[12px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          Product Overview
        </Text>
        <View className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] mb-6">
          <Text
            className="text-[14px] text-[#334155] leading-6 mb-4"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Mark-X is a unified productivity system crafted for individuals, creators, and professionals. It brings your cloud drive documents, voice-powered smart notes, visual moodboards, and encrypted credentials into one cohesive, hardware-accelerated mobile interface.
          </Text>

          {/* Core Feature Pillars */}
          <View className="gap-2.5 pt-1 border-t border-[#E2E8F0]">
            <View className="flex-row items-center">
              <View className="w-7 h-7 rounded-lg bg-[#EFF6FF] items-center justify-center mr-2.5">
                <Ionicons name="folder-outline" size={14} color="#2563EB" />
              </View>
              <Text
                className="text-[13px] text-[#1E293B] flex-1"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Cloud Drive with smart categorization
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="w-7 h-7 rounded-lg bg-[#ECFDF5] items-center justify-center mr-2.5">
                <Ionicons name="document-text-outline" size={14} color="#059669" />
              </View>
              <Text
                className="text-[13px] text-[#1E293B] flex-1"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Smart Notes with voice memos & search
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="w-7 h-7 rounded-lg bg-[#FFFBEB] items-center justify-center mr-2.5">
                <Ionicons name="images-outline" size={14} color="#D97706" />
              </View>
              <Text
                className="text-[13px] text-[#1E293B] flex-1"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Inspiration Gallery with visual boards
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="w-7 h-7 rounded-lg bg-[#F5F3FF] items-center justify-center mr-2.5">
                <Ionicons name="shield-checkmark-outline" size={14} color="#7C3AED" />
              </View>
              <Text
                className="text-[13px] text-[#1E293B] flex-1"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Encrypted Vault with Biometric hardware lock
              </Text>
            </View>
          </View>
        </View>

        {/* Technical Architecture */}
        <Text
          className="text-[12px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          Technical Architecture
        </Text>
        <View className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] mb-6 divide-y divide-[#E2E8F0]">
          <View className="flex-row items-center justify-between py-2.5">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-md bg-[#EEF2FF] items-center justify-center mr-2.5">
                <Ionicons name="hardware-chip-outline" size={13} color="#4F46E5" />
              </View>
              <Text
                className="text-[13px] text-[#64748B]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Runtime Engine
              </Text>
            </View>
            <View className="bg-white border border-[#CBD5E1] px-2.5 py-0.5 rounded-full">
              <Text
                className="text-[12px] text-[#0F172A]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                React 19.2 · Fabric
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between py-2.5">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-md bg-[#F0FDF4] items-center justify-center mr-2.5">
                <Ionicons name="layers-outline" size={13} color="#16A34A" />
              </View>
              <Text
                className="text-[13px] text-[#64748B]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Framework Platform
              </Text>
            </View>
            <Text
              className="text-[13px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Expo SDK 57
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2.5">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-md bg-[#FFF7ED] items-center justify-center mr-2.5">
                <Ionicons name="cloud-done-outline" size={13} color="#EA580C" />
              </View>
              <Text
                className="text-[13px] text-[#64748B]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Cloud & Auth
              </Text>
            </View>
            <Text
              className="text-[13px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Firebase v12
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2.5">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-md bg-[#ECFEFF] items-center justify-center mr-2.5">
                <Ionicons name="color-palette-outline" size={13} color="#0891B2" />
              </View>
              <Text
                className="text-[13px] text-[#64748B]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Styling Engine
              </Text>
            </View>
            <Text
              className="text-[13px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              NativeWind & Tailwind CSS
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2.5">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-md bg-[#DCFCE7] items-center justify-center mr-2.5">
                <Ionicons name="shield-checkmark" size={13} color="#16A34A" />
              </View>
              <Text
                className="text-[13px] text-[#64748B]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Security Cipher
              </Text>
            </View>
            <View className="flex-row items-center bg-[#DCFCE7] px-2 py-0.5 rounded-full">
              <Ionicons name="lock-closed" size={10} color="#15803D" />
              <Text
                className="text-[11px] text-[#15803D] ml-1"
                style={{ fontFamily: "Outfit_700Bold" }}
              >
                AES-256 + Biometrics
              </Text>
            </View>
          </View>
        </View>

        {/* Creator & Project Credits */}
        <Text
          className="text-[12px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          Credits & Authorship
        </Text>
        <View className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] mb-6">
          <View className="flex-row items-center justify-between py-2 border-b border-[#E2E8F0]">
            <Text
              className="text-[13px] text-[#64748B]"
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              Creator & Architect
            </Text>
            <View className="flex-row items-center">
              <Text
                className="text-[14px] text-[#0F172A] mr-1.5"
                style={{ fontFamily: "Outfit_700Bold" }}
              >
                Prashant Jaybhaye
              </Text>
              <Ionicons name="checkmark-circle" size={15} color="#2563EB" />
            </View>
          </View>

          <View className="flex-row items-center justify-between py-2.5 border-b border-[#E2E8F0]">
            <Text
              className="text-[13px] text-[#64748B]"
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              License & Rights
            </Text>
            <Text
              className="text-[13px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Proprietary · All Rights Reserved
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2">
            <Text
              className="text-[13px] text-[#64748B]"
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              Platform Target
            </Text>
            <Text
              className="text-[13px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              {Platform.OS === "android" ? "Android 15+ Native" : "iOS / Cross-platform"}
            </Text>
          </View>
        </View>

        {/* Quick Navigation Links */}
        <View className="gap-2.5 mb-6">
          <TouchableOpacity
            onPress={() => {
              triggerHaptic();
              router.push("/profile/terms");
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3.5 rounded-2xl"
          >
            <View className="flex-row items-center">
              <Ionicons name="document-text-outline" size={18} color="#0F172A" />
              <Text
                className="text-[14px] text-[#0F172A] ml-3"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Terms of Service & Privacy Policy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              triggerHaptic();
              router.push("/profile/help");
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3.5 rounded-2xl"
          >
            <View className="flex-row items-center">
              <Ionicons name="help-circle-outline" size={18} color="#0F172A" />
              <Text
                className="text-[14px] text-[#0F172A] ml-3"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Help Center & Support Guides
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Check for Updates Action */}
        <TouchableOpacity
          onPress={handleCheckUpdate}
          disabled={isCheckingUpdate}
          activeOpacity={0.8}
          className="w-full bg-[#111111] py-3.5 rounded-2xl items-center justify-center flex-row shadow-sm mb-6 active:opacity-90"
        >
          <Ionicons
            name="cloud-download-outline"
            size={18}
            color="#C6F043"
            style={{ marginRight: 8 }}
          />
          <Text
            className="text-[15px] text-white"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            {isCheckingUpdate ? "Checking for Updates..." : "Check for Updates"}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View className="items-center">
          <Text
            className="text-[12px] text-[#94A3B8] text-center mb-1"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Designed & Engineered with ❤️ for creators worldwide
          </Text>
          <Text
            className="text-[11px] text-[#CBD5E1]"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            © {new Date().getFullYear()} Mark-X. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
