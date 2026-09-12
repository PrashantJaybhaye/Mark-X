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
import { useRouter } from "expo-router";

import { useAuth } from "../../context/AuthContext";
import { triggerHaptic } from "../../utils/haptics";
import { ProfileCardRow } from "../../components/profile/ProfileCardRow";
import {
  loadUserPreferences,
  saveUserPreferences,
} from "../../services/storageService";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [isScrolledPastBanner, setIsScrolledPastBanner] = useState(false);

  const userName = user?.displayName || "User";
  const photoUri = user?.photoURL || null;

  useEffect(() => {
    loadUserPreferences().then((prefs) => {
      if (prefs.isBiometricsEnabled !== undefined) {
        setIsBiometricsEnabled(prefs.isBiometricsEnabled);
      }
    });
  }, []);

  const handleAvatarPress = () => {
    triggerHaptic();
    router.push("/profile/personal-info");
  };

  const handleToggleBiometrics = (val: boolean) => {
    triggerHaptic();
    setIsBiometricsEnabled(val);
    saveUserPreferences({ isBiometricsEnabled: val });
    if (val) {
      Alert.alert(
        "Biometric Lock Active",
        "Mark-X Vault and Notes are now secured with device biometrics."
      );
    }
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
      <StatusBar style={isScrolledPastBanner ? "dark" : "light"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setIsScrolledPastBanner(y > 100);
        }}
      >
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
              onPress={() => router.push("/profile/personal-info")}
            />
            <ProfileCardRow
              icon="lock-closed-outline"
              title="Login & security"
              onPress={() => router.push("/profile/security")}
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
              onPress={() => router.push("/profile/biometrics")}
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
              onPress={() => router.push("/profile/devices")}
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
              onPress={() => router.push("/profile/help")}
            />
            <ProfileCardRow
              icon="document-text-outline"
              title="Terms & Conditions"
              onPress={() => router.push("/profile/terms")}
            />
            <ProfileCardRow
              icon="information-circle-outline"
              title="About"
              trailingText="v1.0.0"
              showDivider={false}
              onPress={() => router.push("/profile/about")}
            />
          </View>

          <View className="h-10" />
        </View>
      </ScrollView>
    </View>
  );
}
