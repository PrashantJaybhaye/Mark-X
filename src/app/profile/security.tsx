import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { useBiometrics } from "../../context/BiometricsContext";
import { triggerHaptic } from "../../utils/haptics";

type ActiveModal =
  | "reset_password"
  | "auto_lock"
  | "lock_vault"
  | "sign_out"
  | "deactivate"
  | null;

const TIMEOUT_OPTIONS = [
  { label: "Immediately", value: 0 },
  { label: "1 Minute", value: 1 },
  { label: "5 Minutes", value: 5 },
  { label: "15 Minutes", value: 15 },
] as const;

function getTimeoutLabel(minutes: number) {
  switch (minutes) {
    case 0:
      return "Immediately";
    case 1:
      return "1 min";
    case 5:
      return "5 mins";
    case 15:
      return "15 mins";
    default:
      return `${minutes} mins`;
  }
}

export default function SecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, resetPassword, sendVerificationEmail, signOut } = useAuth();
  const {
    isBiometricsEnabled,
    capability,
    setBiometricsEnabled,
    lockTimeoutMinutes,
    setLockTimeout,
    lockApp,
  } = useBiometrics();

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isTogglingBiometrics, setIsTogglingBiometrics] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSendingVerify, setIsSendingVerify] = useState(false);

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) : 16
  );

  const sensorName = capability?.sensorName || "Biometrics";
  const userName = user?.displayName || "User";
  const photoUri = user?.photoURL || user?.providerData?.[0]?.photoURL || null;

  const handleDismiss = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/profile");
    }
  };

  const handleToggleBiometrics = async (val: boolean) => {
    if (isTogglingBiometrics) return;
    triggerHaptic();

    if (val && (!capability?.hasHardware || !capability?.isEnrolled)) {
      Alert.alert(
        "Biometrics Unavailable",
        !capability?.hasHardware
          ? "Your device does not appear to support biometric hardware."
          : "No biometric credentials enrolled. Please register your fingerprint or face in device Settings first."
      );
      return;
    }

    setIsTogglingBiometrics(true);
    try {
      const result = await setBiometricsEnabled(val);
      if (!result.success) {
        if (result.error && result.error !== "Authentication cancelled.") {
          Alert.alert("Verification Failed", result.error);
        }
      }
    } finally {
      setIsTogglingBiometrics(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    setActiveModal(null);
    if (!user?.email) {
      Alert.alert("Error", "No email address associated with this account.");
      return;
    }

    triggerHaptic();
    setIsSendingReset(true);
    try {
      await resetPassword(user.email);
      Alert.alert(
        "Reset Link Dispatched",
        `A secure reset link has been emailed to ${user.email}. Follow the instructions in the email to update your password.`
      );
    } catch (err: any) {
      Alert.alert("Reset Error", err.message || "Failed to send password reset email.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleResendVerification = async () => {
    triggerHaptic();
    setIsSendingVerify(true);
    try {
      await sendVerificationEmail();
      Alert.alert(
        "Verification Link Sent",
        `A verification link has been sent to ${user?.email}. Please check your email to verify your account.`
      );
    } catch (err: any) {
      Alert.alert("Verification Error", err.message || "Could not send verification email.");
    } finally {
      setIsSendingVerify(false);
    }
  };

  const handleOpenAutoLockPicker = () => {
    triggerHaptic();
    setActiveModal("auto_lock");
  };

  const handleLockVaultNow = () => {
    triggerHaptic();
    setActiveModal("lock_vault");
  };

  const handleSignOut = async () => {
    setActiveModal(null);
    triggerHaptic();
    try {
      await signOut();
    } catch (err: any) {
      Alert.alert("Sign Out Error", err.message || "Failed to sign out.");
    }
  };

  const handleDeactivate = async () => {
    setActiveModal(null);
    triggerHaptic();
    try {
      await signOut();
    } catch (err: any) {
      Alert.alert("Deactivation Error", err.message || "Failed to deactivate session.");
    }
  };

  const isSecurityStrong = isBiometricsEnabled && user?.emailVerified;
  const isSecurityGood = isBiometricsEnabled || user?.emailVerified;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Top Nav Bar */}
      <View
        style={{ paddingTop: topInset + 8 }}
        className="bg-white px-4 pb-3.5 border-b border-[#EBEBEB]"
      >
        <View className="flex-row items-center justify-between min-h-[44px] relative">
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-10 h-10 items-center justify-center z-10"
          >
            <Ionicons name="chevron-back" size={24} color="#222222" />
          </TouchableOpacity>

          <View className="absolute inset-0 items-center justify-center pointer-events-none">
            <Text
              className="text-[17px] text-[#222222]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Security & Privacy
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
        {/* ================= ACCOUNT DETAIL HEADER ================= */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            triggerHaptic();
            router.push("/profile/personal-info");
          }}
          className="pb-4 mb-4 border-b border-[#EBEBEB] flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="w-12 h-12 rounded-full overflow-hidden bg-[#F7F7F7] border border-[#EBEBEB] mr-3.5">
              <Image
                source={
                  photoUri
                    ? { uri: photoUri }
                    : require("../../../assets/images/default-avatar.jpg")
                }
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            </View>

            <View className="flex-1">
              <View className="flex-row items-center">
                <Text
                  className="text-[17px] text-[#222222] mr-1.5"
                  style={{ fontFamily: "Outfit_600SemiBold" }}
                  numberOfLines={1}
                >
                  {userName}
                </Text>
                {user?.emailVerified && (
                  <Ionicons name="checkmark-circle" size={15} color="#008A05" />
                )}
              </View>
              <Text
                className="text-[13px] text-[#717171] mt-0.5"
                style={{ fontFamily: "Outfit_400Regular" }}
                numberOfLines={1}
              >
                {user?.email || "No email linked"}
              </Text>
              <Text
                className="text-[12px] text-[#717171] mt-0.5"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Member · Active
              </Text>
            </View>
          </View>

          <Text
            className="text-[14px] text-[#222222]"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Edit
          </Text>
        </TouchableOpacity>

        {/* ================= SECURITY HEALTH CARD ================= */}
        <View className="bg-[#FAFAFA] rounded-xl p-3.5 border border-[#EBEBEB] mb-5">
          <View className="flex-row items-center justify-between mb-1.5">
            <View className="flex-row items-center">
              <Ionicons
                name="shield-checkmark"
                size={18}
                color={isSecurityStrong ? "#008A05" : "#D97706"}
                style={{ marginRight: 6 }}
              />
              <Text
                className="text-[14px] text-[#222222]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Account security
              </Text>
            </View>

            <View
              className={`px-2 py-0.5 rounded-full ${
                isSecurityStrong
                  ? "bg-[#E6F4EA]"
                  : isSecurityGood
                  ? "bg-[#FEF3C7]"
                  : "bg-[#FEE2E2]"
              }`}
            >
              <Text
                className={`text-[11px] ${
                  isSecurityStrong
                    ? "text-[#008A05]"
                    : isSecurityGood
                    ? "text-[#B45309]"
                    : "text-[#DC2626]"
                }`}
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                {isSecurityStrong ? "Strong" : isSecurityGood ? "Good" : "Action needed"}
              </Text>
            </View>
          </View>

          <Text
            className="text-[12px] text-[#717171] leading-4"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            {isSecurityStrong
              ? "Your account is well protected with biometric authentication and a verified email address."
              : !isBiometricsEnabled
              ? "Enable Biometric Lock to safeguard your vault with native hardware security."
              : "Verify your email to guarantee seamless account recovery."}
          </Text>
        </View>

        {/* ================= SECTION 1: LOGIN ================= */}
        <View className="mb-5">
          <Text
            className="text-[17px] text-[#222222] tracking-tight mb-1"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Login
          </Text>

          {/* Password Row */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic();
              setActiveModal("reset_password");
            }}
            className="py-3.5 border-b border-[#EBEBEB] flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-[#222222] mb-0.5"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Password
              </Text>
              <Text
                className="text-[13px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                •••••••••••
              </Text>
            </View>

            <View className="py-0.5">
              {isSendingReset ? (
                <ActivityIndicator size="small" color="#222222" />
              ) : (
                <Text
                  className="text-[14px] text-[#222222]"
                  style={{ fontFamily: "Outfit_600SemiBold" }}
                >
                  Update
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Social accounts Row */}
          <View className="py-3.5 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-[#222222] mb-0.5"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Social accounts
              </Text>
              <Text
                className="text-[13px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                {user?.providerData?.[0]?.providerId === "google.com"
                  ? "Connected with Google"
                  : "Email & password credentials"}
              </Text>
            </View>

            <Text
              className="text-[13px] text-[#717171]"
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              Connected
            </Text>
          </View>
        </View>

        {/* ================= SECTION 2: VAULT & APP LOCK ================= */}
        <View className="mb-5">
          <Text
            className="text-[17px] text-[#222222] tracking-tight mb-1"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Vault & app lock
          </Text>

          {/* Biometrics Row with Inline Switch */}
          <View className="py-3.5 border-b border-[#EBEBEB] flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-[#222222] mb-0.5"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Biometric authentication
              </Text>
              <Text
                className="text-[13px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                {isBiometricsEnabled
                  ? `${sensorName} active for vault entry`
                  : `Enable ${sensorName} for instant biometric unlock`}
              </Text>
            </View>

            <Switch
              disabled={isTogglingBiometrics}
              value={isBiometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: "#E5E7EB", true: "#222222" }}
              thumbColor={
                Platform.OS === "android"
                  ? isBiometricsEnabled
                    ? "#FFFFFF"
                    : "#F3F4F6"
                  : "#FFFFFF"
              }
              ios_backgroundColor="#E5E7EB"
            />
          </View>

          {/* Auto-Lock Timer Row */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenAutoLockPicker}
            className="py-3.5 border-b border-[#EBEBEB] flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-[#222222] mb-0.5"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Auto-Lock Timer
              </Text>
              <Text
                className="text-[13px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                {isBiometricsEnabled
                  ? `Locks app ${getTimeoutLabel(lockTimeoutMinutes).toLowerCase()} after background`
                  : "Configure inactivity threshold"}
              </Text>
            </View>

            <View className="py-0.5">
              <Text
                className="text-[14px] text-[#222222]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                {getTimeoutLabel(lockTimeoutMinutes)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Lock Vault Now Row */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLockVaultNow}
            className="py-3.5 flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-[#222222] mb-0.5"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Lock Vault Now
              </Text>
              <Text
                className="text-[13px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Immediately lock session and require unlock
              </Text>
            </View>

            <View className="py-0.5">
              <Text
                className="text-[14px] text-[#007AFF]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Lock
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ================= SECTION 3: SECURITY & ENCRYPTION ================= */}
        <View className="mb-5">
          <Text
            className="text-[17px] text-[#222222] tracking-tight mb-1"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Security & encryption
          </Text>

          {/* Email Verification Row */}
          <TouchableOpacity
            activeOpacity={user?.emailVerified ? 1 : 0.7}
            disabled={user?.emailVerified || isSendingVerify}
            onPress={handleResendVerification}
            className="py-3.5 border-b border-[#EBEBEB] flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-[#222222] mb-0.5"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Email address
              </Text>
              <Text
                className="text-[13px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
                numberOfLines={1}
              >
                {user?.email || "No email linked"}
                {user?.emailVerified ? " · Verified" : " · Unverified"}
              </Text>
            </View>

            {user?.emailVerified ? (
              <View className="flex-row items-center">
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color="#008A05"
                  style={{ marginRight: 4 }}
                />
                <Text
                  className="text-[13px] text-[#008A05]"
                  style={{ fontFamily: "Outfit_500Medium" }}
                >
                  Verified
                </Text>
              </View>
            ) : (
              <View className="py-0.5">
                {isSendingVerify ? (
                  <ActivityIndicator size="small" color="#222222" />
                ) : (
                  <Text
                    className="text-[14px] text-[#222222]"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Verify
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Hardware Encryption Row */}
          <View className="py-3.5 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-[#222222] mb-0.5"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Encryption Method
              </Text>
              <Text
                className="text-[13px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Hardware 256-bit AES encryption
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text
                className="text-[13px] text-[#008A05]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Secured
              </Text>
            </View>
          </View>
        </View>

        {/* ================= SECTION 4: ACCOUNT ================= */}
        <View className="mb-4">
          <Text
            className="text-[17px] text-[#222222] tracking-tight mb-1"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Account
          </Text>

          {/* Log out Row */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic();
              setActiveModal("sign_out");
            }}
            className="py-3.5 border-b border-[#EBEBEB] flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-[#222222] mb-0.5"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Log out
              </Text>
              <Text
                className="text-[13px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Sign out of your Mark-X account on this device
              </Text>
            </View>

            <View className="py-0.5">
              <Text
                className="text-[14px] text-[#E00B41]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Log out
              </Text>
            </View>
          </TouchableOpacity>

          {/* Deactivate Account Row */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic();
              setActiveModal("deactivate");
            }}
            className="py-3.5 flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-[#222222] mb-0.5"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Deactivate your account
              </Text>
              <Text
                className="text-[13px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Deactivate account and lock all biometric sessions
              </Text>
            </View>

            <View className="py-0.5">
              <Text
                className="text-[14px] text-[#E00B41]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Deactivate
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ================= UNIFIED CENTERED IOS DIALOG MODAL ================= */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View className="flex-1 bg-black/40 items-center justify-center px-8">
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View className="w-[272px] bg-[#F2F2F2] rounded-[14px] overflow-hidden shadow-2xl">
                {activeModal === "reset_password" && (
                  <>
                    <View className="pt-5 px-4 pb-4 items-center">
                      <Text
                        className="text-[17px] text-[#000000] text-center mb-1.5"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                      >
                        Update Password
                      </Text>
                      <Text
                        className="text-[13px] text-[#3C3C43] text-center leading-5"
                        style={{ fontFamily: "Outfit_400Regular" }}
                      >
                        We will send a secure password reset link to {user?.email || "your email"}.
                      </Text>
                    </View>

                    <View className="h-[0.5px] bg-[#3C3C43]/20" />

                    <View className="flex-row h-[44px]">
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic();
                          setActiveModal(null);
                        }}
                        activeOpacity={0.7}
                        className="flex-1 items-center justify-center border-r border-[#3C3C43]/20 active:bg-black/5"
                      >
                        <Text
                          className="text-[17px] text-[#007AFF]"
                          style={{ fontFamily: "Outfit_400Regular" }}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleConfirmResetPassword}
                        activeOpacity={0.7}
                        className="flex-1 items-center justify-center active:bg-black/5"
                      >
                        <Text
                          className="text-[17px] text-[#007AFF]"
                          style={{ fontFamily: "Outfit_600SemiBold" }}
                        >
                          Send Link
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {activeModal === "auto_lock" && (
                  <>
                    <View className="pt-5 px-4 pb-3 items-center">
                      <Text
                        className="text-[17px] text-[#000000] text-center mb-1.5"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                      >
                        Auto-Lock Timer
                      </Text>
                      <Text
                        className="text-[13px] text-[#3C3C43] text-center leading-5"
                        style={{ fontFamily: "Outfit_400Regular" }}
                      >
                        Choose how quickly Mark-X locks after moving to the background.
                      </Text>
                    </View>

                    <View className="h-[0.5px] bg-[#3C3C43]/20" />

                    {TIMEOUT_OPTIONS.map((opt, index) => {
                      const isSelected = lockTimeoutMinutes === opt.value;
                      return (
                        <View key={opt.value}>
                          {index > 0 && <View className="h-[0.5px] bg-[#3C3C43]/20" />}
                          <TouchableOpacity
                            onPress={async () => {
                              triggerHaptic();
                              setActiveModal(null);
                              await setLockTimeout(opt.value);
                            }}
                            activeOpacity={0.7}
                            className="h-[44px] flex-row items-center justify-between px-5 active:bg-black/5"
                          >
                            <Text
                              className={`text-[16px] ${
                                isSelected ? "text-[#007AFF]" : "text-[#000000]"
                              }`}
                              style={{
                                fontFamily: isSelected
                                  ? "Outfit_600SemiBold"
                                  : "Outfit_400Regular",
                              }}
                            >
                              {opt.label}
                            </Text>
                            {isSelected && (
                              <Ionicons name="checkmark" size={18} color="#007AFF" />
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    <View className="h-[0.5px] bg-[#3C3C43]/20" />

                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        setActiveModal(null);
                      }}
                      activeOpacity={0.7}
                      className="h-[44px] items-center justify-center active:bg-black/5"
                    >
                      <Text
                        className="text-[17px] text-[#007AFF]"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                      >
                        Done
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {activeModal === "lock_vault" && (
                  <>
                    <View className="pt-5 px-4 pb-4 items-center">
                      <Text
                        className="text-[17px] text-[#000000] text-center mb-1.5"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                      >
                        {isBiometricsEnabled ? "Lock Vault Now" : "Biometrics Inactive"}
                      </Text>
                      <Text
                        className="text-[13px] text-[#3C3C43] text-center leading-5"
                        style={{ fontFamily: "Outfit_400Regular" }}
                      >
                        {isBiometricsEnabled
                          ? `Lock your active session now? You will need ${sensorName} to unlock your private vault.`
                          : `Enable ${sensorName} authentication first to lock and safeguard your private vault.`}
                      </Text>
                    </View>

                    <View className="h-[0.5px] bg-[#3C3C43]/20" />

                    {isBiometricsEnabled ? (
                      <View className="flex-row h-[44px]">
                        <TouchableOpacity
                          onPress={() => {
                            triggerHaptic();
                            setActiveModal(null);
                          }}
                          activeOpacity={0.7}
                          className="flex-1 items-center justify-center border-r border-[#3C3C43]/20 active:bg-black/5"
                        >
                          <Text
                            className="text-[17px] text-[#007AFF]"
                            style={{ fontFamily: "Outfit_400Regular" }}
                          >
                            Cancel
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            triggerHaptic();
                            setActiveModal(null);
                            setTimeout(() => {
                              lockApp();
                            }, 100);
                          }}
                          activeOpacity={0.7}
                          className="flex-1 items-center justify-center active:bg-black/5"
                        >
                          <Text
                            className="text-[17px] text-[#007AFF]"
                            style={{ fontFamily: "Outfit_600SemiBold" }}
                          >
                            Lock
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="flex-row h-[44px]">
                        <TouchableOpacity
                          onPress={() => {
                            triggerHaptic();
                            setActiveModal(null);
                          }}
                          activeOpacity={0.7}
                          className="flex-1 items-center justify-center border-r border-[#3C3C43]/20 active:bg-black/5"
                        >
                          <Text
                            className="text-[17px] text-[#007AFF]"
                            style={{ fontFamily: "Outfit_400Regular" }}
                          >
                            Cancel
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            triggerHaptic();
                            setActiveModal(null);
                            setTimeout(() => {
                              handleToggleBiometrics(true);
                            }, 100);
                          }}
                          activeOpacity={0.7}
                          className="flex-1 items-center justify-center active:bg-black/5"
                        >
                          <Text
                            className="text-[17px] text-[#007AFF]"
                            style={{ fontFamily: "Outfit_600SemiBold" }}
                          >
                            Enable
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}

                {activeModal === "sign_out" && (
                  <>
                    <View className="pt-5 px-4 pb-4 items-center">
                      <Text
                        className="text-[17px] text-[#000000] text-center mb-1.5"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                      >
                        Log out
                      </Text>
                      <Text
                        className="text-[13px] text-[#3C3C43] text-center leading-5"
                        style={{ fontFamily: "Outfit_400Regular" }}
                      >
                        Are you sure you want to log out of Mark-X? You will need to sign in again to access your account.
                      </Text>
                    </View>

                    <View className="h-[0.5px] bg-[#3C3C43]/20" />

                    <View className="flex-row h-[44px]">
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic();
                          setActiveModal(null);
                        }}
                        activeOpacity={0.7}
                        className="flex-1 items-center justify-center border-r border-[#3C3C43]/20 active:bg-black/5"
                      >
                        <Text
                          className="text-[17px] text-[#007AFF]"
                          style={{ fontFamily: "Outfit_400Regular" }}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleSignOut}
                        activeOpacity={0.7}
                        className="flex-1 items-center justify-center active:bg-black/5"
                      >
                        <Text
                          className="text-[17px] text-[#FF3B30]"
                          style={{ fontFamily: "Outfit_600SemiBold" }}
                        >
                          Log out
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {activeModal === "deactivate" && (
                  <>
                    <View className="pt-5 px-4 pb-4 items-center">
                      <Text
                        className="text-[17px] text-[#000000] text-center mb-1.5"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                      >
                        Deactivate Account
                      </Text>
                      <Text
                        className="text-[13px] text-[#3C3C43] text-center leading-5"
                        style={{ fontFamily: "Outfit_400Regular" }}
                      >
                        Are you sure you want to deactivate your account? All active sessions will be terminated and your local vault will be locked.
                      </Text>
                    </View>

                    <View className="h-[0.5px] bg-[#3C3C43]/20" />

                    <View className="flex-row h-[44px]">
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic();
                          setActiveModal(null);
                        }}
                        activeOpacity={0.7}
                        className="flex-1 items-center justify-center border-r border-[#3C3C43]/20 active:bg-black/5"
                      >
                        <Text
                          className="text-[17px] text-[#007AFF]"
                          style={{ fontFamily: "Outfit_400Regular" }}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleDeactivate}
                        activeOpacity={0.7}
                        className="flex-1 items-center justify-center active:bg-black/5"
                      >
                        <Text
                          className="text-[17px] text-[#FF3B30]"
                          style={{ fontFamily: "Outfit_600SemiBold" }}
                        >
                          Deactivate
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
