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

export default function PrivacyScreen() {
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
          Effective Date: October 24, 2026
        </Text>

        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-5"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          At Mark-X, your privacy is our foundational commitment. This Privacy Policy outlines how your personal data is collected, processed, and safeguarded across all features of the Mark-X digital workspace—including Smart Notes, Cloud Drive, Media Gallery, and Security Vault. We operate in full compliance with global privacy standards, including India&apos;s Digital Personal Data Protection (DPDP) Act 2023, the European General Data Protection Regulation (GDPR), and the California Consumer Privacy Act (CCPA/CPRA).
        </Text>

        <Section title="1. INFORMATION WE COLLECT & PURPOSE">
          Mark-X operates under a data-minimization model, collecting only information necessary to deliver and protect your personal digital workspace:
          {"\n\n"}• Account Identity: Email address, display name, and avatar picture provided via Firebase Authentication or Google Sign-In to verify and secure your user account.
          {"\n"}• Smart Notes & Checklists: Note titles, rich markdown content, interactive checklist task states, tags, and pinned statuses created in your personal editor.
          {"\n"}• Cloud Drive Files: Uploaded documents (PDFs, DOCX, XLSX, TXT, CSV), images, audio, video files, custom folder hierarchies, and associated file metadata (size, MIME type, timestamps).
          {"\n"}• Media Gallery: Encrypted photos, videos, album collections, and visual pins.
          {"\n"}• Device & Session Telemetry: Hardware device model, operating system version, app build number, and session tokens used strictly to display your active device sessions and allow remote device revocation.
        </Section>

        <Section title="2. LOCAL-FIRST CACHING & CLOUD SYNCHRONIZATION">
          Mark-X is architected with a local-first design:
          {"\n\n"}• Offline Local Storage: Your notes, recent drive documents, and media thumbnails are cached locally on your physical device using sandboxed internal storage and SQLite databases. This allows you to create, view, and modify your notes and files even without network connectivity.
          {"\n"}• Resilient Cloud Sync: When your device connects to the internet, local updates are securely synced with Mark-X Cloud Vault (Firebase Firestore and Firebase Storage) using transport layer security (TLS 1.3).
          {"\n"}• Conflict Resolution: Timestamp-based synchronization ensures that your most recent modifications across devices are preserved without data loss or accidental overwrites.
        </Section>

        <Section title="3. GOOGLE DRIVE & THIRD-PARTY SERVICES">
          Mark-X provides optional integration with external cloud storage:
          {"\n\n"}• Google Drive Integration: If you connect Google Drive to Mark-X, our application requests only the limited, user-approved &quot;drive.file&quot; scope (https://www.googleapis.com/auth/drive.file). Mark-X only creates, accesses, or manages files specifically created by or opened with Mark-X. We do NOT read, scan, or catalog your broader personal Google Drive files or folders.
          {"\n"}• Google API Limited Use Policy: Mark-X&apos;s use and transfer of information received from Google APIs to any other app adheres to the Google API Services User Data Policy, including the Limited Use requirements.
          {"\n"}• Infrastructure Partners: We utilize Google Cloud Firebase (Authentication, Firestore, Cloud Storage) for secure encrypted infrastructure under strict data-protection agreements.
        </Section>

        <Section title="4. ZERO AD TRACKING & NO AI TRAINING ON YOUR CONTENT">
          Mark-X is a private utility, not an advertising platform:
          {"\n\n"}• Zero Ads & Zero Brokers: Mark-X contains zero third-party advertising trackers, marketing SDKs, or data-broker integrations. We do not sell, rent, or trade your personal data.
          {"\n"}• No AI Training on Vault Content: We will NEVER use your personal notes, checklists, documents, or media gallery assets to train artificial intelligence models or machine learning algorithms without your explicit, opt-in consent.
        </Section>

        <Section title="5. HARDWARE-LEVEL BIOMETRIC PRIVACY">
          When you enable Biometric Lock (Face ID, Fingerprint, or Iris scanning) within Profile &gt; Security, biometric verification is executed entirely on your local device via the native hardware Secure Enclave (iOS) or Android Keystore / BiometricPrompt. Mark-X never accesses, captures, or transmits your raw biometric templates or fingerprint hashes to external servers.
        </Section>

        <Section title="6. DATA RETENTION & YOUR RIGHT TO ERASE (DPDP ACT / GDPR)">
          You retain 100% control and ownership of your personal data:
          {"\n\n"}• Right to Access & Export: You can view and export any document or note at any time directly from the app to external storage or third-party apps.
          {"\n"}• Right to Immediate Erasure: You have the right to permanently erase your data at any time. When you select &quot;Deactivate Account&quot; in Profile &gt; Security &amp; Privacy, Mark-X permanently wipes your authentication account, Firestore note collections, Cloud Storage files, device session records, and local device caches. This erasure is permanent and irreversible.
        </Section>

        <Section title="7. SECURITY SAFEGUARDS & MULTI-DEVICE PROTECTION">
          We implement industry-grade defense-in-depth measures:
          {"\n\n"}• End-to-End Encryption: All data in transit is encrypted using TLS 1.3, and all stored data is encrypted at rest using AES-256.
          {"\n"}• Remote Session Revocation: You can view all hardware devices logged into your account in real-time under Security &gt; Active Devices and instantly terminate any session remotely.
          {"\n"}• Firebase App Check: API endpoints are guarded against automated abuse and unauthorized access.
        </Section>

        <Section title="8. CONTACT DATA PRIVACY OFFICER" last>
          If you have questions, feedback, or wish to exercise your data protection rights under the DPDP Act 2023, GDPR, or CCPA, please contact our Data Protection Officer directly at privacy@mark-x.app.
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
