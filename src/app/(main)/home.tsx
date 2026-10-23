import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { FeatureCard } from "../../components/home/FeatureCard";
import { MarkXLogo } from "../../components/common/MarkXLogo";
import {
  DriveCardArt,
  GalleryCardArt,
  NotesCardArt,
  CameraCardArt,
} from "../../components/home/HomeVisuals";
import { StorageHeroCard } from "../../components/home/StorageHeroCard";
import { triggerHaptic } from "../../utils/haptics";
import { useAuth } from "../../context/AuthContext";
import {
  loadUserPreferences,
  saveUserPreferences,
  recalculateTotalUsedStorageGB,
} from "../../services/storageService";
import { auth } from "../../services/firebase";
import { getUserMetadata, subscribeUserStats } from "../../services/userService";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Responsive padding for curved displays & safe areas:
  // Math.max(insets.left, insets.right, 20) keeps elements inside the flat viewable plane on curved screens
  const horizontalPadding = Math.max(insets.left, insets.right, 20);
  const bottomScrollPadding = Math.max(insets.bottom, 16) + 76;

  const [usedStorage, setUsedStorage] = useState("0.00");
  const [galleryCount, setGalleryCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [docsCount, setDocsCount] = useState(0);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const applyStats = React.useCallback((stats: { driveCount?: number; galleryCount?: number; notesCount?: number; usedStorageGB?: number }) => {
    setDocsCount(stats.driveCount ?? 0);
    setGalleryCount(stats.galleryCount ?? 0);
    setNotesCount(stats.notesCount ?? 0);
    setUsedStorage((stats.usedStorageGB ?? 0).toFixed(2));
    setIsStatsLoading(false);
  }, []);

  const refreshCounts = React.useCallback(async (explicitUid?: string) => {
    try {

      const recalculatedGB = await recalculateTotalUsedStorageGB();

      const prefs = await loadUserPreferences();
      if (prefs.stats) {
        applyStats({ ...prefs.stats, usedStorageGB: recalculatedGB });
      }

      const uid = explicitUid || user?.uid || auth.currentUser?.uid;
      if (uid) {
        const metadata = await getUserMetadata(uid);
        if (metadata && metadata.stats) {
          const finalGB = recalculatedGB;
          const mergedStats = { ...metadata.stats, usedStorageGB: finalGB };
          applyStats(mergedStats);
          await saveUserPreferences({ ...prefs, stats: mergedStats });
        } else if (!prefs.stats) {
          setIsStatsLoading(false);
        }
      }
    } catch (err) {
      console.warn("[HomeScreen] Could not refresh metrics:", err);
      setIsStatsLoading(false);
    }
  }, [user?.uid, applyStats]);

  React.useEffect(() => {

    const timer = setTimeout(() => {
      setIsStatsLoading(false);
    }, 2500);

    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return () => clearTimeout(timer);

    refreshCounts(uid);

    const unsubscribe = subscribeUserStats(uid, (stats) => {
      applyStats(stats);
      loadUserPreferences().then((prefs) => {
        saveUserPreferences({ ...prefs, stats }).catch(console.warn);
      });
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [user?.uid, refreshCounts, applyStats]);

  const isNavigatingRef = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      isNavigatingRef.current = false;
      setStatusBarStyle("dark");
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle("dark-content");
      }
      refreshCounts();
    }, [refreshCounts])
  );

  const handleUploadFile = () => {
    triggerHaptic();
    router.navigate("/(main)/drive");
  };

  const handleAddPhoto = () => {
    triggerHaptic();
    router.navigate("/(main)/gallery");
  };

  const handleCapturePhoto = () => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    triggerHaptic();
    router.push('/camera');
  };

  return (
    <View className="flex-1 bg-[#F4F5F7]">
      <StatusBar style="dark" />

      <Svg
        width="100%"
        height={screenHeight > 800 ? 560 : 490}
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="topGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FF8A5B" stopOpacity="0.92" />
            <Stop offset="20%" stopColor="#FF9B73" stopOpacity="0.75" />
            <Stop offset="45%" stopColor="#FFB69A" stopOpacity="0.5" />
            <Stop offset="70%" stopColor="#FFD8C7" stopOpacity="0.22" />
            <Stop offset="90%" stopColor="#F6F7F9" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#F4F5F7" stopOpacity="0" />
          </LinearGradient>

          <RadialGradient id="coreAmberGlow" cx="80%" cy="2%" rx="75%" ry="50%">
            <Stop offset="0%" stopColor="#FF7043" stopOpacity="0.75" />
            <Stop offset="25%" stopColor="#FF825A" stopOpacity="0.55" />
            <Stop offset="50%" stopColor="#FFA17F" stopOpacity="0.3" />
            <Stop offset="75%" stopColor="#FFC8B5" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>

          <RadialGradient id="softCoralGlow" cx="15%" cy="8%" rx="60%" ry="40%">
            <Stop offset="0%" stopColor="#FFD0BC" stopOpacity="0.28" />
            <Stop offset="50%" stopColor="#FFE5D9" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect width="100%" height="100%" fill="url(#topGlow)" />
        <Rect width="100%" height="100%" fill="url(#coreAmberGlow)" />
        <Rect width="100%" height="100%" fill="url(#softCoralGlow)" />
      </Svg>

      <SafeAreaView edges={["top"]} className="flex-1">
        <View
          className="flex-row items-center justify-between pt-6 pb-3"
          style={{ paddingHorizontal: horizontalPadding }}
        >
          <View className="justify-center">
            <MarkXLogo width={115} height={16} color="#111111" />
          </View>

          <View className="flex-row items-center bg-[#F8DEC8]/90 border border-white/60 rounded-full px-4 py-2 gap-4">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => triggerHaptic()}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="search" size={19} color="#3E140A" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleUploadFile}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={23} color="#3E140A" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          overScrollMode="always"
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
            paddingTop: 6,
            paddingBottom: bottomScrollPadding,
          }}
        >
          <View className="w-full mb-3.5">
            <StorageHeroCard
              usedStorage={usedStorage}
              isStatsLoading={isStatsLoading}
              onUploadFile={handleUploadFile}
              onAddPhoto={handleAddPhoto}
            />
          </View>

          <View className="w-full gap-3.5">
            <View className="flex-row gap-3.5">
              <FeatureCard
                title="Gallery"
                count={galleryCount}
                isLoading={isStatsLoading}
                subtitle="Photos & Videos"
                onPress={() => {
                  triggerHaptic();
                  router.navigate("/(main)/gallery");
                }}
              >
                <GalleryCardArt />
              </FeatureCard>

              <FeatureCard
                title="Camera"
                count="Ready"
                subtitle="Snap & Upload"
                onPress={handleCapturePhoto}
              >
                <CameraCardArt />
              </FeatureCard>
            </View>

            <View className="flex-row gap-3.5">
              <FeatureCard
                title="Secure Notes"
                count={notesCount}
                isLoading={isStatsLoading}
                subtitle="Continuous Autosave"
                onPress={() => {
                  triggerHaptic();
                  router.navigate("/(main)/notes");
                }}
              >
                <NotesCardArt />
              </FeatureCard>

              <FeatureCard
                title="Document Drive"
                count={docsCount}
                isLoading={isStatsLoading}
                subtitle="Fast Secure Sync"
                onPress={() => {
                  triggerHaptic();
                  router.navigate("/(main)/drive");
                }}
              >
                <DriveCardArt />
              </FeatureCard>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
