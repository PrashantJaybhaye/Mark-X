import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IosDialog, IosDialogAction, IosSwitch } from "../../components/common";
import { ProfileCardRow } from "../../components/profile/ProfileCardRow";
import { useAuth } from "../../context/AuthContext";
import { useBiometrics } from "../../context/BiometricsContext";
import { triggerHaptic } from "../../utils/haptics";
import { clearAppCache, getAppCacheSize } from "../../services/cacheCleaner";
import {
  getOrFetchCachedImage,
  forceRefetchCachedImage,
  checkAndSyncDailyImage,
  recordBannerSyncedToday,
} from "../../services/cachedImageService";

const PROFILE_BANNER_URL = "https://repo-asset.vercel.app/mark/profile-banner.webp";

interface ProfileMenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress: () => void;
}

interface ProfileMenuSection {
  title: string;
  items: ProfileMenuItem[];
}

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
  const isNavigatingRef = useRef(false);
  const [bannerUri, setBannerUri] = useState<string>(PROFILE_BANNER_URL);
  const [isRefetchingBanner, setIsRefetchingBanner] = useState(false);

  const bannerTapCountRef = useRef(0);
  const bannerTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showDialog = useCallback((title: string, message?: string, actions?: IosDialogAction[]) => {
    setDialogState({ visible: true, title, message, actions });
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    let isMounted = true;
    getOrFetchCachedImage(PROFILE_BANNER_URL, "profile-banner.webp").then((uri) => {
      if (isMounted && uri) {
        setBannerUri(uri);
      }
    });

    checkAndSyncDailyImage(PROFILE_BANNER_URL, "profile-banner.webp", (newUri) => {
      if (isMounted && newUri) {
        setBannerUri(newUri);
      }
    });

    return () => {
      isMounted = false;
      if (bannerTapTimerRef.current) {
        clearTimeout(bannerTapTimerRef.current);
      }
    };
  }, []);

  const handleBannerPress = useCallback(() => {
    triggerHaptic();
    bannerTapCountRef.current += 1;

    if (bannerTapTimerRef.current) {
      clearTimeout(bannerTapTimerRef.current);
    }

    if (bannerTapCountRef.current >= 6) {
      bannerTapCountRef.current = 0;
      setIsRefetchingBanner(true);

      forceRefetchCachedImage(PROFILE_BANNER_URL, "profile-banner.webp").then((newUri) => {
        setBannerUri(`${newUri}?t=${Date.now()}`);
        setIsRefetchingBanner(false);
        recordBannerSyncedToday("profile-banner.webp");
      });
    } else {
      bannerTapTimerRef.current = setTimeout(() => {
        bannerTapCountRef.current = 0;
      }, 2500);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      isNavigatingRef.current = false;
      setStatusBarStyle("dark");
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle("dark-content");
      }

      checkAndSyncDailyImage(PROFILE_BANNER_URL, "profile-banner.webp", (newUri) => {
        setBannerUri(newUri);
      });

      return () => {
        setIsFocused(false);
        setStatusBarStyle("dark");
        if (Platform.OS === "android") {
          RNStatusBar.setBarStyle("dark-content");
        }
      };
    }, [])
  );

  const navigateSafely = useCallback(
    (path: string) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;
      router.push(path as any);

      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 750);
    },
    [router]
  );

  const handleAvatarPress = useCallback(() => {
    triggerHaptic();
    navigateSafely("/profile/personal-info");
  }, [navigateSafely]);

  const handleToggleBiometrics = useCallback(
    async (val: boolean) => {
      if (isTogglingBiometrics) return;
      triggerHaptic();

      if (val && (!capability?.hasHardware || !capability?.isEnrolled)) {
        showDialog(
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
            showDialog("Verification Failed", result.error);
          }
        } else if (val) {
          showDialog(
            "Biometric Lock Active",
            `Mark-X is now secured with ${capability?.sensorName || "device biometrics"}.`
          );
        }
      } finally {
        setIsTogglingBiometrics(false);
      }
    },
    [isTogglingBiometrics, capability, setBiometricsEnabled, showDialog]
  );

  const performClearCache = useCallback(async () => {
    closeDialog();
    triggerHaptic();

    const { clearedMB } = await clearAppCache();
    const formattedSize =
      clearedMB >= 1024 ? `${(clearedMB / 1024).toFixed(2)} GB` : `${clearedMB} MB`;

    setTimeout(() => {
      showDialog(
        "Cache Cleared",
        clearedMB > 0
          ? `Successfully freed up ${formattedSize} of cached images and temporary files.`
          : "Your app cache is already clean!",
        [{ text: "OK", bold: true, onPress: closeDialog }]
      );
    }, 250);
  }, [closeDialog, showDialog]);

  const handleClearCache = useCallback(async () => {
    triggerHaptic();
    const { sizeMB } = await getAppCacheSize();
    const formattedSize =
      sizeMB >= 1024 ? `${(sizeMB / 1024).toFixed(2)} GB` : `${sizeMB} MB`;

    const promptText =
      sizeMB > 0
        ? `Your current app cache is ${formattedSize}. Are you sure you want to clear temporary photos and cached images to free up storage space?`
        : "Your app cache is currently clean (0 MB). Would you still like to run cache optimization?";

    showDialog("Clear Cache & Temp Files", promptText, [
      { text: "Cancel", style: "cancel", onPress: closeDialog },
      { text: "Clear Cache", style: "destructive", bold: true, onPress: performClearCache },
    ]);
  }, [closeDialog, performClearCache, showDialog]);

  const userName = user?.displayName || "User";
  const photoUri = user?.photoURL || user?.providerData?.[0]?.photoURL || null;

  const joinedDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "15 Nov 2024";

  const menuSections: ProfileMenuSection[] = useMemo(
    () => [
      {
        title: "Account",
        items: [
          {
            id: "personal-info",
            icon: "person-outline",
            title: "Personal information",
            onPress: () => navigateSafely("/profile/personal-info"),
          },
          {
            id: "security",
            icon: "lock-closed-outline",
            title: "Security & Privacy",
            onPress: () => navigateSafely("/profile/security"),
          },
        ],
      },
      {
        title: "Security & Devices",
        items: [
          {
            id: "biometrics",
            icon: "finger-print-outline",
            title: "Biometric Lock",
            subtitle: capability?.sensorName || "Device sensor protection",
            onPress: () => handleToggleBiometrics(!isBiometricsEnabled),
            rightElement: (
              <View pointerEvents="none">
                <IosSwitch
                  disabled={isTogglingBiometrics}
                  value={isBiometricsEnabled}
                  activeColor="#222222"
                />
              </View>
            ),
          },
          {
            id: "devices",
            icon: "hardware-chip-outline",
            title: "Active devices",
            onPress: () => navigateSafely("/profile/devices"),
          },
          {
            id: "cache",
            icon: "trash-outline",
            title: "Clear Cache",
            onPress: handleClearCache,
          },
        ],
      },
      {
        title: "Support & Legal",
        items: [
          {
            id: "help",
            icon: "help-circle-outline",
            title: "Help & Support",
            onPress: () => navigateSafely("/profile/help"),
          },
          {
            id: "terms",
            icon: "document-text-outline",
            title: "Terms & Conditions",
            onPress: () => navigateSafely("/profile/terms"),
          },
          {
            id: "privacy",
            icon: "shield-checkmark-outline",
            title: "Privacy Policy",
            onPress: () => navigateSafely("/profile/privacy"),
          },
          {
            id: "about",
            icon: "information-circle-outline",
            title: "About",
            onPress: () => navigateSafely("/profile/about"),
          },
        ],
      },
    ],
    [
      navigateSafely,
      capability?.sensorName,
      isBiometricsEnabled,
      isTogglingBiometrics,
      handleToggleBiometrics,
      handleClearCache,
    ]
  );

  return (
    <View className="flex-1 bg-white">
      {isFocused && <StatusBar style="dark" />}

      <ScrollView showsVerticalScrollIndicator={false} bounces={true} scrollEventThrottle={16}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleBannerPress}
          className="w-full h-[180px] relative"
        >
          <Image
            source={{ uri: bannerUri }}
            placeholder={require("../../../assets/images/profile-banner.jpg")}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={300}
          />
          {isRefetchingBanner && (
            <View className="absolute inset-0 bg-black/40 items-center justify-center z-20">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text
                className="text-white text-[12px] mt-1.5"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Refetching banner...
              </Text>
            </View>
          )}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: insets.top + 20,
            }}
          />
        </TouchableOpacity>

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

          {menuSections.map((section) => (
            <View key={section.title}>
              <Text
                className="text-[20px] text-[#222222] mt-6 mb-1"
                style={{ fontFamily: "Outfit_700Bold" }}
              >
                {section.title}
              </Text>

              <View>
                {section.items.map((item, index) => (
                  <ProfileCardRow
                    key={item.id}
                    icon={item.icon}
                    title={item.title}
                    subtitle={item.subtitle}
                    onPress={item.onPress}
                    rightElement={item.rightElement}
                    showDivider={index < section.items.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}

          <View className="h-10" />
        </View>
      </ScrollView>

      <IosDialog
        visible={dialogState.visible}
        title={dialogState.title}
        message={dialogState.message}
        onClose={closeDialog}
        actions={
          dialogState.actions || [
            {
              text: "OK",
              bold: true,
              onPress: closeDialog,
            },
          ]
        }
      />
    </View>
  );
}
