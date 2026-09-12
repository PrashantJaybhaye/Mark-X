import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { updateProfile } from "firebase/auth";
import * as Clipboard from "expo-clipboard";

import { useAuth } from "../../../context/AuthContext";
import { auth } from "../../../services/firebase";
import { safePickImage } from "../../../services/nativePickerService";
import { triggerHaptic } from "../../../utils/haptics";
import { ProfileHeader } from "../ProfileHeader";

interface PersonalInfoViewProps {
  onBack: () => void;
}

export function PersonalInfoView({ onBack }: PersonalInfoViewProps) {
  const { user, reloadUser } = useAuth();

  const [name, setName] = useState(user?.displayName || "");
  const [photoUri, setPhotoUri] = useState<string | null>(user?.photoURL || null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  const handlePickPhoto = async () => {
    triggerHaptic();
    const result = await safePickImage();
    if (result?.uri) {
      setPhotoUri(result.uri);
    }
  };

  const handleRemovePhoto = () => {
    triggerHaptic();
    setPhotoUri(null);
  };

  const handleCopyUid = async () => {
    if (user?.uid) {
      triggerHaptic();
      await Clipboard.setStringAsync(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Invalid Name", "Please enter a valid display name.");
      return;
    }

    triggerHaptic();
    setIsSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: trimmed,
          photoURL: photoUri || "",
        });
        await reloadUser();
      }
      Alert.alert("Profile Updated", "Your personal information has been successfully saved.");
    } catch (err: any) {
      Alert.alert("Update Failed", err.message || "Could not update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const joinedDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Recently";

  return (
    <View className="flex-1 bg-white">
      <ProfileHeader
        title="Personal Information"
        subtitle="Manage your profile identity & details"
        onBack={onBack}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 }}
        >
          {/* Avatar Section */}
          <View className="items-center mb-8">
            <TouchableOpacity
              onPress={handlePickPhoto}
              activeOpacity={0.85}
              className="relative"
            >
              <View className="w-[100px] h-[100px] rounded-full overflow-hidden border-[3px] border-[#E2E8F0] bg-[#F8FAFC]">
                <Image
                  source={
                    photoUri
                      ? { uri: photoUri }
                      : require("../../../../assets/images/default-avatar.jpg")
                  }
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
              </View>
              <View className="absolute bottom-0 right-0 bg-[#0F172A] p-2 rounded-full border-2 border-white shadow-sm">
                <Ionicons name="camera" size={15} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center justify-center gap-3 mt-4">
              <TouchableOpacity
                onPress={handlePickPhoto}
                activeOpacity={0.7}
                className="px-4 py-2 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]"
              >
                <Text
                  className="text-[13px] text-[#0F172A]"
                  style={{ fontFamily: "Outfit_600SemiBold" }}
                >
                  {photoUri ? "Change Photo" : "Upload Photo"}
                </Text>
              </TouchableOpacity>

              {photoUri ? (
                <TouchableOpacity
                  onPress={handleRemovePhoto}
                  activeOpacity={0.7}
                  className="px-4 py-2 rounded-full bg-[#FEE2E2] border border-[#FECACA]"
                >
                  <Text
                    className="text-[13px] text-[#EF4444]"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Form Fields Card */}
          <View className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] mb-5">
            {/* Display Name Input */}
            <View className="mb-5">
              <Text
                className="text-[13px] text-[#64748B] mb-2 uppercase tracking-wider"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Display Name
              </Text>
              <View className="flex-row items-center bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-3 focus:border-[#0F172A]">
                <Ionicons
                  name="person-outline"
                  size={19}
                  color="#64748B"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                  className="flex-1 text-[16px] text-[#0F172A] p-0"
                  style={{ fontFamily: "Outfit_500Medium" }}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Address (Read-only) */}
            <View className="mb-5">
              <Text
                className="text-[13px] text-[#64748B] mb-2 uppercase tracking-wider"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Email Address
              </Text>
              <View className="flex-row items-center justify-between bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3.5 py-3">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color="#64748B"
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    className="text-[15px] text-[#475569]"
                    style={{ fontFamily: "Outfit_500Medium" }}
                    numberOfLines={1}
                  >
                    {user?.email || "No email"}
                  </Text>
                </View>
                <View className="flex-row items-center bg-[#DCFCE7] px-2 py-0.5 rounded-md">
                  <Ionicons name="checkmark-circle" size={12} color="#15803D" />
                  <Text
                    className="text-[11px] text-[#15803D] ml-1"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Verified
                  </Text>
                </View>
              </View>
            </View>

            {/* Account ID / UID */}
            <View className="mb-5">
              <Text
                className="text-[13px] text-[#64748B] mb-2 uppercase tracking-wider"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Account ID
              </Text>
              <TouchableOpacity
                onPress={handleCopyUid}
                activeOpacity={0.7}
                className="flex-row items-center justify-between bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3.5 py-3"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons
                    name="finger-print-outline"
                    size={19}
                    color="#64748B"
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    className="text-[14px] text-[#475569]"
                    style={{ fontFamily: "Outfit_400Regular" }}
                    numberOfLines={1}
                  >
                    {user?.uid || "UID not available"}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text
                    className="text-[12px] text-[#2563EB] mr-1"
                    style={{ fontFamily: "Outfit_500Medium" }}
                  >
                    {copiedUid ? "Copied" : "Copy"}
                  </Text>
                  <Ionicons
                    name={copiedUid ? "checkmark" : "copy-outline"}
                    size={14}
                    color="#2563EB"
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Member Since */}
            <View>
              <Text
                className="text-[13px] text-[#64748B] mb-2 uppercase tracking-wider"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Member Since
              </Text>
              <View className="flex-row items-center bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3.5 py-3">
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color="#64748B"
                  style={{ marginRight: 10 }}
                />
                <Text
                  className="text-[15px] text-[#475569]"
                  style={{ fontFamily: "Outfit_500Medium" }}
                >
                  {joinedDate}
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
            className="w-full bg-[#0F172A] py-4 rounded-xl items-center justify-center shadow-sm active:opacity-90"
          >
            <Text
              className="text-[16px] text-white"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              {isSaving ? "Saving Changes..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
