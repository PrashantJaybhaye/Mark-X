import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateProfile } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../../context/AuthContext";
import { auth } from "../../services/firebase";
import { safePickImage } from "../../services/nativePickerService";
import { copyToClipboard } from "../../services/clipboardService";
import { updateUserMetadata } from "../../services/userService";
import { triggerHaptic } from "../../utils/haptics";

// ================= LIST ITEM ROW =================
interface ProfileItemRowProps {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isPlaceholder?: boolean;
  onPress?: () => void;
  isLast?: boolean;
}

function ProfileItemRow({
  iconName,
  label,
  value,
  isPlaceholder = false,
  onPress,
  isLast = false,
}: ProfileItemRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      onPress={onPress}
      className={`flex-row items-center py-4 ${isLast ? "" : "border-b border-[#F0F0F0]"}`}
    >
      <View className="w-10 items-start justify-center">
        <Ionicons name={iconName} size={22} color="#111111" />
      </View>

      <View className="flex-1 pr-2">
        <Text
          className="text-[13px] text-[#717171] mb-0.5"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          {label}
        </Text>
        <Text
          className={`text-[15px] ${isPlaceholder ? "text-[#8E8E93]" : "text-[#111111]"}`}
          style={{ fontFamily: "Outfit_500Medium" }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ================= AUTHENTIC IOS ALERT MODAL =================
interface IOSDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmColor?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

function IOSDialog({
  visible,
  onClose,
  title,
  message,
  confirmText,
  confirmColor = "#007AFF",
  onConfirm,
  isLoading = false,
  children,
}: IOSDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40 items-center justify-center px-8">
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View className="w-[272px] bg-[#F2F2F2] rounded-[14px] overflow-hidden shadow-2xl">
              <View className="pt-5 px-4 pb-3 items-center">
                <Text
                  className="text-[17px] text-[#000000] text-center mb-1.5"
                  style={{ fontFamily: "Outfit_600SemiBold" }}
                >
                  {title}
                </Text>
                <Text
                  className="text-[13px] text-[#3C3C43] text-center leading-5 mb-3"
                  style={{ fontFamily: "Outfit_400Regular" }}
                >
                  {message}
                </Text>
                {children}
              </View>

              <View className="h-[0.5px] bg-[#3C3C43]/20" />

              <View className="flex-row h-[44px]">
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic();
                    onClose();
                  }}
                  activeOpacity={0.7}
                  disabled={isLoading}
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
                  onPress={onConfirm}
                  activeOpacity={0.7}
                  disabled={isLoading}
                  className="flex-1 items-center justify-center active:bg-black/5"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={confirmColor} />
                  ) : (
                    <Text
                      className="text-[17px]"
                      style={{ fontFamily: "Outfit_600SemiBold", color: confirmColor }}
                    >
                      {confirmText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ================= REUSABLE FIELD INPUT MODAL =================
interface InputDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  prefix?: string;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  onConfirm: () => void;
  isLoading?: boolean;
}

function InputDialog({
  visible,
  onClose,
  title,
  message,
  label,
  value,
  onChangeText,
  prefix,
  placeholder,
  autoCapitalize = "none",
  onConfirm,
  isLoading,
}: InputDialogProps) {
  return (
    <IOSDialog
      visible={visible}
      onClose={onClose}
      title={title}
      message={message}
      confirmText="Save"
      confirmColor="#007AFF"
      onConfirm={onConfirm}
      isLoading={isLoading}
    >
      <View className="w-full bg-white rounded-lg px-3 py-2 border border-[#3C3C43]/20">
        <Text
          className="text-[11px] text-[#717171] mb-0.5"
          style={{ fontFamily: "Outfit_500Medium" }}
        >
          {label}
        </Text>
        <View className="flex-row items-center">
          {prefix ? (
            <Text
              className="text-[14px] text-[#8E8E93] mr-1"
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              {prefix}
            </Text>
          ) : null}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#8E8E93"
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            autoFocus
            className="text-[14px] text-[#000000] p-0 flex-1"
            style={{ fontFamily: "Outfit_500Medium" }}
          />
        </View>
      </View>
    </IOSDialog>
  );
}

// ================= MAIN SCREEN =================
export default function PersonalInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, reloadUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"personal" | "account">("personal");
  const [activeModal, setActiveModal] = useState<
    "edit_name" | "edit_username" | "remove_photo" | null
  >(null);

  // Profile fields
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const defaultUsername = user?.email
    ? user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "")
    : "user";
  const [username, setUsername] = useState(defaultUsername);

  // Draft states
  const [draftName, setDraftName] = useState("");
  const [draftUsername, setDraftUsername] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoUri = user?.photoURL || user?.providerData?.[0]?.photoURL || null;

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) : 16
  );

  // Load saved extras from user-scoped storage
  useEffect(() => {
    async function loadExtras() {
      if (!user?.uid) return;
      try {
        const raw = await AsyncStorage.getItem(`@markx_profile_extras_${user.uid}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.username) setUsername(parsed.username);
        }
      } catch (e) {
        console.warn("[PersonalInfo] Failed to load profile extras:", e);
      }
    }
    loadExtras();
  }, [user?.uid]);

  const handleDismiss = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/profile");
    }
  };

  const handlePickPhoto = async () => {
    triggerHaptic();
    setIsUploadingPhoto(true);
    try {
      const result = await safePickImage();
      if (result?.uri && auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: result.uri });
        await updateUserMetadata(auth.currentUser.uid, { photoURL: result.uri });
        await reloadUser();
      }
    } catch (err: any) {
      Alert.alert("Photo Error", err.message || "Failed to update profile photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleConfirmRemovePhoto = async () => {
    setActiveModal(null);
    triggerHaptic();
    setIsUploadingPhoto(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: "" });
        await updateUserMetadata(auth.currentUser.uid, { photoURL: "" });
        await reloadUser();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to remove photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleOpenEditName = () => {
    setDraftName(user?.displayName || displayName || "");
    triggerHaptic();
    setActiveModal("edit_name");
  };

  const handleSaveName = async () => {
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      Alert.alert("Invalid Name", "Please enter a valid display name.");
      return;
    }

    triggerHaptic();
    setIsSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: trimmedName });
        await updateUserMetadata(auth.currentUser.uid, { displayName: trimmedName });
        await reloadUser();
      }
      setDisplayName(trimmedName);
      setActiveModal(null);
    } catch (err: any) {
      Alert.alert("Update Error", err.message || "Could not save display name.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditUsername = () => {
    setDraftUsername(username);
    triggerHaptic();
    setActiveModal("edit_username");
  };

  const handleSaveUsername = async () => {
    const cleanUsername = draftUsername
      .trim()
      .replace(/^@+/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    if (!cleanUsername) {
      Alert.alert("Invalid Username", "Please enter a valid username (letters, numbers, underscore).");
      return;
    }

    triggerHaptic();
    setIsSaving(true);
    try {
      if (auth.currentUser) {
        await updateUserMetadata(auth.currentUser.uid, { username: cleanUsername });
        await reloadUser();
      }
      setUsername(cleanUsername);

      if (user?.uid) {
        await AsyncStorage.setItem(
          `@markx_profile_extras_${user.uid}`,
          JSON.stringify({ username: cleanUsername })
        );
      }
      setActiveModal(null);
    } catch (err: any) {
      Alert.alert("Update Error", err.message || "Could not save username.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyUid = async () => {
    if (!user?.uid) return;
    triggerHaptic();
    const copied = await copyToClipboard(user.uid);
    if (copied) {
      Alert.alert("Copied", "Account ID copied to clipboard.");
    }
  };

  const joinedDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Active Member";

  interface ProfileItemConfig {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    onPress?: () => void;
  }

  // Tab configurations
  const personalItems: ProfileItemConfig[] = [
    {
      icon: "person-outline",
      label: "Name",
      value: user?.displayName || displayName || "Set Name",
      onPress: handleOpenEditName,
    },
    {
      icon: "at-circle-outline",
      label: "Username",
      value: `@${username}`,
      onPress: handleOpenEditUsername,
    },
    {
      icon: "mail-outline",
      label: "Email",
      value: user?.email || "No email available",
    },
    {
      icon: "finger-print-outline",
      label: "Account ID",
      value: user?.uid || "UID not available",
      onPress: handleCopyUid,
    },
  ];

  const accountItems: ProfileItemConfig[] = [
    {
      icon: "checkmark-circle-outline",
      label: "Verification Status",
      value: user?.emailVerified ? "Verified Account" : "Pending Verification",
    },
    {
      icon: "calendar-outline",
      label: "Member Since",
      value: joinedDate,
    },
    {
      icon: "key-outline",
      label: "Authentication Method",
      value:
        user?.providerData?.[0]?.providerId === "google.com"
          ? "Google Sign-In"
          : "Email & Password",
    },
  ];

  const activeItems = activeTab === "personal" ? personalItems : accountItems;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Top Navigation Bar */}
      <View
        style={{ paddingTop: topInset + 8 }}
        className="bg-white px-4 pb-3.5 border-b border-[#F0F0F0]"
      >
        <View className="flex-row items-center justify-between min-h-[44px]">
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
              My Profile
            </Text>
          </View>

          <View className="w-10 h-10" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: Math.max(insets.bottom + 32, 48),
        }}
      >
        {/* Profile Hero Row */}
        <View className="flex-row items-center mb-6">
          <View className="relative mr-4">
            <TouchableOpacity
              onPress={handlePickPhoto}
              activeOpacity={0.85}
              disabled={isUploadingPhoto}
              className="w-[80px] h-[80px] rounded-full overflow-hidden bg-[#F7F7F7] border border-[#EBEBEB]"
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
              {isUploadingPhoto && (
                <View className="absolute inset-0 bg-black/30 items-center justify-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickPhoto}
              activeOpacity={0.8}
              disabled={isUploadingPhoto}
              className="absolute bottom-0 left-0 w-7 h-7 rounded-full bg-[#1E1E1E] items-center justify-center border-2 border-white shadow-sm"
            >
              <Ionicons name="camera" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center">
            <TouchableOpacity
              onPress={handleOpenEditName}
              activeOpacity={0.7}
              className="self-start"
            >
              <Text
                className="text-[21px] text-[#111111] mb-0.5 tracking-tight"
                style={{ fontFamily: "Outfit_700Bold" }}
                numberOfLines={1}
              >
                {user?.displayName || displayName || "User"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenEditUsername}
              activeOpacity={0.7}
              className="self-start"
            >
              <Text
                className="text-[14px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                @{username}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented Tabs */}
        <View className="bg-[#F2F2F7] rounded-xl p-[3px] flex-row mb-6">
          {(
            [
              { id: "personal", label: "Personal Info" },
              { id: "account", label: "Account" },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  triggerHaptic();
                  setActiveTab(tab.id);
                }}
                activeOpacity={0.8}
                className={`flex-1 py-2 rounded-lg items-center justify-center ${
                  isActive ? "bg-white shadow-xs" : ""
                }`}
              >
                <Text
                  className={`text-[14px] ${isActive ? "text-[#111111]" : "text-[#717171]"}`}
                  style={{
                    fontFamily: isActive ? "Outfit_600SemiBold" : "Outfit_500Medium",
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Items List */}
        <View>
          {activeItems.map((item, index) => (
            <ProfileItemRow
              key={item.label}
              iconName={item.icon}
              label={item.label}
              value={item.value}
              onPress={item.onPress}
              isLast={index === activeItems.length - 1}
            />
          ))}
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <InputDialog
        visible={activeModal === "edit_name"}
        onClose={() => setActiveModal(null)}
        title="Edit Name"
        message="Enter your display name."
        label="Display Name"
        value={draftName}
        onChangeText={setDraftName}
        placeholder="Your Name"
        autoCapitalize="words"
        onConfirm={handleSaveName}
        isLoading={isSaving}
      />

      {/* Edit Username Modal */}
      <InputDialog
        visible={activeModal === "edit_username"}
        onClose={() => setActiveModal(null)}
        title="Edit Username"
        message="Choose a unique username handle."
        label="Username"
        prefix="@"
        value={draftUsername}
        onChangeText={(val) =>
          setDraftUsername(
            val
              .replace(/^@+/, "")
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, "")
          )
        }
        placeholder="username"
        onConfirm={handleSaveUsername}
        isLoading={isSaving}
      />

      {/* Remove Photo Confirmation Modal */}
      <IOSDialog
        visible={activeModal === "remove_photo"}
        onClose={() => setActiveModal(null)}
        title="Remove Photo"
        message="Are you sure you want to remove your custom profile photo?"
        confirmText="Remove"
        confirmColor="#E00B41"
        onConfirm={handleConfirmRemovePhoto}
      />
    </View>
  );
}
