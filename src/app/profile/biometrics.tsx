import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { triggerHaptic } from "../../utils/haptics";
import { ProfileHeader } from "../../components/profile/ProfileHeader";
import { useBiometrics } from "../../context/BiometricsContext";
import { authenticateWithBiometrics } from "../../services/biometricsService";

const TIMEOUT_OPTIONS = [
  { label: "Immediately", value: 0 },
  { label: "1 min", value: 1 },
  { label: "5 mins", value: 5 },
  { label: "15 mins", value: 15 },
];

export default function BiometricsScreen() {
  const {
    capability,
    isBiometricsEnabled,
    lockTimeoutMinutes,
    setBiometricsEnabled,
    setLockTimeout,
    lockApp,
  } = useBiometrics();

  const [isToggling, setIsToggling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const sensorName = capability?.sensorName || (Platform.OS === "ios" ? "Face ID" : "Fingerprint");
  const sensorIcon = capability?.sensorIcon || "finger-print";
  const hasHardware = capability?.hasHardware ?? true;
  const isEnrolled = capability?.isEnrolled ?? true;

  const handleToggle = async (val: boolean) => {
    if (isToggling) return;
    triggerHaptic();

    if (val && (!hasHardware || !isEnrolled)) {
      Alert.alert(
        "Biometrics Unavailable",
        !hasHardware
          ? "Your device does not appear to support biometric hardware."
          : "No biometric credentials enrolled. Please register your fingerprint or face in device Settings first."
      );
      return;
    }

    setIsToggling(true);
    try {
      const result = await setBiometricsEnabled(val);
      if (!result.success) {
        if (result.error && result.error !== "Authentication cancelled.") {
          Alert.alert("Verification Failed", result.error);
        }
      } else {
        if (val) {
          Alert.alert(
            "Biometric Lock Active",
            `Mark-X is now protected with ${sensorName}. Returning from background will require verification.`
          );
        }
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleTestUnlock = async () => {
    if (isTesting) return;
    setIsTesting(true);
    triggerHaptic();

    try {
      const result = await authenticateWithBiometrics({
        promptMessage: `Test ${sensorName} Verification`,
        cancelLabel: "Dismiss",
      });

      if (result.success) {
        Alert.alert("Success", `${sensorName} verified successfully! Hardware sensor is fully operational.`);
      } else if (!result.cancelled && result.error) {
        Alert.alert("Test Failed", result.error);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleLockNow = () => {
    triggerHaptic();
    if (!isBiometricsEnabled) {
      Alert.alert(
        "Lock Inactive",
        "Please enable 'Require Biometrics' first to lock your session."
      );
      return;
    }
    lockApp();
  };

  return (
    <View className="flex-1 bg-white">
      <ProfileHeader
        title="Biometric Lock"
        subtitle="Hardware-level sensor protection"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
      >
        {/* Hardware Status Alert if Not Available or Not Enrolled */}
        {(!hasHardware || !isEnrolled) && (
          <View className="bg-[#FFFBEB] rounded-2xl p-4 border border-[#FDE68A] mb-6 flex-row items-start">
            <Ionicons
              name="warning-outline"
              size={20}
              color="#D97706"
              style={{ marginRight: 10, marginTop: 2 }}
            />
            <View className="flex-1">
              <Text
                className="text-[14px] text-[#92400E] mb-0.5"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                {!hasHardware ? "Sensor Not Detected" : "No Biometrics Enrolled"}
              </Text>
              <Text
                className="text-[12px] text-[#B45309] leading-4"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                {!hasHardware
                  ? "Your device does not expose compatible biometric sensors."
                  : "Go to your phone Settings > Security & Biometrics to enroll your fingerprint or face scan."}
              </Text>
            </View>
          </View>
        )}

        {/* Hero Card */}
        <View className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#E2E8F0] mb-6 items-center">
          <View
            className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${
              isBiometricsEnabled ? "bg-[#DCFCE7]" : "bg-[#F1F5F9]"
            }`}
          >
            <Ionicons
              name={sensorIcon}
              size={42}
              color={isBiometricsEnabled ? "#15803D" : "#64748B"}
            />
          </View>

          <Text
            className="text-[20px] text-[#0F172A] mb-1"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            {sensorName}
          </Text>

          {/* Sensor Badge */}
          <View className="flex-row items-center bg-[#E2E8F0]/70 px-3 py-1 rounded-full mb-3">
            <Ionicons
              name={hasHardware && isEnrolled ? "checkmark-circle" : "alert-circle"}
              size={13}
              color={hasHardware && isEnrolled ? "#16A34A" : "#D97706"}
              style={{ marginRight: 5 }}
            />
            <Text
              className="text-[11px] text-[#475569]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              {hasHardware && isEnrolled ? "Hardware Ready & Enrolled" : "Setup Required"}
            </Text>
          </View>

          <Text
            className="text-[14px] text-[#64748B] text-center mb-6 leading-5 px-4"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Secure your Mark-X vault, private cloud drive, and encrypted notes using your device&apos;s biometric sensors.
          </Text>

          {/* Switch Box */}
          <View className="w-full bg-white rounded-xl p-4 border border-[#E2E8F0] flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-[#0F172A]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Require {sensorName}
              </Text>
              <Text
                className="text-[12px] text-[#64748B] mt-0.5"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                {isBiometricsEnabled ? "App locks when leaving or backgrounded" : "App opens directly without lock gate"}
              </Text>
            </View>

            <Switch
              disabled={isToggling}
              value={isBiometricsEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: "#E2E8F0", true: "#0F172A" }}
              thumbColor={
                Platform.OS === "android"
                  ? isBiometricsEnabled
                    ? "#FFFFFF"
                    : "#F8FAFC"
                  : "#FFFFFF"
              }
              ios_backgroundColor="#E2E8F0"
            />
          </View>
        </View>

        {/* Auto-Lock Timeout Settings */}
        {isBiometricsEnabled && (
          <>
            <Text
              className="text-[13px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Auto-Lock Grace Period
            </Text>
            <View className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] mb-6">
              <Text
                className="text-[13px] text-[#475569] mb-3 leading-4"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Choose how quickly Mark-X locks after switching to another app or locking your screen:
              </Text>

              <View className="flex-row gap-2">
                {TIMEOUT_OPTIONS.map((opt) => {
                  const isSelected = lockTimeoutMinutes === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      activeOpacity={0.7}
                      onPress={() => {
                        triggerHaptic();
                        setLockTimeout(opt.value);
                      }}
                      className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                        isSelected
                          ? "bg-[#0F172A] border-[#0F172A]"
                          : "bg-white border-[#E2E8F0]"
                      }`}
                    >
                      <Text
                        className={`text-[12px] ${
                          isSelected ? "text-white" : "text-[#475569]"
                        }`}
                        style={{
                          fontFamily: isSelected
                            ? "Outfit_600SemiBold"
                            : "Outfit_500Medium",
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Quick Actions */}
        <Text
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Sensor Actions
        </Text>
        <View className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E2E8F0] mb-6">
          <TouchableOpacity
            onPress={handleTestUnlock}
            disabled={isTesting}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-2.5 rounded-xl active:bg-[#F1F5F9]"
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-[#EFF6FF] items-center justify-center mr-3">
                <Ionicons name="finger-print" size={18} color="#2563EB" />
              </View>
              <View>
                <Text
                  className="text-[14px] text-[#0F172A]"
                  style={{ fontFamily: "Outfit_600SemiBold" }}
                >
                  Test Biometric Sensor
                </Text>
                <Text
                  className="text-[12px] text-[#64748B]"
                  style={{ fontFamily: "Outfit_400Regular" }}
                >
                  Trigger a test scan without locking the app
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {isBiometricsEnabled && (
            <TouchableOpacity
              onPress={handleLockNow}
              activeOpacity={0.7}
              className="flex-row items-center justify-between p-2.5 rounded-xl active:bg-[#F1F5F9] border-t border-[#E2E8F0] mt-1"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-[#FEF2F2] items-center justify-center mr-3">
                  <Ionicons name="lock-closed" size={17} color="#DC2626" />
                </View>
                <View>
                  <Text
                    className="text-[14px] text-[#DC2626]"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Lock Session Now
                  </Text>
                  <Text
                    className="text-[12px] text-[#64748B]"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    Immediately activate the biometric lock screen
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Protected Resources */}
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
                Private personal notes and audio transcripts
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
            Biometric scans never leave your device&apos;s Secure Enclave or hardware keystore. Mark-X only receives a cryptographic verification token.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
