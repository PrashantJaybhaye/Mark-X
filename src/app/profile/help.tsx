import React, { useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import * as Clipboard from "expo-clipboard";
import { triggerHaptic } from "../../utils/haptics";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface TopicItem {
  id: string;
  title: string;
  description: string;
}

interface IosDialogButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress: () => void;
}

interface IosDialogState {
  title: string;
  message: string;
  buttons: IosDialogButton[];
}

const FAQS: FAQItem[] = [
  {
    id: "1",
    question: "How do I give feedback on Mark-X?",
    answer:
      "We love hearing from you! Tap 'Contact us' below or email us directly at support@mark-x.app. Our design and engineering team reviews every message.",
  },
  {
    id: "2",
    question: "How to setup Cloud Vault?",
    answer:
      "Your Cloud Vault is created automatically upon registration. All files uploaded to Drive and notes saved in Smart Notes sync seamlessly to your isolated, encrypted cloud database.",
  },
  {
    id: "3",
    question: "Biometrics doesn't seem to be working",
    answer:
      "Check your device settings to confirm Mark-X has biometric permission (Face ID or Fingerprint). You can also toggle Biometric Lock off and on in Profile > Biometric Lock to recalibrate.",
  },
  {
    id: "4",
    question: "What is Cloud Sync & Offline Cache?",
    answer:
      "Mark-X stores an encrypted local copy of your recent files and notes on your physical phone. You can view and edit them offline; when you reconnect, changes sync automatically to the cloud.",
  },
  {
    id: "5",
    question: "Can I export all my files and notes?",
    answer:
      "Yes! Mark-X guarantees 100% data portability. You can export any document or note directly to your device or share it anytime with zero restrictions.",
  },
];

const TOPICS: TopicItem[] = [
  {
    id: "t1",
    title: "Getting Started",
    description:
      "Learn the basics of Mark-X: uploading documents to Drive, organizing visual pins in Gallery, writing Smart Notes, and locking your session with native biometrics.",
  },
  {
    id: "t2",
    title: "Troubleshooting & Security",
    description:
      "Diagnose sync issues, review hardware-isolated Secure Enclave cryptography, reset account credentials, and learn how offline caching protects your data.",
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [dialog, setDialog] = useState<IosDialogState | null>(null);

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) : 16
  );

  const handleDismiss = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/profile");
    }
  };

  const handleOpenFaq = (faq: FAQItem) => {
    triggerHaptic();
    setDialog({
      title: faq.question,
      message: faq.answer,
      buttons: [
        {
          text: "OK",
          style: "default",
          onPress: () => setDialog(null),
        },
      ],
    });
  };

  const handleOpenTopic = (topic: TopicItem) => {
    triggerHaptic();
    setDialog({
      title: topic.title,
      message: topic.description,
      buttons: [
        {
          text: "OK",
          style: "default",
          onPress: () => setDialog(null),
        },
      ],
    });
  };

  const handleContactSupport = () => {
    triggerHaptic();
    const supportEmail = "support@mark-x.app";
    const mailtoUrl = `mailto:${supportEmail}?subject=Mark-X%20Support%20Request`;

    setDialog({
      title: "Contact Support",
      message:
        "Our team typically responds within a few hours. How would you like to get in touch?",
      buttons: [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setDialog(null),
        },
        {
          text: "Copy Email",
          style: "default",
          onPress: async () => {
            await Clipboard.setStringAsync(supportEmail);
            setDialog({
              title: "Email Copied",
              message: "support@mark-x.app copied to your clipboard.",
              buttons: [
                {
                  text: "OK",
                  style: "default",
                  onPress: () => setDialog(null),
                },
              ],
            });
          },
        },
        {
          text: "Open Mail",
          style: "default",
          onPress: async () => {
            setDialog(null);
            const canOpen = await Linking.canOpenURL(mailtoUrl);
            if (canOpen) {
              await Linking.openURL(mailtoUrl);
            } else {
              await Clipboard.setStringAsync(supportEmail);
              setDialog({
                title: "Mail App Unavailable",
                message:
                  "No default mail client found. We copied support@mark-x.app to your clipboard.",
                buttons: [
                  {
                    text: "OK",
                    style: "default",
                    onPress: () => setDialog(null),
                  },
                ],
              });
            }
          },
        },
      ],
    });
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Unified Header matching About & Terms */}
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
              Support
            </Text>
          </View>

          <View className="w-10 h-10" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom + 32, 48),
        }}
      >
        {/* Opal Headline Header adapted to Mark-X theme */}
        <View className="mt-1 mb-7">
          <Text
            className="text-[32px] text-[#111111] tracking-tight leading-[38px]"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Hey there.{"\n"}How can we help?
          </Text>
        </View>

        {/* FAQS Section */}
        <Text
          className="text-[12px] text-[#71717A] uppercase tracking-wider mb-2.5 px-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          FAQS
        </Text>

        <View className="bg-[#F8FAFC] rounded-[18px] border border-[#F1F5F9] overflow-hidden mb-7">
          {FAQS.map((faq, index) => (
            <View key={faq.id}>
              {index > 0 ? (
                <View className="h-[0.5px] bg-[#E2E8F0] ml-4" />
              ) : null}
              <TouchableOpacity
                onPress={() => handleOpenFaq(faq)}
                activeOpacity={0.65}
                className="py-4 px-4 flex-row items-center justify-between"
              >
                <Text
                  className="text-[16px] text-[#111111] flex-1 pr-3"
                  style={{ fontFamily: "Outfit_400Regular" }}
                >
                  {faq.question}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* BROWSE TOPICS Section */}
        <Text
          className="text-[12px] text-[#71717A] uppercase tracking-wider mb-2.5 px-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          BROWSE TOPICS
        </Text>

        <View className="bg-[#F8FAFC] rounded-[18px] border border-[#F1F5F9] overflow-hidden mb-8">
          {TOPICS.map((topic, index) => (
            <View key={topic.id}>
              {index > 0 ? (
                <View className="h-[0.5px] bg-[#E2E8F0] ml-4" />
              ) : null}
              <TouchableOpacity
                onPress={() => handleOpenTopic(topic)}
                activeOpacity={0.65}
                className="py-4 px-4 flex-row items-center justify-between"
              >
                <Text
                  className="text-[16px] text-[#111111] flex-1 pr-3"
                  style={{ fontFamily: "Outfit_400Regular" }}
                >
                  {topic.title}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Still need help? Section */}
        <View className="mb-6">
          <Text
            className="text-[22px] text-[#111111] mb-1.5"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Still need help?
          </Text>
          <Text
            className="text-[15px] text-[#64748B] leading-5"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Send us a message and we&apos;ll reply as soon as we can
          </Text>
        </View>

        {/* Contact us Blue Pill Button */}
        <TouchableOpacity
          onPress={handleContactSupport}
          activeOpacity={0.8}
          className="w-full bg-[#007AFF] py-4 rounded-full items-center justify-center shadow-sm"
        >
          <Text
            className="text-[17px] text-white"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Contact us
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Authentic iOS Alert Modal Dialog */}
      <Modal
        visible={dialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDialog(null)}
      >
        <TouchableWithoutFeedback onPress={() => setDialog(null)}>
          <View className="flex-1 bg-black/40 items-center justify-center px-8">
            <TouchableWithoutFeedback>
              <View className="w-[272px] bg-[#F2F2F2] rounded-[14px] overflow-hidden shadow-2xl">
                {/* Content Area */}
                <View className="pt-5 px-4 pb-4 items-center">
                  <Text
                    className="text-[17px] text-[#000000] text-center mb-1.5"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    {dialog?.title}
                  </Text>
                  <Text
                    className="text-[13px] text-[#3C3C43] text-center leading-5"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    {dialog?.message}
                  </Text>
                </View>

                {/* Hairline Divider */}
                <View className="h-[0.5px] bg-[#3C3C43]/20" />

                {/* Action Buttons */}
                {dialog && dialog.buttons.length > 2 ? (
                  <View>
                    {dialog.buttons.map((btn, index) => (
                      <View key={btn.text}>
                        {index > 0 ? (
                          <View className="h-[0.5px] bg-[#3C3C43]/20" />
                        ) : null}
                        <TouchableOpacity
                          onPress={() => {
                            triggerHaptic();
                            btn.onPress();
                          }}
                          activeOpacity={0.7}
                          className="h-[44px] items-center justify-center active:bg-black/5"
                        >
                          <Text
                            className={`text-[17px] ${
                              btn.style === "destructive"
                                ? "text-[#FF3B30]"
                                : "text-[#007AFF]"
                            }`}
                            style={{
                              fontFamily:
                                btn.style === "cancel"
                                  ? "Outfit_400Regular"
                                  : "Outfit_600SemiBold",
                            }}
                          >
                            {btn.text}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : dialog && dialog.buttons.length === 2 ? (
                  <View className="flex-row h-[44px]">
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        dialog.buttons[0].onPress();
                      }}
                      activeOpacity={0.7}
                      className="flex-1 items-center justify-center border-r border-[#3C3C43]/20 active:bg-black/5"
                    >
                      <Text
                        className="text-[17px] text-[#007AFF]"
                        style={{
                          fontFamily:
                            dialog.buttons[0].style === "cancel"
                              ? "Outfit_400Regular"
                              : "Outfit_600SemiBold",
                        }}
                      >
                        {dialog.buttons[0].text}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        dialog.buttons[1].onPress();
                      }}
                      activeOpacity={0.7}
                      className="flex-1 items-center justify-center active:bg-black/5"
                    >
                      <Text
                        className={`text-[17px] ${
                          dialog.buttons[1].style === "destructive"
                            ? "text-[#FF3B30]"
                            : "text-[#007AFF]"
                        }`}
                        style={{
                          fontFamily:
                            dialog.buttons[1].style === "cancel"
                              ? "Outfit_400Regular"
                              : "Outfit_600SemiBold",
                        }}
                      >
                        {dialog.buttons[1].text}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : dialog && dialog.buttons.length === 1 ? (
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      dialog.buttons[0].onPress();
                    }}
                    activeOpacity={0.7}
                    className="h-[44px] items-center justify-center active:bg-black/5"
                  >
                    <Text
                      className="text-[17px] text-[#007AFF]"
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                    >
                      {dialog.buttons[0].text}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
