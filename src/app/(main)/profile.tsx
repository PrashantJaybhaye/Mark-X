import React, { useState, useEffect } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateProfile } from "firebase/auth";

import { useAuth } from "../../context/AuthContext";
import { auth } from "../../services/firebase";
import { safePickImage } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";

import { ProfileCardRow } from "../../components/profile/ProfileCardRow";
import { ProfileEditModal } from "../../components/profile/ProfileEditModal";
import {
  OptionModalType,
  ProfileOptionsModal,
} from "../../components/profile/ProfileOptionsModal";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, reloadUser, resetPassword } = useAuth();

  const [userName, setUserName] = useState(user?.displayName || "User");
  const [photoUri, setPhotoUri] = useState<string | null>(user?.photoURL || null);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeOptionModal, setActiveOptionModal] = useState<OptionModalType>(null);

  useEffect(() => {
    setUserName(user?.displayName || "User");
    setPhotoUri(user?.photoURL || null);
  }, [user?.displayName, user?.photoURL]);

  const handlePickAvatar = async () => {
    triggerHaptic();
    const result = await safePickImage();
    if (result?.uri) {
      setPhotoUri(result.uri);
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { photoURL: result.uri });
          await reloadUser();
        } catch (err) {
          console.warn("Could not update photo in auth:", err);
        }
      }
    }
  };

  const handleRemoveAvatar = async () => {
    triggerHaptic();
    setPhotoUri(null);
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { photoURL: "" });
        await reloadUser();
      } catch (err) {
        console.warn("Could not remove photo from auth:", err);
      }
    }
  };

  const handleAvatarPress = () => {
    triggerHaptic();
    if (photoUri) {
      Alert.alert(
        "Profile Photo",
        "Choose an option for your profile picture",
        [
          { text: "Change Photo", onPress: handlePickAvatar },
          {
            text: "Remove Photo (Use Default)",
            style: "destructive",
            onPress: handleRemoveAvatar,
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else {
      handlePickAvatar();
    }
  };

  const handleSaveProfile = async (newName: string, newPhotoUri?: string | null) => {
    setUserName(newName);
    setPhotoUri(newPhotoUri || null);

    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: newName,
        photoURL: newPhotoUri || "",
      });
      await reloadUser();
    }
  };

  const handleSendPasswordReset = async () => {
    if (user?.email) {
      await resetPassword(user.email);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err: any) {
      Alert.alert("Sign Out Error", err.message || "Failed to sign out.");
    }
  };

  const handleToggleBiometrics = (val: boolean) => {
    triggerHaptic();
    setIsBiometricsEnabled(val);
    if (val) {
      Alert.alert(
        "Biometric Lock Active",
        "Mark-X Vault and Notes are now secured with device biometrics."
      );
    }
  };

  const handleShowDevices = () => {
    triggerHaptic();
    Alert.alert(
      "Active Session",
      "Current Device: Android Phone\nStatus: Secure & Authenticated\nProvider: Firebase Auth"
    );
  };

  const joinedDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "15 Nov 2024";

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
        {/* City Skyline Banner */}
        <View className="w-full h-[150px] bg-[#222222] relative">
          <Image
            source={require("../../../assets/images/profile-banner.jpg")}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={300}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: insets.top + 20,
              backgroundColor: "rgba(0,0,0,0.25)",
            }}
          />
        </View>

        {/* User Identity & Info */}
        <View className="px-5">
          <View className="-mt-[42px]">
            <TouchableOpacity
              onPress={handleAvatarPress}
              activeOpacity={0.85}
              className="w-[84px] h-[84px] rounded-full overflow-hidden border-[4px] border-white bg-[#C6F043]"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
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
            </TouchableOpacity>
          </View>

          <Text
            className="text-[23px] text-[#222222] mt-3"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            {userName}
          </Text>

          <View className="flex-row items-center flex-wrap gap-x-2 mt-0.5">
            <Text
              className="text-[14px] text-[#717171]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              {user?.email || "user@mark-x.app"}
            </Text>
            <Text className="text-[#D1D5DB]">·</Text>
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={13} color="#717171" />
              <Text
                className="text-[13px] text-[#717171] ml-1"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                {joinedDate}
              </Text>
            </View>
          </View>

          {/* Account Settings */}
          <Text
            className="text-[20px] text-[#222222] mt-6 mb-1"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Account
          </Text>

          <View>
            <ProfileCardRow
              icon="person-outline"
              title="Personal information"
              onPress={() => setIsEditModalOpen(true)}
            />
            <ProfileCardRow
              icon="lock-closed-outline"
              title="Login & security"
              onPress={() => setActiveOptionModal("password")}
            />
          </View>

          {/* Security & Device Settings */}
          <Text
            className="text-[20px] text-[#222222] mt-6 mb-1"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Security & Devices
          </Text>

          <View>
            <ProfileCardRow
              icon="finger-print-outline"
              title="Biometric Lock"
              rightElement={
                <Switch
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
              }
            />
            <ProfileCardRow
              icon="hardware-chip-outline"
              title="Active devices"
              onPress={handleShowDevices}
            />
          </View>

          {/* Support & Legal */}
          <Text
            className="text-[20px] text-[#222222] mt-6 mb-1"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Support & Legal
          </Text>

          <View>
            <ProfileCardRow
              icon="help-circle-outline"
              title="Help & Support"
              onPress={() => setActiveOptionModal("help")}
            />
            <ProfileCardRow
              icon="document-text-outline"
              title="Terms & Conditions"
              onPress={() => setActiveOptionModal("terms")}
            />
            <ProfileCardRow
              icon="information-circle-outline"
              title="About"
              trailingText="v1.0.0"
              onPress={() => setActiveOptionModal("about")}
            />
            <ProfileCardRow
              icon="log-out-outline"
              title="Log out"
              isDestructive
              showDivider={false}
              onPress={() => setActiveOptionModal("logout")}
            />
          </View>

          <View className="h-10" />
        </View>
      </ScrollView>

      {/* Edit Profile Sheet */}
      {isEditModalOpen && (
        <ProfileEditModal
          visible={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          currentName={userName}
          currentPhotoUri={photoUri}
          onSave={handleSaveProfile}
        />
      )}

      {/* Action and Detail Modals */}
      {activeOptionModal && (
        <ProfileOptionsModal
          type={activeOptionModal}
          visible={true}
          onClose={() => setActiveOptionModal(null)}
          userEmail={user?.email}
          onSendPasswordReset={handleSendPasswordReset}
          onSignOut={handleSignOut}
        />
      )}
    </View>
  );
}
