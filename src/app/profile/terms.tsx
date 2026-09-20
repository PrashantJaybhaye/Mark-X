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

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogState = {
  title: string;
  message: string;
  actions?: IosDialogAction[];
} | null;

// ─── Section helper ───────────────────────────────────────────────────────────

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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TermsScreen() {
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
            className="w-10 h-10 items-center justify-center z-10"
          >
            <Ionicons name="chevron-back" size={24} color="#111111" />
          </TouchableOpacity>

          {/* Centered title — absolutely positioned so it never shifts with the back button */}
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

          {/* Spacer to balance the back button */}
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
          TERMS OF SERVICE
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
              https://mark-x.app/terms
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          className="text-[14px] text-[#111111] mb-6"
          style={{ fontFamily: "Outfit_600SemiBold", fontStyle: "italic" }}
        >
          Last Updated: September 20, 2026
        </Text>

        {/* Intro */}
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-5"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          Welcome to Mark-X. We built this application to give you a private,
          fast, and reliable personal vault for your media gallery, documents,
          and secure smart notes. We believe software terms should be
          straightforward, transparent, and written for real humans—not hidden
          behind convoluted corporate jargon.
        </Text>
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-6"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          By creating an account or using Mark-X, you agree to these terms. They
          exist to protect both your privacy and the stability of our platform.
        </Text>

        {/* Core commitment */}
        <Text
          className="text-[14px] text-[#000000] leading-[22px] mb-7"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          YOU RETAIN 100% OWNERSHIP OF YOUR FILES, PHOTOS, VIDEOS, AND NOTES.
          WE DO NOT MONETIZE YOUR PRIVATE CONTENT, WE DO NOT SELL YOUR PERSONAL
          DATA, AND WE WILL NEVER USE YOUR PERSONAL VAULT TO TRAIN ARTIFICIAL
          INTELLIGENCE MODELS.
        </Text>

        <Section title="1. YOUR CONTENT & COMPLETE OWNERSHIP">
          Everything you create, upload, or organize inside Mark-X belongs
          exclusively to you. This includes documents saved in your Drive,
          high-resolution visual and video assets saved to your Media Gallery,
          and thoughts written in your Secure Notes. Mark-X claims zero
          ownership or intellectual property rights over your personal assets.
          When you delete an item, it is permanently purged from your vault.
        </Section>

        <Section title="2. ZERO SURVEILLANCE & AD-FREE PRIVACY">
          We do not sell user data to data brokers, advertising networks, or
          third-party marketing firms. Mark-X operates without behavioral ad
          trackers. Your personal files, photos, videos, and notes are accessed
          only by your authenticated session and are never analyzed or scanned
          for commercial or promotional purposes.
        </Section>

        <Section title="3. HARDWARE-LEVEL BIOMETRIC SECURITY">
          When you enable Biometric Lock (Face ID, Fingerprint, or native
          biometrics) within your Profile, authentication is handled entirely
          within your device's native hardware Secure Enclave. Mark-X never
          transmits, records, or stores your biometric information on external
          servers.
        </Section>

        <Section title="4. HIGH-PERFORMANCE CLOUD VAULT & RESILIENT SYNC">
          Mark-X synchronizes your encrypted data using enterprise-grade Mark-X
          cloud storage infrastructure (TLS 1.3 in transit and AES-256 at
          rest). High-resolution photos and HD/4K videos are delivered with zero
          loss and accurate aspect ratios. To give you uninterrupted access
          without network connectivity, your recent files and media are safely
          cached on your local device.
        </Section>

        <Section title="5. MULTI-DEVICE SESSION MANAGEMENT">
          Mark-X allows you to view all active hardware sessions logged into
          your account in real time. You retain the ability to remotely revoke
          and terminate any session instantly from your Security & Devices
          panel, ensuring complete control over who accesses your vault.
        </Section>

        <Section title="6. RESPONSIBLE USAGE & ACCOUNT INTEGRITY">
          Mark-X is designed for lawful personal organization, creative
          curation, and secure productivity. You agree not to use our cloud
          systems to distribute malware, engage in unauthorized penetration
          attacks against our servers, or host unlawful content. You are
          responsible for maintaining the secrecy of your login credentials.
        </Section>

        <Section title="7. DATA PORTABILITY & ACCOUNT TERMINATION">
          You are never locked into Mark-X. You can export your documents,
          gallery photos, videos, and notes at any time. If you decide to stop
          using Mark-X, you can delete your account from your Profile settings,
          which permanently wipes your user records and storage files from our
          cloud vault.
        </Section>

        <Section title="8. TRANSPARENT UPDATES" last>
          As we release new features and improvements to Mark-X, we may revise
          these terms. Whenever meaningful modifications occur, we will post a
          clear in-app notice so you are always aware of how your rights and
          data are handled.
        </Section>

        {/* Contact footer */}
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
