import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../context/AuthContext";
import { triggerHaptic } from "../../utils/haptics";

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, reloadUser, sendVerificationEmail, signOut } = useAuth();

  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-dismiss status message after 4s
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => {
      setStatusMessage(null);
      setIsSuccess(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleCheckVerification = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setIsChecking(true);
    setStatusMessage(null);

    try {
      const verified = await reloadUser();
      if (verified) {
        setIsSuccess(true);
        setStatusMessage("Email verified successfully!");
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(() => {
          router.replace("/");
        }, 1200);
      } else {
        setIsSuccess(false);
        setStatusMessage("Not verified yet. Please tap the link in the email.");
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (err: any) {
      setIsSuccess(false);
      setStatusMessage(err?.message || "Failed to check verification status.");
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setIsResending(true);
    setStatusMessage(null);

    try {
      await sendVerificationEmail();
      setIsSuccess(true);
      setStatusMessage("Verification email sent! Check your inbox or spam folder.");
      setResendCooldown(30);
    } catch (err: any) {
      setIsSuccess(false);
      setStatusMessage(err?.message || "Failed to send verification email.");
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    } finally {
      setIsResending(false);
    }
  };

  const handleClose = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <View className="flex-1 bg-[#1A1A24]">
      <StatusBar style="light" />

      {/* High-Performance Instant Background Image */}
      <View className="absolute inset-0">
        <Image
          source={require("../../../assets/images/VerifyBG.webp")}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          contentFit="cover"
          priority="high"
          cachePolicy="memory-disk"
        />
        <View className="absolute inset-0 bg-black/40" />
      </View>

      {/* Bottom Sheet Modal */}
      <View className="flex-1 justify-end">
        <View
          className="bg-[#1C1C1E] rounded-t-[40px] px-7 pt-6 w-full"
          style={{ paddingBottom: Math.max(insets.bottom, 24) + 20 }}
        >
          {/* Close Button */}
          <View className="items-end w-full mb-4">
            <TouchableOpacity
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-[#2C2C2E] items-center justify-center active:bg-[#3A3A3C]"
              activeOpacity={0.7}
            >
              <Text
                allowFontScaling={false}
                className="text-[16px] text-[#8E8E93]"
                style={{ fontFamily: "Outfit_700Bold" }}
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* Typography Header */}
          <Text
            allowFontScaling={false}
            className="text-[34px] text-white tracking-[0.6px] leading-[38px] mb-2.5"
            style={{ fontFamily: "Anton_400Regular" }}
          >
            VERIFY YOUR EMAIL
          </Text>

          <Text
            allowFontScaling={false}
            className="text-[15px] text-[#8E8E93] leading-[22px] mb-7"
            style={{ fontFamily: "Outfit_500Medium" }}
          >
            We sent you a verification link to your email address.
          </Text>

          {/* Email Display */}
          <View className="w-full mb-3">
            <Text
              allowFontScaling={false}
              className="text-[13px] text-[#8E8E93] mb-2"
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              Email
            </Text>
            <View className="border-b border-[#38383A] pb-3">
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                className="text-[17px] text-white"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                {user?.email || "your email address"}
              </Text>
            </View>
          </View>

          {/* Spam / Junk Notice */}
          <Text
            allowFontScaling={false}
            className="text-[13px] text-[#8E8E93] leading-[18px] mt-1 mb-2"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            Didn't receive the email? Please check your Spam folder.
          </Text>

          {/* Status Message */}
          <View className="min-h-[24px] justify-center items-center mb-4">
            <Text
              allowFontScaling={false}
              className={`text-[14px] text-center ${
                isSuccess ? "text-[#32D74B]" : "text-[#FF3B30]"
              } ${!statusMessage ? "opacity-0" : "opacity-100"}`}
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              {statusMessage || " "}
            </Text>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            onPress={handleCheckVerification}
            disabled={isChecking}
            activeOpacity={0.85}
            className="h-14 bg-white rounded-[18px] justify-center items-center mb-3 active:bg-white/90"
          >
            {isChecking ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text
                allowFontScaling={false}
                className="text-[17px] text-black"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Continue
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resendCooldown > 0 || isResending}
            activeOpacity={0.7}
            className="py-3 items-center justify-center"
          >
            {isResending ? (
              <ActivityIndicator color="#8E8E93" size="small" />
            ) : (
              <Text
                allowFontScaling={false}
                className={`text-[15px] ${
                  resendCooldown > 0 ? "text-[#48484A]" : "text-[#8E8E93]"
                }`}
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                {resendCooldown > 0
                  ? `Resend Email in ${resendCooldown}s`
                  : "Resend Link"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
