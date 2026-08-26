import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

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

  const triggerHaptic = async (
    style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
  ) => {
    try {
      await Haptics.impactAsync(style);
    } catch {
      Vibration.vibrate(Platform.OS === "android" ? 25 : 15);
    }
  };

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

      {/* Background image mimicking the underlying screen */}
      <ImageBackground
        source={require("../../../assets/images/VerifyBG.png")}
        className="absolute inset-0"
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-black/40" />
      </ImageBackground>

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
              className="w-8 h-8 rounded-full bg-[#2C2C2E] items-center justify-center"
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Typography Header */}
          <Text allowFontScaling={false} style={styles.title}>
            VERIFY YOUR EMAIL
          </Text>

          <Text allowFontScaling={false} style={styles.subtitle}>
            We sent you a verification link to your email address.
          </Text>

          {/* Email Display (Input Style) */}
          <View className="w-full mb-3">
            <Text style={styles.inputLabel}>Email</Text>
            <View className="border-b border-[#38383A] pb-3">
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={styles.inputText}
              >
                {user?.email || "your email address"}
              </Text>
            </View>
          </View>

          {/* Spam / Junk Notice */}
          <Text allowFontScaling={false} style={styles.spamNotice}>
            Didn't receive the email? Please check your Spam folder.
          </Text>

          {/* Status Message */}
          <View className="min-h-[24px] justify-center items-center mb-4">
            <Text
              allowFontScaling={false}
              style={[
                styles.statusText,
                isSuccess ? styles.statusSuccess : styles.statusError,
                !statusMessage && styles.statusHidden,
              ]}
            >
              {statusMessage || " "}
            </Text>
          </View>

          {/* Actions */}
          <TouchableOpacity
            onPress={handleCheckVerification}
            disabled={isChecking}
            activeOpacity={0.85}
            className="h-14 bg-white rounded-[18px] justify-center items-center mb-3"
          >
            {isChecking ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text allowFontScaling={false} style={styles.primaryButtonText}>
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
                style={[
                  styles.secondaryButtonText,
                  resendCooldown > 0 && styles.secondaryDisabledText,
                ]}
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

const styles = StyleSheet.create({
  closeButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#8E8E93",
  },
  title: {
    fontFamily: "Anton_400Regular",
    fontSize: 34,
    lineHeight: 38,
    color: "#FFFFFF",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    lineHeight: 22,
    color: "#8E8E93",
    marginBottom: 30,
  },
  inputLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 8,
  },
  inputText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 17,
    color: "#FFFFFF",
  },
  spamNotice: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#8E8E93",
    marginTop: 4,
    marginBottom: 8,
  },
  statusText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  statusSuccess: {
    color: "#32D74B",
  },
  statusError: {
    color: "#FF3B30",
  },
  statusHidden: {
    opacity: 0,
  },
  primaryButtonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 17,
    color: "#000000",
  },
  secondaryButtonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: "#8E8E93",
  },
  secondaryDisabledText: {
    color: "#48484A",
  },
});
