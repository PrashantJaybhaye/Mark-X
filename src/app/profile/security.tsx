import React, { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { triggerHaptic } from "../../utils/haptics";
import { ProfileHeader } from "../../components/profile/ProfileHeader";

export default function SecurityScreen() {
  const { user, resetPassword, signOut } = useAuth();
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err: any) {
      Alert.alert("Sign Out Error", err.message || "Failed to sign out.");
    }
  };

  const handleLogOutPress = () => {
    triggerHaptic();
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of Mark-X? You will need to sign in again to access your account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: handleSignOut,
        },
      ]
    );
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      Alert.alert("Error", "No email address associated with this account.");
      return;
    }

    triggerHaptic();
    setIsSendingReset(true);
    try {
      await resetPassword(user.email);
      Alert.alert(
        "Password Reset Sent",
        `A password reset link has been dispatched to ${user.email}. Please follow the instructions in the email.`
      );
    } catch (err: any) {
      Alert.alert("Reset Error", err.message || "Failed to send password reset email.");
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ProfileHeader
        title="Login & Security"
        subtitle="Manage authentication and access controls"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
      >
        {/* Security Status Hero Card */}
        <View className="bg-[#F0FDF4] rounded-2xl p-5 border border-[#BBF7D0] mb-6 flex-row items-center">
          <View className="w-12 h-12 rounded-xl bg-[#DCFCE7] items-center justify-center mr-4">
            <Ionicons name="shield-checkmark" size={26} color="#16A34A" />
          </View>
          <View className="flex-1">
            <Text
              className="text-[16px] text-[#15803D]"
              style={{ fontFamily: "Outfit_700Bold" }}
            >
              Account Protected
            </Text>
            <Text
              className="text-[13px] text-[#166534] mt-0.5"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Firebase authentication and vault encryption active.
            </Text>
          </View>
        </View>

        {/* Password Management Card */}
        <Text
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Password Management
        </Text>
        <View className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-xl bg-[#EFF6FF] items-center justify-center mr-3">
              <Ionicons name="key-outline" size={20} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text
                className="text-[16px] text-[#0F172A]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Change Password
              </Text>
              <Text
                className="text-[13px] text-[#64748B]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                Send a secure reset link to your email
              </Text>
            </View>
          </View>

          <Text
            className="text-[14px] text-[#475569] leading-5 mb-4"
            style={{ fontFamily: "Outfit_400Regular" }}
          >
            We will email a verification link to{" "}
            <Text className="text-[#0F172A] font-semibold">
              {user?.email || "your registered email"}
            </Text>
            . You will be able to set a new password securely.
          </Text>

          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={isSendingReset}
            activeOpacity={0.8}
            className="w-full bg-[#0F172A] py-3.5 rounded-xl items-center justify-center flex-row"
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text
              className="text-[15px] text-white"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              {isSendingReset ? "Sending Link..." : "Send Reset Email"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign-in Method & Provider */}
        <Text
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Authentication Details
        </Text>
        <View className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] mb-6">
          <View className="flex-row items-center justify-between py-2 border-b border-[#E2E8F0]">
            <Text
              className="text-[14px] text-[#64748B]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Primary Provider
            </Text>
            <Text
              className="text-[14px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Firebase Auth
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2 border-b border-[#E2E8F0]">
            <Text
              className="text-[14px] text-[#64748B]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Email Verification
            </Text>
            <View className="flex-row items-center">
              <Ionicons
                name={user?.emailVerified ? "checkmark-circle" : "alert-circle"}
                size={15}
                color={user?.emailVerified ? "#15803D" : "#EAB308"}
              />
              <Text
                className={`text-[13px] ml-1.5 ${
                  user?.emailVerified ? "text-[#15803D]" : "text-[#EAB308]"
                }`}
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                {user?.emailVerified ? "Verified" : "Pending"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between py-2">
            <Text
              className="text-[14px] text-[#64748B]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Account Creation
            </Text>
            <Text
              className="text-[14px] text-[#0F172A]"
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              {user?.metadata?.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Active"}
            </Text>
          </View>
        </View>

        {/* Security Recommendations */}
        <Text
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-2 ml-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Security Best Practices
        </Text>
        <View className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0]">
          <View className="flex-row items-start mb-3">
            <Ionicons name="checkmark-done-circle-outline" size={20} color="#16A34A" />
            <Text
              className="text-[13px] text-[#475569] ml-2 flex-1 leading-5"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Use a strong, unique password not shared with any other web service.
            </Text>
          </View>

          <View className="flex-row items-start mb-3">
            <Ionicons name="checkmark-done-circle-outline" size={20} color="#16A34A" />
            <Text
              className="text-[13px] text-[#475569] ml-2 flex-1 leading-5"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Keep your biometric lock enabled for instant hardware-level vault protection.
            </Text>
          </View>

          <View className="flex-row items-start">
            <Ionicons name="checkmark-done-circle-outline" size={20} color="#16A34A" />
            <Text
              className="text-[13px] text-[#475569] ml-2 flex-1 leading-5"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              Never share your account email or credentials with anyone.
            </Text>
          </View>
        </View>

        {/* Account Session / Log Out */}
        <Text
          className="text-[13px] text-[#64748B] uppercase tracking-wider mt-6 mb-2 ml-1"
          style={{ fontFamily: "Outfit_600SemiBold" }}
        >
          Session
        </Text>
        <View className="bg-[#FEF2F2] rounded-2xl p-5 border border-[#FECACA] mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-xl bg-[#FEE2E2] items-center justify-center mr-3">
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            </View>
            <View className="flex-1">
              <Text
                className="text-[16px] text-[#991B1B]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Log Out of Mark-X
              </Text>
              <Text
                className="text-[13px] text-[#B91C1C] mt-0.5"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                End your active session on this device
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogOutPress}
            activeOpacity={0.8}
            className="w-full bg-[#EF4444] py-3.5 rounded-xl items-center justify-center flex-row shadow-sm"
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text
              className="text-[15px] text-white"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Log Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
