import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import React, { useState } from "react";
import {
  Platform,
  StatusBar as RNStatusBar,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IosDialog, IosDialogAction } from "../../components/common/IosDialog";
import { ProfileCardRow } from "../../components/profile/ProfileCardRow";
import { useAuth } from "../../context/AuthContext";
import { useBiometrics } from "../../context/BiometricsContext";
import { triggerHaptic } from "../../utils/haptics";
import { clearAppCache, getAppCacheSize } from "../../services/cacheCleaner";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isBiometricsEnabled, setBiometricsEnabled, capability } = useBiometrics();

  const [isTogglingBiometrics, setIsTogglingBiometrics] = useState(false);
  const [dialogState, setDialogState] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    actions?: IosDialogAction[];
  }>({ visible: false, title: "" });

  const [isFocused, setIsFocused] = useState(false);
  const isNavigatingRef = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      setIsFocused(true);
      isNavigatingRef.current = false;
      setStatusBarStyle("dark");
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle("dark-content");
      }

      return () => {
        setIsFocused(false);
        // ALWAYS restore to dark status bar when leaving Profile tab
        setStatusBarStyle("dark");
        if (Platform.OS === "android") {
          RNStatusBar.setBarStyle("dark-content");
        }
      };
    }, [])
  );

  const navigateSafely = React.useCallback(
    (path: string) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;
      router.push(path as any);

      // Failsafe timeout to unlock if screen did not blur
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 750);
    },
    [router]
  );

  const userName = user?.displayName || "User";
  const photoUri = user?.photoURL || user?.providerData?.[0]?.photoURL || null;

  const handleAvatarPress = () => {
    triggerHaptic();
    navigateSafely("/profile/personal-info");
  };

  const handleToggleBiometrics = async (val: boolean) => {
    if (isTogglingBiometrics) return;
    triggerHaptic();

    if (val && (!capability?.hasHardware || !capability?.isEnrolled)) {
      setDialogState({
        visible: true,
        title: "Biometrics Unavailable",
        message: !capability?.hasHardware
          ? "Your device does not appear to support biometric hardware."
          : "No biometric credentials enrolled. Please register your fingerprint or face in device Settings first."
      });
      return;
    }

    setIsTogglingBiometrics(true);
    try {
      const result = await setBiometricsEnabled(val);
      if (!result.success) {
        if (result.error && result.error !== "Authentication cancelled.") {
          setDialogState({
            visible: true,
            title: "Verification Failed",
            message: result.error
          });
        }
      } else if (val) {
        setDialogState({
          visible: true,
          title: "Biometric Lock Active",
          message: `Mark-X is now secured with ${capability?.sensorName || "device biometrics"}.`
        });
      }
    } finally {
      setIsTogglingBiometrics(false);
    }
  };

  const performClearCache = async () => {
    setDialogState((prev) => ({ ...prev, visible: false }));
    triggerHaptic();

    const { clearedMB } = await clearAppCache();
    const formattedSize = clearedMB >= 1024
      ? `${(clearedMB / 1024).toFixed(2)} GB`
      : `${clearedMB} MB`;

    setTimeout(() => {
      setDialogState({
        visible: true,
        title: "Cache Cleared",
        message: clearedMB > 0
          ? `Successfully freed up ${formattedSize} of cached images and temporary files.`
          : "Your app cache is already clean!",
        actions: [
          {
            text: "OK",
            bold: true,
            onPress: () => setDialogState((prev) => ({ ...prev, visible: false })),
          },
        ],
      });
    }, 250);
  };

  const handleClearCache = async () => {
    triggerHaptic();
    const { sizeMB } = await getAppCacheSize();
    const formattedSize = sizeMB >= 1024
      ? `${(sizeMB / 1024).toFixed(2)} GB`
      : `${sizeMB} MB`;

    const promptText = sizeMB > 0
      ? `Your current app cache is ${formattedSize}. Are you sure you want to clear temporary photos and cached images to free up storage space?`
      : "Your app cache is currently clean (0 MB). Would you still like to run cache optimization?";

    setDialogState({
      visible: true,
      title: "Clear Cache & Temp Files",
      message: promptText,
      actions: [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setDialogState((prev) => ({ ...prev, visible: false })),
        },
        {
          text: "Clear Cache",
          style: "destructive",
          bold: true,
          onPress: performClearCache,
        },
      ],
    });
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
      {isFocused && <StatusBar style="dark" />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        {/* City Skyline Banner */}
        <View className="w-full h-[180px] relative">
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
            }}
          />
        </View>

        {/* User Identity & Info */}
        <View className="px-5">
          <View className="-mt-[52px]">
            <TouchableOpacity
              onPress={handleAvatarPress}
              activeOpacity={0.85}
              className="w-[104px] h-[104px] rounded-full overflow-hidden border-[4px] border-white bg-[#000000]"
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
            numberOfLines={1}
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
              onPress={() => navigateSafely("/profile/personal-info")}
            />
            <ProfileCardRow
              icon="lock-closed-outline"
              title="Security & Privacy"
              onPress={() => navigateSafely("/profile/security")}
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
              subtitle={capability?.sensorName || "Device sensor protection"}
              onPress={() => handleToggleBiometrics(!isBiometricsEnabled)}
              rightElement={
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
              }
            />
            <ProfileCardRow
              icon="hardware-chip-outline"
              title="Active devices"
              onPress={() => navigateSafely("/profile/devices")}
            />
            <ProfileCardRow
              icon="trash-outline"
              title="Clear Cache"
              onPress={handleClearCache}
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
              onPress={() => navigateSafely("/profile/help")}
            />
            <ProfileCardRow
              icon="document-text-outline"
              title="Terms & Conditions"
              onPress={() => navigateSafely("/profile/terms")}
            />
            <ProfileCardRow
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              onPress={() => navigateSafely("/profile/privacy")}
            />
            <ProfileCardRow
              icon="information-circle-outline"
              title="About"
              showDivider={false}
              onPress={() => navigateSafely("/profile/about")}
            />
          </View>

          <View className="h-10" />
        </View>
      </ScrollView>

      <IosDialog
        visible={dialogState.visible}
        title={dialogState.title}
        message={dialogState.message}
        onClose={() => setDialogState(prev => ({ ...prev, visible: false }))}
        actions={
          dialogState.actions || [
            {
              text: "OK",
              bold: true,
              onPress: () => setDialogState(prev => ({ ...prev, visible: false })),
            },
          ]
        }
      />
    </View>
  );
}
