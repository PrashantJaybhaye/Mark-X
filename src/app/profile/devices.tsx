import React from "react";
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { triggerHaptic } from "../../utils/haptics";
import { ProfileHeader } from "../../components/profile/ProfileHeader";

export default function DevicesScreen() {
  const { signOut } = useAuth();

  const handleSignOutDevice = () => {
    triggerHaptic();
    Alert.alert(
      "End Session",
      "Are you sure you want to sign out from this device?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to sign out.");
            }
          },
        },
      ]
    );
  };

  const deviceName = Platform.select({
    ios: "Apple iPhone",
    android: "Android Mobile Device",
    default: "Modern Web Browser",
  });

  const osVersion = Platform.select({
    ios: `iOS ${Platform.Version}`,
    android: `Android API ${Platform.Version}`,
    default: "Web OS",
  });

  return (
    <View className="flex-1 bg-white">
      <ProfileHeader
        title="Active Devices"
        subtitle="Manage active sessions & authorizations"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
      >
        {/* Device Status Header */}
        <Text
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Current Device
        </Text>

        <View className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 rounded-2xl bg-[#0F172A] items-center justify-center mr-4">
              <Ionicons
                name={Platform.OS === "ios" ? "phone-portrait" : Platform.OS === "android" ? "phone-portrait-outline" : "desktop-outline"}
                size={24}
                color="#C6F043"
              />
            </View>

            <View className="flex-1">
              <View className="flex-row items-center">
                <Text
                  className="text-[17px] text-[#0F172A] mr-2"
                  style={{ fontFamily: "Outfit_700Bold" }}
                >
                  {deviceName}
                </Text>
              </View>

              <View className="flex-row items-center mt-1">
                <View className="w-2 h-2 rounded-full bg-[#16A34A] mr-1.5" />
                <Text
                  className="text-[12px] text-[#16A34A]"
                  style={{ fontFamily: "Outfit_600SemiBold" }}
                >
                  Active Now
                </Text>
              </View>
            </View>
          </View>

          {/* Device Details Table */}
          <View className="bg-white rounded-xl p-3 border border-[#E2E8F0]">
            <View className="flex-row items-center justify-between py-2 border-b border-[#F1F5F9]">
              <Text
                className="text-[13px] text-[#64748B]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Operating System
              </Text>
              <Text
                className="text-[13px] text-[#0F172A]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                {osVersion}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2 border-b border-[#F1F5F9]">
              <Text
                className="text-[13px] text-[#64748B]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                App Version
              </Text>
              <Text
                className="text-[13px] text-[#0F172A]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                v1.0.0 (Release Build)
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2 border-b border-[#F1F5F9]">
              <Text
                className="text-[13px] text-[#64748B]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Session Security
              </Text>
              <Text
                className="text-[13px] text-[#15803D]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                TLS 1.3 / OAuth Token
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2">
              <Text
                className="text-[13px] text-[#64748B]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Location & IP
              </Text>
              <Text
                className="text-[13px] text-[#0F172A]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Current Network
              </Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOutDevice}
          activeOpacity={0.8}
          className="w-full bg-[#FEE2E2] border border-[#FECACA] py-3.5 rounded-xl items-center justify-center flex-row mb-6 active:opacity-90"
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color="#EF4444"
            style={{ marginRight: 6 }}
          />
          <Text
            className="text-[15px] text-[#EF4444]"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Sign Out From This Device
          </Text>
        </TouchableOpacity>

        {/* Security Info Card */}
        <View className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0]">
          <View className="flex-row items-start">
            <Ionicons
              name="shield-outline"
              size={18}
              color="#64748B"
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <Text
              className="text-[13px] text-[#475569] flex-1 leading-5"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Mark-X uses secure token refresh cycles. If you don&apos;t recognize an active session, reset your password immediately in Login & Security.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
