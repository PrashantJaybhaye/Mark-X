import React, { useCallback, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import { IosDialog } from "../../components/common/IosDialog";
import type { IosDialogAction } from "../../components/common/IosDialog";
import { triggerHaptic } from "../../utils/haptics";

type DialogState = {
  title: string;
  message: string;
  actions?: IosDialogAction[];
} | null;

function Section({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <>
      <Text
        className="text-[16px] text-[#000000] mb-2"
        style={{ fontFamily: "Outfit_700Bold" }}
      >
        {title}
      </Text>
      <Text
        className={`text-[15px] text-[#1F2937] leading-[25px] ${last ? "mb-8" : "mb-6"}`}
        style={{ fontFamily: "Outfit_400Regular" }}
      >
        {children}
      </Text>
    </>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [dialog, setDialog] = useState<DialogState>(null);

  const topInset =
    Platform.OS === "android"
      ? Math.max(insets.top, RNStatusBar.currentHeight ?? 24)
      : Math.max(insets.top, 16);

  const closeDialog = useCallback(() => setDialog(null), []);

  const handleDismiss = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/profile");
    }
  };

  const handleCopySource = async () => {
    triggerHaptic();
    await Clipboard.setStringAsync("https://mark-x.app/privacy");
    setDialog({
      title: "Link Copied",
      message: "The official privacy policy link has been copied to your clipboard.",
      actions: [{ text: "OK", style: "default", bold: true, onPress: closeDialog }],
    });
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Nav header */}
      <View
        style={{ paddingTop: topInset + 8 }}
        className="bg-white px-4 pb-3.5 border-b border-[#F1F5F9]"
      >
        <View className="flex-row items-center justify-between min-h-[44px] relative">
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Go back to Profile"
            accessibilityRole="button"
            className="w-10 h-10 items-center justify-center z-10"
          >
            <Ionicons name="chevron-back" size={24} color="#111111" />
          </TouchableOpacity>

          <View
            style={{ position: "absolute", left: 0, right: 0 }}
            className="items-center justify-center"
            pointerEvents="none"
          >
            <Text
              className="text-[17px] text-[#111111]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Privacy Policy
            </Text>
          </View>

          <View className="w-10 h-10" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom + 32, 48),
        }}
      >
        {/* Brand + document title */}
        <Text
          className="text-[24px] text-[#000000] text-center tracking-[0.18em] mb-3"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          MARK-X
        </Text>
        <Text
          className="text-[28px] text-[#000000] text-center tracking-tight mb-7"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          PRIVACY POLICY
        </Text>

        {/* Source link */}
        <View className="flex-row items-center flex-wrap mb-2">
          <Text
            className="text-[14px] text-[#111111]"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Source:{" "}
          </Text>
          <TouchableOpacity onPress={handleCopySource} activeOpacity={0.6}>
            <Text
              className="text-[14px] text-[#111111] underline"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              https://mark-x.app/privacy
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          className="text-[14px] text-[#111111] mb-6"
          style={{ fontFamily: "Outfit_600SemiBold", fontStyle: "italic" }}
        >
          Effective Date: September 26, 2026
        </Text>

        {/* Core summary */}
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-5"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          At Mark-X, we take your personal data privacy seriously. This Privacy Policy outlines how your information is handled in accordance with international digital data standards and local privacy regulations (including India's Digital Personal Data Protection (DPDP) Act 2023 and GDPR).
        </Text>

        <Section title="1. INFORMATION WE COLLECT & PURPOSE">
          Mark-X only collects data necessary to operate your personal vault:
          {"\n"}• Account Identity: Email address, display name, and profile photo for authentication.
          {"\n"}• User Content: Vault files, media gallery photos/videos, and notes created by you.
          {"\n"}• Device Metadata: Hardware device name, OS version, and app release version to manage active logged-in sessions.
        </Section>

        <Section title="2. ZERO AD TRACKING & DATA MINING">
          Mark-X contains zero third-party advertisement trackers, behavioral tracking SDKs, or data brokers. We do not sell, rent, or trade your personal information to third parties under any circumstances.
        </Section>

        <Section title="3. DATA ENCRYPTION & LOCAL SECURITY">
          Your sensitive information is encrypted in transit (TLS 1.3) and at rest (AES-256). Biometric lock verification (Face ID / Fingerprint) is processed entirely locally within your device's native hardware Secure Enclave and is never transmitted to external servers.
        </Section>

        <Section title="4. DATA RETENTION & YOUR RIGHT TO ERASE (DPDP ACT / GDPR)">
          You hold 100% control over your personal data. You have the right to access, export, or permanently erase your data at any time. When you delete files or terminate your Mark-X account, your records and storage files are permanently erased from our servers immediately.
        </Section>

        <Section title="5. CONTACT DATA PRIVACY OFFICER" last>
          If you have questions regarding data protection, consent withdrawal, or privacy rights, please reach out directly to privacy@mark-x.app.
        </Section>
      </ScrollView>

      <IosDialog
        visible={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        actions={dialog?.actions}
        onClose={closeDialog}
      />
    </View>
  );
}
