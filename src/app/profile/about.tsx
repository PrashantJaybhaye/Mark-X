import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ProfileHeader } from "../../components/profile/ProfileHeader";

export default function AboutScreen() {
  return (
    <View className="flex-1 bg-white">
      <ProfileHeader
        title="About Mark-X"
        subtitle="Version, framework specs & credits"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
      >
        {/* Brand Identity Card */}
        <View className="bg-[#0F172A] rounded-3xl p-6 items-center mb-6">
          <View className="w-16 h-16 rounded-2xl bg-[#1E293B] items-center justify-center mb-3 border border-white/10 shadow-lg">
            <Ionicons name="sparkles" size={28} color="#C6F043" />
          </View>

          <Text
            className="text-[24px] text-white tracking-wide"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Mark-X
          </Text>

          <Text
            className="text-[13px] text-[#94A3B8] mt-0.5 mb-3"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Version 1.0.0 (Build 57.0)
          </Text>

          <View className="bg-[#1E293B] px-3.5 py-1 rounded-full border border-white/10">
            <Text
              className="text-[11px] text-[#C6F043]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              PRODUCTION RELEASE
            </Text>
          </View>
        </View>

        {/* Overview */}
        <Text
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Product Overview
        </Text>
        <View className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] mb-6">
          <Text
            className="text-[14px] text-[#334155] leading-6"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Mark-X is a high-performance productivity suite engineered for creators and professionals. It unifies cloud drive file organization, intelligent notes with voice recordings, creative visual gallery boards, and automated attendance logging into one seamless native experience.
          </Text>
        </View>

        {/* Technical Specifications */}
        <Text
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Technology Stack
        </Text>
        <View className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] mb-6">
          <View className="flex-row items-center justify-between py-2.5 border-b border-[#E2E8F0]">
            <Text
              className="text-[14px] text-[#64748B]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Framework
            </Text>
            <Text
              className="text-[14px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Expo SDK 57 / React Native
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2.5 border-b border-[#E2E8F0]">
            <Text
              className="text-[14px] text-[#64748B]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Runtime
            </Text>
            <Text
              className="text-[14px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              React 19.2 (New Architecture)
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2.5 border-b border-[#E2E8F0]">
            <Text
              className="text-[14px] text-[#64748B]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Cloud Infrastructure
            </Text>
            <Text
              className="text-[14px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Google Firebase Auth & Storage
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2.5 border-b border-[#E2E8F0]">
            <Text
              className="text-[14px] text-[#64748B]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Design Engine
            </Text>
            <Text
              className="text-[14px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Tailwind CSS & NativeWind
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2.5">
            <Text
              className="text-[14px] text-[#64748B]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Data Protection
            </Text>
            <Text
              className="text-[14px] text-[#15803D]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              AES-256 / Hardware Biometrics
            </Text>
          </View>
        </View>

        {/* Developer & Credits */}
        <Text
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Credits
        </Text>
        <View className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] mb-8">
          <View className="flex-row items-center justify-between py-2 border-b border-[#E2E8F0]">
            <Text
              className="text-[14px] text-[#64748B]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Creator & Architect
            </Text>
            <Text
              className="text-[14px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Prashant Jaybhaye
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2">
            <Text
              className="text-[14px] text-[#64748B]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              License
            </Text>
            <Text
              className="text-[14px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              Proprietary · All Rights Reserved
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View className="items-center">
          <Text
            className="text-[12px] text-[#94A3B8]"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            © {new Date().getFullYear()} Mark-X Productivity. Built with ❤️.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
