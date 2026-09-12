import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ProfileHeader } from "../../components/profile/ProfileHeader";

export default function TermsScreen() {
  return (
    <View className="flex-1 bg-white">
      <ProfileHeader
        title="Terms & Conditions"
        subtitle="Policies, privacy, and acceptable usage"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
      >
        {/* Document Header */}
        <View className="mb-6">
          <View className="flex-row items-center mb-1">
            <Ionicons name="document-text" size={20} color="#0F172A" style={{ marginRight: 8 }} />
            <Text
              className="text-[20px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_700Bold" }}
            >
              Terms of Service & Privacy
            </Text>
          </View>
          <Text
            className="text-[13px] text-[#64748B]"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Last updated: September 2024 · Effective immediately
          </Text>
        </View>

        {/* Section 1 */}
        <View className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] mb-4">
          <Text
            className="text-[16px] text-[#0F172A] mb-2"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            1. Acceptance of Terms
          </Text>
          <Text
            className="text-[14px] text-[#475569] leading-6"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            By creating an account or accessing Mark-X, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the application.
          </Text>
        </View>

        {/* Section 2 */}
        <View className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] mb-4">
          <Text
            className="text-[16px] text-[#0F172A] mb-2"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            2. Ownership of Your Data
          </Text>
          <Text
            className="text-[14px] text-[#475569] leading-6"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            You retain 100% ownership of all files, documents, photographs, and notes uploaded or generated within Mark-X. We do not sell, rent, or monetize your personal content or creative assets under any circumstances.
          </Text>
        </View>

        {/* Section 3 */}
        <View className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] mb-4">
          <Text
            className="text-[16px] text-[#0F172A] mb-2"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            3. Security & Cloud Vault Encryption
          </Text>
          <Text
            className="text-[14px] text-[#475569] leading-6"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Mark-X employs enterprise-grade cryptographic controls, including Transport Layer Security (TLS 1.3) in transit and Advanced Encryption Standard (AES-256) at rest. Biometric authentication options utilize hardware-isolated secure enclaves on your native device.
          </Text>
        </View>

        {/* Section 4 */}
        <View className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] mb-4">
          <Text
            className="text-[16px] text-[#0F172A] mb-2"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            4. Acceptable Use
          </Text>
          <Text
            className="text-[14px] text-[#475569] leading-6"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            You agree not to use Mark-X for transmitting malware, engaging in unlawful file distribution, or attempting unauthorized disruption of the underlying cloud services. Violation of acceptable use may result in immediate suspension.
          </Text>
        </View>

        {/* Section 5 */}
        <View className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] mb-4">
          <Text
            className="text-[16px] text-[#0F172A] mb-2"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            5. Modifications & Updates
          </Text>
          <Text
            className="text-[14px] text-[#475569] leading-6"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            We may revise these terms periodically to reflect product updates or legal developments. Continued usage of Mark-X signifies acceptance of revised policies.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
