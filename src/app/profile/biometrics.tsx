import React, { useState, useEffect } from "react";
import { Alert, Platform, ScrollView, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { triggerHaptic } from "../../utils/haptics";
import { ProfileHeader } from "../../components/profile/ProfileHeader";
import {
  loadUserPreferences,
  saveUserPreferences,
} from "../../services/storageService";

export default function BiometricsScreen() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserPreferences().then((prefs) => {
      if (prefs.isBiometricsEnabled !== undefined) {
        setIsEnabled(prefs.isBiometricsEnabled);
      }
      setIsLoading(false);
    });
  }, []);

  const handleToggle = (val: boolean) => {
    triggerHaptic();
    setIsEnabled(val);
    saveUserPreferences({ isBiometricsEnabled: val });
    if (val) {
      Alert.alert(
        "Biometric Lock Active",
        "Mark-X Vault and Notes are now secured with device biometrics."
      );
    }
  };

  const biometricName = Platform.OS === "ios" ? "Face ID / Touch ID" : "Fingerprint / Face Unlock";

  return (
    <View className="flex-1 bg-white">
      <ProfileHeader
        title="Biometric Lock"
        subtitle="Device-level sensor verification"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
      >
        {/* Hero Card */}
        <View className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#E2E8F0] mb-6 items-center">
          <View
            className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${
              isEnabled ? "bg-[#DCFCE7]" : "bg-[#F1F5F9]"
            }`}
          >
            <Ionicons
              name="finger-print"
              size={42}
              color={isEnabled ? "#15803D" : "#64748B"}
            />
          </View>

          <Text
            className="text-[20px] text-[#0F172A] mb-1"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            {biometricName}
          </Text>

          <Text
            className="text-[14px] text-[#64748B] text-center mb-6 leading-5 px-4"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Secure your Mark-X app, private files, and encrypted notes using your device&apos;s biometric sensors.
          </Text>

          {/* Switch Box */}
          <View className="w-full bg-white rounded-xl p-4 border border-[#E2E8F0] flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-[#0F172A]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Require Biometrics
              </Text>
              <Text
                className="text-[12px] text-[#64748B] mt-0.5"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                {isEnabled ? "App is locked on launch" : "App opens directly without prompt"}
              </Text>
            </View>

            <Switch
              disabled={isLoading}
              value={isEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: "#E2E8F0", true: "#0F172A" }}
              thumbColor={
                Platform.OS === "android"
                  ? isEnabled
                    ? "#FFFFFF"
                    : "#F8FAFC"
                  : "#FFFFFF"
              }
              ios_backgroundColor="#E2E8F0"
            />
          </View>
        </View>

        {/* What is Protected */}
        <Text
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Protected Resources
        </Text>
        <View className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] mb-6">
          <View className="flex-row items-center py-2.5 border-b border-[#E2E8F0]">
            <View className="w-8 h-8 rounded-lg bg-[#EFF6FF] items-center justify-center mr-3">
              <Ionicons name="folder-outline" size={17} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text
                className="text-[14px] text-[#0F172A]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Mark-X Cloud Drive
              </Text>
              <Text
                className="text-[12px] text-[#64748B]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Confidential folders and encrypted documents
              </Text>
            </View>
          </View>

          <View className="flex-row items-center py-2.5 border-b border-[#E2E8F0]">
            <View className="w-8 h-8 rounded-lg bg-[#FEF3C7] items-center justify-center mr-3">
              <Ionicons name="document-text-outline" size={17} color="#D97706" />
            </View>
            <View className="flex-1">
              <Text
                className="text-[14px] text-[#0F172A]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Smart Notes & Voice Memos
              </Text>
              <Text
                className="text-[12px] text-[#64748B]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Private personal notes and voice recordings
              </Text>
            </View>
          </View>

          <View className="flex-row items-center py-2.5">
            <View className="w-8 h-8 rounded-lg bg-[#DCFCE7] items-center justify-center mr-3">
              <Ionicons name="images-outline" size={17} color="#15803D" />
            </View>
            <View className="flex-1">
              <Text
                className="text-[14px] text-[#0F172A]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Inspiration Gallery
              </Text>
              <Text
                className="text-[12px] text-[#64748B]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Secured media items and cached thumbnails
              </Text>
            </View>
          </View>
        </View>

        {/* Hardware & Privacy info */}
        <View className="bg-[#F1F5F9] rounded-2xl p-4 border border-[#E2E8F0] flex-row items-start">
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#64748B"
            style={{ marginRight: 8, marginTop: 1 }}
          />
          <Text
            className="text-[13px] text-[#475569] flex-1 leading-5"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Biometric data remains on your device&apos;s Secure Enclave or hardware keystore and is never transmitted over the network or saved on Mark-X servers.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
