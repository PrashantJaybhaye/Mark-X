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

import { useAuth } from "../../context/AuthContext";
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

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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
      router.replace(user ? "/(main)/profile" : "/(auth)/login");
    }
  };

  const handleCopySource = async () => {
    triggerHaptic();
    await Clipboard.setStringAsync("https://mark-x.app/terms");
    setDialog({
      title: "Link Copied",
      message: "The official terms link has been copied to your clipboard.",
      actions: [{ text: "OK", style: "default", bold: true, onPress: closeDialog }],
    });
  };

  const handleContactSupport = () => {
    triggerHaptic();
    setDialog({
      title: "Contact Team",
      message:
        "Have questions about your data, privacy, or security? Reach out directly to support@mark-x.app.",
      actions: [
        { text: "Cancel", style: "cancel", onPress: closeDialog },
        {
          text: "Copy Email",
          style: "default",
          bold: true,
          onPress: async () => {
            await Clipboard.setStringAsync("support@mark-x.app");
            setDialog({
              title: "Email Copied",
              message: "support@mark-x.app copied to clipboard.",
              actions: [{ text: "OK", style: "default", bold: true, onPress: closeDialog }],
            });
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

          <View
            style={{ position: "absolute", left: 0, right: 0 }}
            className="items-center justify-center"
            pointerEvents="none"
          >
            <Text
              className="text-[17px] text-[#111111]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Terms of Service
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
          TERMS OF SERVICE
        </Text>

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
              https://mark-x.app/terms
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          className="text-[14px] text-[#111111] mb-6"
          style={{ fontFamily: "Outfit_600SemiBold", fontStyle: "italic" }}
        >
          Last Updated: October 24, 2026
        </Text>

        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-5"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          Welcome to Mark-X. We built Mark-X as an intelligent, unified digital workspace that seamlessly brings together Smart Notes, Cloud Drive file management, Media Gallery curation, and hardware-grade security. We believe terms of service should be clear, transparent, and written for human beings—without hidden clauses or deceptive legalese.
        </Text>
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-6"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          By creating an account or using Mark-X, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, please discontinue using the service.
        </Text>

        <Text
          className="text-[14px] text-[#000000] leading-[22px] mb-7"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          YOU RETAIN 100% EXCLUSIVE OWNERSHIP OF YOUR NOTES, CHECKLISTS, FILES, AND MEDIA. WE DO NOT MONETIZE YOUR PRIVATE CONTENT, WE DO NOT SELL YOUR DATA, AND WE WILL NEVER USE YOUR PERSONAL VAULT TO TRAIN ARTIFICIAL INTELLIGENCE MODELS.
        </Text>

        <Section title="1. YOUR CONTENT & COMPLETE OWNERSHIP">
          Everything you create, write, upload, or organize within Mark-X belongs exclusively to you:
          {"\n\n"}• Smart Notes & Checklists: All thoughts, markdown notes, code snippets, and checklists created in the notes editor remain your intellectual property.
          {"\n"}• Cloud Drive Documents: All PDF files, spreadsheets, documents, archives, and custom folder layouts stored in your drive belong entirely to you.
          {"\n"}• Media Gallery: High-resolution photos, 4K videos, and visual albums remain yours. Mark-X claims zero license or ownership rights over your content.
        </Section>

        <Section title="2. WORKSPACE FEATURES & MODULES">
          Mark-X provides an integrated suite of productivity tools:
          {"\n\n"}• Smart Notes: An interactive Markdown editor featuring live preview formatting, rich checklists, tag filtering, and note pinning.
          {"\n"}• Cloud Drive: A structured file manager supporting multiple document types, breadcrumb folder navigation, multi-item operations, and in-app file previews.
          {"\n"}• Media Gallery: A high-performance media viewer supporting image zoom, HD video playback, and visual album curation.
          {"\n"}• Security Vault: Biometric app locking, multi-device management, and instant account deactivation.
        </Section>

        <Section title="3. LOCAL-FIRST OFFLINE USE & RESILIENT CLOUD SYNC">
          Mark-X employs a hybrid local-first architecture:
          {"\n\n"}• Offline Availability: Recent notes and files are cached in sandboxed local device storage. You can draft notes, check off tasks, and view cached documents without an internet connection.
          {"\n"}• Automatic Cloud Sync: Whenever your device reconnects to the network, your changes synchronize automatically with Mark-X Cloud Vault over encrypted TLS 1.3 channels.
          {"\n"}• Conflict Resolution: When simultaneous edits occur across devices, Mark-X resolves them using timestamp-based reconciliation to prevent unintended overwrites.
        </Section>

        <Section title="4. GOOGLE DRIVE & THIRD-PARTY CLOUD INTEGRATION">
          Mark-X offers optional integration with third-party cloud providers, including Google Drive:
          {"\n\n"}• Limited Scope: Linking Google Drive grants Mark-X only the restricted &quot;drive.file&quot; permission. Mark-X only accesses files created or opened through our application.
          {"\n"}• Compliance with Google Policies: Mark-X complies fully with the Google API Services User Data Policy, including the Limited Use requirements.
          {"\n"}• User Revocation: You may disconnect third-party cloud providers at any time through your Google account security settings or app preferences.
        </Section>

        <Section title="5. BIOMETRIC SECURITY & MULTI-DEVICE MANAGEMENT">
          We provide enterprise-class control over your sessions:
          {"\n\n"}• Hardware Biometric Lock: When enabled, unlocking Mark-X uses your device&apos;s native Face ID or Fingerprint hardware (Secure Enclave or Keystore). Biometric data is never transmitted to our servers.
          {"\n"}• Multi-Device Session Control: You can review every hardware device currently signed into your account. You possess the right to remotely terminate and revoke any session immediately from Profile &gt; Active Devices.
        </Section>

        <Section title="6. RESPONSIBLE USAGE & FAIR USE">
          Mark-X is designed for personal productivity and secure file organization. By using the service, you agree not to:
          {"\n\n"}• Store, host, or distribute malicious software, viruses, or exploit payloads.
          {"\n"}• Attempt unauthorized penetration testing or denial-of-service attacks against Mark-X servers or databases.
          {"\n"}• Use the service to store or transmit material that violates applicable local or international laws.
          {"\n"}• Attempt to reverse engineer or extract the source code of our backend cloud infrastructure.
        </Section>

        <Section title="7. DATA PORTABILITY & IRREVERSIBLE ACCOUNT DELETION">
          You are never locked into the Mark-X ecosystem:
          {"\n\n"}• Exporting Data: You can export your documents, notes, and media at any time to your device storage or other apps.
          {"\n"}• Permanent Deletion: In compliance with GDPR Article 17 and the DPDP Act 2023, you can permanently delete your account directly from Profile &gt; Security &amp; Privacy &gt; Deactivate Account. Upon confirmation, your user credentials, notes, drive files, gallery assets, and session records are immediately and irreversibly wiped from our servers.
        </Section>

        <Section title="8. SERVICE AVAILABILITY & DISCLAIMERS">
          While we maintain rigorous cloud infrastructure with automated backups and high availability, Mark-X is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We recommend maintaining external backups of mission-critical files. To the maximum extent permitted by law, Mark-X disclaims liability for indirect, incidental, or consequential damages resulting from service interruptions or device malfunctions.
        </Section>

        <Section title="9. TRANSPARENT UPDATES TO TERMS" last>
          As we release new features or adapt to legal regulations, we may update these Terms of Service. When material changes occur, we will provide conspicuous in-app notifications so you are always informed of your rights.
        </Section>

        <View className="border-t border-[#E5E7EB] pt-6 items-center">
          <TouchableOpacity
            onPress={handleContactSupport}
            activeOpacity={0.7}
            className="py-2 px-4"
          >
            <Text
              className="text-[14px] text-[#4B5563]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Have questions or feedback?{" "}
              <Text
                className="text-[#000000] underline"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Contact Support
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
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
