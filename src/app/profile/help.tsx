import React, { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { triggerHaptic } from "../../utils/haptics";
import { ProfileHeader } from "../../components/profile/ProfileHeader";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    id: "1",
    category: "Security",
    question: "How is my data secured in Mark-X?",
    answer:
      "All your files, images, and notes are encrypted both in transit (TLS 1.3) and at rest (AES-256) on Google Cloud/Firebase infrastructure. Only your authenticated credentials can decrypt your personal vault.",
  },
  {
    id: "2",
    category: "Security",
    question: "How does Biometric Lock protect my session?",
    answer:
      "When Biometric Lock is active, Mark-X prompts for your device's Fingerprint, Touch ID, or Face ID whenever the app opens. If authentication fails, the vault remains inaccessible.",
  },
  {
    id: "3",
    category: "Storage",
    question: "Can I use Mark-X without an internet connection?",
    answer:
      "Yes! Mark-X caches your recent documents, smart notes, and gallery collections locally in offline storage. When you reconnect, all offline updates seamlessly sync with the cloud.",
  },
  {
    id: "4",
    category: "Drive",
    question: "What file formats does Mark-X Drive support?",
    answer:
      "Mark-X supports PDFs, documents (DOCX, TXT, MD), spreadsheets, presentations, and all high-resolution images (PNG, JPG, WebP, HEIC).",
  },
  {
    id: "5",
    category: "Account",
    question: "How do I reset my password or change my email?",
    answer:
      "Go to Profile > Login & Security and select 'Send Reset Email'. You will receive an instant link to update your credentials securely.",
  },
];

export default function HelpScreen() {
  const [expandedId, setExpandedId] = useState<string | null>("1");

  const toggleExpand = (id: string) => {
    triggerHaptic();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleContactSupport = async () => {
    triggerHaptic();
    const supportEmail = "support@mark-x.app";
    const mailtoUrl = `mailto:${supportEmail}?subject=Mark-X%20Support%20Request`;

    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);
    } else {
      await Clipboard.setStringAsync(supportEmail);
      Alert.alert(
        "Support Email Copied",
        `Mail app is not configured. We copied "${supportEmail}" to your clipboard.`
      );
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ProfileHeader
        title="Help & Support"
        subtitle="Frequently asked questions & assistance"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
      >
        {/* Contact Support Hero Card */}
        <View className="bg-[#0F172A] rounded-2xl p-6 mb-6">
          <View className="w-12 h-12 rounded-xl bg-[#1E293B] items-center justify-center mb-3">
            <Ionicons name="headset" size={24} color="#C6F043" />
          </View>

          <Text
            className="text-[20px] text-white mb-1"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Need assistance?
          </Text>

          <Text
            className="text-[14px] text-[#94A3B8] mb-5 leading-5"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Our dedicated team is ready to help you with troubleshooting, feedback, or inquiries.
          </Text>

          <TouchableOpacity
            onPress={handleContactSupport}
            activeOpacity={0.8}
            className="w-full bg-[#C6F043] py-3.5 rounded-xl items-center justify-center flex-row active:opacity-90"
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color="#0F172A"
              style={{ marginRight: 8 }}
            />
            <Text
              className="text-[15px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_700Bold" }}
            >
              Contact Support
            </Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <Text
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-3 ml-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Frequently Asked Questions
        </Text>

        <View className="gap-y-3 mb-6">
          {FAQS.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <TouchableOpacity
                key={faq.id}
                onPress={() => toggleExpand(faq.id)}
                activeOpacity={0.7}
                className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0]"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-[15px] text-[#0F172A]"
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                    >
                      {faq.question}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#64748B"
                  />
                </View>

                {isExpanded ? (
                  <Text
                    className="text-[14px] text-[#475569] mt-3 leading-5 pt-2 border-t border-[#E2E8F0]"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    {faq.answer}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Response Guarantee Info */}
        <View className="flex-row items-center justify-center py-2">
          <Ionicons name="time-outline" size={16} color="#64748B" />
          <Text
            className="text-[13px] text-[#64748B] ml-1.5"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Average response time: within 24 hours
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
