import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { triggerHaptic } from "../../utils/haptics";

export type OptionModalType =
  | "password"
  | "terms"
  | "help"
  | "about"
  | "logout"
  | null;

interface ProfileOptionsModalProps {
  type: OptionModalType;
  visible: boolean;
  onClose: () => void;
  userEmail?: string | null;
  onSendPasswordReset?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
}

export function ProfileOptionsModal({
  type,
  visible,
  onClose,
  userEmail,
  onSendPasswordReset,
  onSignOut,
}: ProfileOptionsModalProps) {
  const insets = useSafeAreaInsets();
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!visible || !type) return null;

  const handleResetPassword = async () => {
    triggerHaptic();
    setIsSendingReset(true);
    try {
      if (onSendPasswordReset) {
        await onSendPasswordReset();
        Alert.alert(
          "Password Reset Sent",
          `A password reset link has been sent to ${userEmail || "your email address"}.`
        );
        onClose();
      }
    } catch (err: any) {
      Alert.alert("Reset Error", err.message || "Failed to send reset email.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleConfirmLogout = async () => {
    triggerHaptic();
    setIsLoggingOut(true);
    try {
      onClose();
      if (onSignOut) {
        await onSignOut();
      }
    } catch (err: any) {
      Alert.alert("Sign Out Error", err.message || "Failed to sign out.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case "password":
        return "Login & Security";
      case "terms":
        return "Terms & Conditions";
      case "help":
        return "Help & Support";
      case "about":
        return "About Mark-X";
      case "logout":
        return "Log Out";
      default:
        return "";
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        {/* Backdrop tap to dismiss */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1"
        />

        <View
          className="bg-white rounded-t-[28px] px-5 pt-3"
          style={{
            maxHeight: "82%",
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          }}
        >
          {/* Grab handle indicator */}
          <View className="items-center py-2">
            <View className="w-10 h-1.5 rounded-full bg-[#E5E7EB]" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between py-3 border-b border-[#F3F4F6] mb-4">
            <Text
              className="text-[20px] text-[#111111]"
              style={{ fontFamily: "Outfit_700Bold" }}
            >
              {getTitle()}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-8 h-8 rounded-full bg-[#F3F4F6] items-center justify-center"
            >
              <Ionicons name="close" size={18} color="#111111" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Password & Security */}
            {type === "password" && (
              <View className="py-2">
                <View className="w-12 h-12 rounded-2xl bg-[#EFF6FF] items-center justify-center mb-3">
                  <Ionicons name="lock-closed-outline" size={24} color="#2563EB" />
                </View>
                <Text
                  className="text-[17px] text-[#111111] mb-1.5"
                  style={{ fontFamily: "Outfit_600SemiBold" }}
                >
                  Reset Password
                </Text>
                <Text
                  className="text-[14px] text-[#6B7280] leading-5 mb-5"
                  style={{ fontFamily: "Outfit_400Regular" }}
                >
                  We will send a password reset email to{" "}
                  <Text className="text-[#111111] font-semibold">
                    {userEmail || "your account email"}
                  </Text>
                  . Click the link in the message to update your password.
                </Text>

                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={isSendingReset}
                  activeOpacity={0.8}
                  className="w-full bg-[#111111] py-3.5 rounded-xl items-center justify-center"
                >
                  <Text
                    className="text-[15px] text-white"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    {isSendingReset ? "Sending Link..." : "Send Password Reset Email"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Terms & Conditions */}
            {type === "terms" && (
              <View className="py-2">
                <Text
                  className="text-[14px] text-[#4B5563] leading-6 mb-4"
                  style={{ fontFamily: "Outfit_400Regular" }}
                >
                  Welcome to Mark-X. By accessing and using our application, you
                  agree to comply with our Terms of Service and Privacy Policy.
                  All your files, images, and notes are encrypted and remain your
                  sole property.
                </Text>
                <Text
                  className="text-[14px] text-[#4B5563] leading-6 mb-6"
                  style={{ fontFamily: "Outfit_400Regular" }}
                >
                  We implement industry-standard encryption protocols to protect
                  your personal data against unauthorized access, loss, or
                  misuse.
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.8}
                  className="w-full bg-[#111111] py-3.5 rounded-xl items-center justify-center"
                >
                  <Text
                    className="text-[15px] text-white"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Got It
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Help & Support */}
            {type === "help" && (
              <View className="py-1">
                <View className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB] mb-3">
                  <Text
                    className="text-[15px] text-[#111111] mb-1"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    How is my data secured?
                  </Text>
                  <Text
                    className="text-[13px] text-[#4B5563] leading-5"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    Files, notes, and photos in Mark-X are encrypted and linked
                    solely to your authenticated account.
                  </Text>
                </View>

                <View className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB] mb-4">
                  <Text
                    className="text-[15px] text-[#111111] mb-1"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    How does Biometric Lock work?
                  </Text>
                  <Text
                    className="text-[13px] text-[#4B5563] leading-5"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    Biometric Lock checks your device's fingerprint or Face ID
                    whenever you open Mark-X to keep your vault private.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic();
                    Alert.alert(
                      "Support Contact",
                      "Reach out directly at support@mark-x.app for any help or bug reports."
                    );
                  }}
                  activeOpacity={0.8}
                  className="bg-[#111111] py-3.5 rounded-xl items-center justify-center flex-row"
                >
                  <Ionicons
                    name="mail-outline"
                    size={17}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className="text-[15px] text-white"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Contact Support
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* About Mark-X */}
            {type === "about" && (
              <View className="py-2 items-center">
                <View className="w-16 h-16 rounded-2xl bg-[#111111] items-center justify-center mb-3">
                  <Ionicons name="sparkles" size={28} color="#C6F043" />
                </View>
                <Text
                  className="text-[20px] text-[#111111] mb-0.5"
                  style={{ fontFamily: "Outfit_700Bold" }}
                >
                  Mark-X
                </Text>
                <Text
                  className="text-[13px] text-[#717171] mb-5"
                  style={{ fontFamily: "Outfit_400Regular" }}
                >
                  Version 1.0.0
                </Text>

                <View className="w-full bg-[#F9FAFB] rounded-2xl p-4 border border-[#E5E7EB] mb-4">
                  <Text
                    className="text-[14px] text-[#374151] leading-6"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    Mark-X is a unified productivity suite with high-speed cloud
                    drive, smart notes, creative inspiration board, and seamless
                    attendance tracking.
                  </Text>
                </View>

                <View className="w-full bg-[#F9FAFB] rounded-2xl p-3.5 border border-[#E5E7EB] mb-5">
                  <View className="flex-row items-center justify-between py-1.5 border-b border-[#E5E7EB]">
                    <Text
                      className="text-[14px] text-[#717171]"
                      style={{ fontFamily: "Outfit_400Regular" }}
                    >
                      Platform
                    </Text>
                    <Text
                      className="text-[14px] text-[#111111]"
                      style={{ fontFamily: "Outfit_500Medium" }}
                    >
                      React Native (Expo)
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between py-1.5 border-b border-[#E5E7EB]">
                    <Text
                      className="text-[14px] text-[#717171]"
                      style={{ fontFamily: "Outfit_400Regular" }}
                    >
                      Security
                    </Text>
                    <Text
                      className="text-[14px] text-[#111111]"
                      style={{ fontFamily: "Outfit_500Medium" }}
                    >
                      Encrypted Cloud Vault
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between py-1.5">
                    <Text
                      className="text-[14px] text-[#717171]"
                      style={{ fontFamily: "Outfit_400Regular" }}
                    >
                      Developer
                    </Text>
                    <Text
                      className="text-[14px] text-[#111111]"
                      style={{ fontFamily: "Outfit_500Medium" }}
                    >
                      Prashant Jaybhaye
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.8}
                  className="w-full bg-[#111111] py-3.5 rounded-xl items-center justify-center"
                >
                  <Text
                    className="text-[15px] text-white"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Logout Confirmation */}
            {type === "logout" && (
              <View className="py-2">
                <Text
                  className="text-[15px] text-[#4B5563] leading-6 mb-6"
                  style={{ fontFamily: "Outfit_400Regular" }}
                >
                  Are you sure you want to log out? You can sign back in anytime
                  with your credentials.
                </Text>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={onClose}
                    activeOpacity={0.7}
                    className="flex-1 bg-[#F3F4F6] py-3.5 rounded-xl items-center justify-center"
                  >
                    <Text
                      className="text-[15px] text-[#111111]"
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirmLogout}
                    disabled={isLoggingOut}
                    activeOpacity={0.8}
                    className="flex-1 bg-[#EF4444] py-3.5 rounded-xl items-center justify-center"
                  >
                    <Text
                      className="text-[15px] text-white"
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                    >
                      {isLoggingOut ? "Logging Out..." : "Log Out"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
