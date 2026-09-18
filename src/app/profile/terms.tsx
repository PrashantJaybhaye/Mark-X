import React, { useState } from "react";
import {
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

export default function TermsScreen() {
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

  const handleCopySource = async () => {
    triggerHaptic();
    await Clipboard.setStringAsync("https://mark-x.app/terms");
    setDialog({
      title: "Link Copied",
      message: "The official terms link has been copied to your clipboard.",
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
    setDialog({
      title: "Contact Team",
      message:
        "Have questions about your data, privacy, or security? Reach out directly to support@mark-x.app.",
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
            await Clipboard.setStringAsync("support@mark-x.app");
            setDialog({
              title: "Email Copied",
              message: "support@mark-x.app copied to clipboard.",
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
            className="w-10 h-10 items-center justify-center z-10"
          >
            <Ionicons name="chevron-back" size={24} color="#111111" />
          </TouchableOpacity>

          <View className="absolute inset-0 items-center justify-center pointer-events-none">
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

      {/* Editorial Document Body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom + 32, 48),
        }}
      >
        {/* Brand Header */}
        <Text
          className="text-[24px] text-[#000000] text-center tracking-[0.18em] mb-3"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          MARK-X
        </Text>

        {/* Document Title */}
        <Text
          className="text-[28px] text-[#000000] text-center tracking-tight mb-7"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          TERMS OF SERVICE
        </Text>

        {/* Source Link */}
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

        {/* Last Updated */}
        <Text
          className="text-[14px] text-[#111111] mb-6"
          style={{ fontFamily: "Outfit_600SemiBold", fontStyle: "italic" }}
        >
          Last Updated: September 14, 2026
        </Text>

        {/* Humanized Welcome & Core Philosophy */}
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-5"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          Welcome to Mark-X. We built this application to give you a private,
          fast, and reliable personal vault for your files, gallery pins, and
          smart notes. We believe software terms should be straightforward,
          transparent, and written for real humans—not hidden behind convoluted
          corporate jargon.
        </Text>

        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-6"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          By creating an account or using Mark-X, you agree to these terms. They
          exist to protect both your privacy and the stability of our platform.
        </Text>

        {/* Prominent Core Commitment Highlight */}
        <Text
          className="text-[14px] text-[#000000] leading-[22px] mb-7"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          YOU RETAIN 100% OWNERSHIP OF YOUR FILES, PHOTOS, AND NOTES. WE DO NOT
          MONETIZE YOUR PRIVATE CONTENT, WE DO NOT SELL YOUR PERSONAL DATA, AND
          WE WILL NEVER USE YOUR PERSONAL VAULT TO TRAIN ARTIFICIAL INTELLIGENCE
          MODELS.
        </Text>

        {/* Section 1 */}
        <Text
          className="text-[16px] text-[#000000] mb-2"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          1. YOUR CONTENT & COMPLETE OWNERSHIP
        </Text>
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-6"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          Everything you create, upload, or organize inside Mark-X belongs
          exclusively to you. This includes documents saved in your Drive,
          visuals saved to your Gallery pins, and thoughts written in your Smart
          Notes. Mark-X claims zero ownership or intellectual property rights
          over your creative assets. When you delete a file or note, it is
          permanently expunged from your vault.
        </Text>

        {/* Section 2 */}
        <Text
          className="text-[16px] text-[#000000] mb-2"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          2. ZERO SURVEILLANCE & AD-FREE PRIVACY
        </Text>
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-6"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          We do not sell user data to data brokers, advertising networks, or
          third-party marketing firms. Mark-X operates without third-party
          behavioral ad trackers. Your personal files, photos, and notes are
          accessed only by your authenticated session and are never analyzed or
          scanned for promotional purposes.
        </Text>

        {/* Section 3 */}
        <Text
          className="text-[16px] text-[#000000] mb-2"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          3. HARDWARE-LEVEL BIOMETRIC SECURITY
        </Text>
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-6"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          When you enable Biometric Lock (Face ID, Touch ID, or native
          biometrics) within your Profile, authentication is handled entirely
          within your device&apos;s native hardware Secure Enclave. Mark-X never
          transmits, records, or stores your biometric information on external
          servers.
        </Text>

        {/* Section 4 */}
        <Text
          className="text-[16px] text-[#000000] mb-2"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          4. CLOUD SYNC & OFFLINE RESILIENCE
        </Text>
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-6"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          Mark-X synchronizes your encrypted data using enterprise-grade cloud
          infrastructure (TLS 1.3 in transit and AES-256 at rest). To give you
          uninterrupted access without mobile connectivity, your recent files and
          notes are safely cached on your local device. Local caching ensures
          rapid responsiveness while keeping your data confined to your verified
          hardware.
        </Text>

        {/* Section 5 */}
        <Text
          className="text-[16px] text-[#000000] mb-2"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          5. RESPONSIBLE USAGE & ACCOUNT INTEGRITY
        </Text>
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-6"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          Mark-X is designed for lawful personal organization, creative curation,
          and secure productivity. You agree not to use our cloud systems to
          distribute malware, engage in unauthorized penetration attacks against
          our servers, or host unlawful content. You are responsible for
          maintaining the secrecy of your login credentials.
        </Text>

        {/* Section 6 */}
        <Text
          className="text-[16px] text-[#000000] mb-2"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          6. DATA PORTABILITY & ACCOUNT TERMINATION
        </Text>
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-6"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          You are never locked into Mark-X. You can export your documents,
          gallery photos, and notes at any time. If you decide to stop using
          Mark-X, you can delete your account from your Profile settings, which
          permanently wipes your user records and storage files from our cloud
          vault.
        </Text>

        {/* Section 7 */}
        <Text
          className="text-[16px] text-[#000000] mb-2"
          style={{ fontFamily: "Outfit_700Bold" }}
        >
          7. TRANSPARENT UPDATES
        </Text>
        <Text
          className="text-[15px] text-[#1F2937] leading-[25px] mb-8"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          As we release new features and improvements to Mark-X, we may revise
          these terms. Whenever meaningful modifications occur, we will post a
          clear in-app notice so you are always aware of how your rights and
          data are handled.
        </Text>

        {/* Contact Footer */}
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

      {/* iOS Modal Dialog for Dialog Actions */}
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
                {dialog && dialog.buttons.length === 2 ? (
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
