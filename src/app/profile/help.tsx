import React, { useState } from "react";
import {
  Linking,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import { useAuth } from "../../context/AuthContext";
import { IosDialog, IosDialogAction } from "../../components/common/IosDialog";
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

const FAQS: FAQItem[] = [
  {
    id: "1",
    question: "How do Smart Notes and Checklists work?",
    answer:
      "Mark-X notes feature rich Markdown formatting including headers, quotes, numbered/bulleted lists, and interactive checklists. Tap any checkbox directly to toggle tasks. Notes save instantly to local storage and sync with Cloud Vault when connected.",
  },
  {
    id: "2",
    question: "What files can I store and preview in Cloud Drive?",
    answer:
      "Cloud Drive supports PDFs, Office documents (DOCX, XLSX, PPTX), plain text/Markdown, images, audio, and videos. You can view documents directly within Mark-X using the integrated document viewer or open them with external native apps.",
  },
  {
    id: "3",
    question: "How does Google Drive integration work?",
    answer:
      "Connecting Google Drive lets you import and sync files directly with your workspace. Mark-X requests only the narrow 'drive.file' scope, meaning it only accesses files you explicitly create or open with Mark-X, never your broader Google Drive library.",
  },
  {
    id: "4",
    question: "Does Mark-X work completely offline?",
    answer:
      "Yes! Mark-X is local-first. You can create or edit Smart Notes, check off tasks, and view recently cached drive documents and gallery pins without any internet connection. All changes automatically sync to the cloud once you reconnect.",
  },
  {
    id: "5",
    question: "How does Biometric Lock & Auto-Lock work?",
    answer:
      "You can secure Mark-X with Face ID or Fingerprint under Profile > Security. You can also customize the Auto-Lock timeout (Immediately, 1 min, 5 mins, or 15 mins). All biometric operations run exclusively inside your device's native hardware Secure Enclave.",
  },
  {
    id: "6",
    question: "How do I manage active devices or remotely sign out?",
    answer:
      "Go to Profile > Active Devices to view every hardware device signed into your account, including device model, OS, and last active time. You can tap 'Revoke' to terminate and log out any session remotely.",
  },
  {
    id: "7",
    question: "Can I export my data or permanently delete my account?",
    answer:
      "Yes! Mark-X guarantees 100% data portability. You can export notes and drive files anytime. If you wish to permanently delete your account, visit Profile > Security & Privacy > Deactivate Account. All your cloud and local records will be permanently wiped immediately.",
  },
  {
    id: "8",
    question: "How does 'Clear Cache' help my device?",
    answer:
      "Tapping 'Clear Cache' under Profile > Security & Devices safely frees up local storage by purging temporary images and media thumbnails. Your actual cloud notes, drive documents, and gallery photos remain completely untouched in Cloud Vault.",
  },
];

const TOPICS: TopicItem[] = [
  {
    id: "t1",
    title: "Getting Started with Mark-X",
    description:
      "Explore the core workspace: drafting rich Markdown notes with interactive checklists, organizing documents in Cloud Drive folders, curating visual albums in Gallery, and managing your profile.",
  },
  {
    id: "t2",
    title: "Cloud Sync & Offline Architecture",
    description:
      "Understand how local SQLite storage and Firebase Cloud Vault keep your data accessible offline, resolve multi-device sync conflicts, and protect notes with end-to-end transport encryption.",
  },
  {
    id: "t3",
    title: "Security, Biometrics & Session Control",
    description:
      "Learn about hardware Secure Enclave authentication, configuring auto-lock timers, inspecting active hardware devices in real time, and revoking unauthorized sessions.",
  },
  {
    id: "t4",
    title: "Data Rights & Account Erasure",
    description:
      "Learn how to export files and notes, withdraw consent, and permanently delete your account in accordance with GDPR and India's Digital Personal Data Protection (DPDP) Act 2023.",
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [dialog, setDialog] = useState<{ title: string; message: string; actions?: IosDialogAction[] } | null>(null);

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

  const handleOpenFaq = (faq: FAQItem) => {
    triggerHaptic();
    setDialog({
      title: faq.question,
      message: faq.answer,
      actions: [{ text: "OK", style: "default", bold: true, onPress: () => setDialog(null) }],
    });
  };

  const handleOpenTopic = (topic: TopicItem) => {
    triggerHaptic();
    setDialog({
      title: topic.title,
      message: topic.description,
      actions: [{ text: "OK", style: "default", bold: true, onPress: () => setDialog(null) }],
    });
  };

  const handleContactSupport = () => {
    triggerHaptic();
    const supportEmail = "support@mark-x.app";
    const mailtoUrl = `mailto:${supportEmail}?subject=Mark-X%20Support%20Request`;

    setDialog({
      title: "Contact Support",
      message: "Our engineering and support team typically responds within a few hours. How would you like to get in touch?",
      actions: [
        { text: "Cancel", style: "cancel", onPress: () => setDialog(null) },
        {
          text: "Copy Email",
          style: "default",
          onPress: async () => {
            await Clipboard.setStringAsync(supportEmail);
            setDialog({
              title: "Email Copied",
              message: "support@mark-x.app copied to your clipboard.",
              actions: [{ text: "OK", style: "default", bold: true, onPress: () => setDialog(null) }],
            });
          },
        },
        {
          text: "Open Mail",
          style: "default",
          bold: true,
          onPress: async () => {
            setDialog(null);
            const canOpen = await Linking.canOpenURL(mailtoUrl);
            if (canOpen) {
              await Linking.openURL(mailtoUrl);
            } else {
              await Clipboard.setStringAsync(supportEmail);
              setDialog({
                title: "Mail App Unavailable",
                message: "No default mail client found. We copied support@mark-x.app to your clipboard.",
                actions: [{ text: "OK", style: "default", bold: true, onPress: () => setDialog(null) }],
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

      <View
        style={{ paddingTop: topInset + 8 }}
        className="bg-white px-4 pb-3.5 border-b border-[#F1F5F9]"
      >
        <View className="flex-row items-center justify-between min-h-[44px] relative">
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
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
        <View className="mt-1 mb-7">
          <Text
            className="text-[32px] text-[#111111] tracking-tight leading-[38px]"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Hey there.{"\n"}How can we help?
          </Text>
        </View>

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

      <IosDialog
        visible={dialog !== null}
        title={dialog?.title || ""}
        message={dialog?.message}
        actions={dialog?.actions}
        onClose={() => setDialog(null)}
      />
    </View>
  );
}
