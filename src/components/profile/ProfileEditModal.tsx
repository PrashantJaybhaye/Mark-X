import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { triggerHaptic } from "../../utils/haptics";
import { safePickImage } from "../../services/nativePickerService";

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentPhotoUri?: string | null;
  onSave: (name: string, photoUri?: string | null) => Promise<void>;
}

export function ProfileEditModal({
  visible,
  onClose,
  currentName,
  currentPhotoUri,
  onSave,
}: ProfileEditModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(currentName);
  const [photoUri, setPhotoUri] = useState<string | null>(currentPhotoUri || null);
  const [isSaving, setIsSaving] = useState(false);



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

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Invalid Name", "Please enter a valid display name.");
      return;
    }

    triggerHaptic();
    setIsSaving(true);
    try {
      await onSave(trimmed, photoUri);
      onClose();
    } catch (err: any) {
      Alert.alert("Update Failed", err.message || "Could not update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-black/40 justify-end"
      >
        {/* Backdrop tap to dismiss */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1"
        />

        <View
          className="bg-white rounded-t-[28px] px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 20) + 12 }}
        >
          {/* Grab handle indicator */}
          <View className="items-center py-2">
            <View className="w-10 h-1.5 rounded-full bg-[#E5E7EB]" />
          </View>

          {/* Modal Header */}
          <View className="flex-row items-center justify-between py-3 border-b border-[#F3F4F6] mb-4">
            <Text
              className="text-[20px] text-[#111111]"
              style={{ fontFamily: "Outfit_700Bold" }}
            >
              Edit Profile
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
            {/* Avatar with Camera badge & Remove action */}
            <View className="items-center my-3">
              <TouchableOpacity
                onPress={handlePickPhoto}
                activeOpacity={0.8}
                className="relative"
              >
                <View className="w-[84px] h-[84px] rounded-full overflow-hidden border-2 border-[#E5E7EB]">
                  <Image
                    source={
                      photoUri
                        ? { uri: photoUri }
                        : require("../../../assets/images/default-avatar.jpg")
                    }
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </View>
                <View className="absolute bottom-0 right-0 bg-[#111111] p-1.5 rounded-full border-2 border-white">
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View className="flex-row items-center justify-center gap-4 mt-3">
                <TouchableOpacity onPress={handlePickPhoto}>
                  <Text
                    className="text-[14px] text-[#2563EB]"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    {photoUri ? "Change Photo" : "Upload Photo"}
                  </Text>
                </TouchableOpacity>

                {photoUri && (
                  <TouchableOpacity onPress={handleRemovePhoto}>
                    <Text
                      className="text-[14px] text-[#EF4444]"
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                    >
                      Remove Photo
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Display Name Input */}
            <View className="mb-6">
              <Text
                className="text-[13px] text-[#6B7280] mb-1.5"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Full Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-[15px] text-[#111111]"
                style={{ fontFamily: "Outfit_400Regular" }}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
              className="w-full bg-[#111111] py-3.5 rounded-xl items-center justify-center"
            >
              <Text
                className="text-[15px] text-white"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
