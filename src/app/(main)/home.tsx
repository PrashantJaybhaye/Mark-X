import React, { useState } from "react";
import {
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
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
  RemindersCardArt,
} from "../../components/home/HomeVisuals";
import { StorageHeroCard } from "../../components/home/StorageHeroCard";
import { BottomTabBar, TabKey } from "../../components/navigation/BottomTabBar";
import { useAuth } from "../../context/AuthContext";
import { safePickDocument, safePickImage } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  // Storage and file counter states
  const [usedStorage, setUsedStorage] = useState("0.00");
  const [galleryCount, setGalleryCount] = useState(0);
  const [remindersCount, setRemindersCount] = useState(0);
  const [docsCount, setDocsCount] = useState(2);

  const handleLogout = async () => {
    triggerHaptic();
    try {
      await signOut();
    } catch (e) {
      console.warn("Logout error:", e);
    }
  };

  const handleUploadFile = async () => {
    triggerHaptic();
    const file = await safePickDocument();
    if (file) {
      setDocsCount((prev) => prev + 1);
      setUsedStorage((prev) => (parseFloat(prev) + 0.05).toFixed(2));
    }
  };

  const handleAddPhoto = async () => {
    triggerHaptic();
    const img = await safePickImage();
    if (img) {
      setGalleryCount((prev) => prev + 1);
      setUsedStorage((prev) => (parseFloat(prev) + 0.02).toFixed(2));
    }
  };

  return (
    <View className="flex-1 bg-[#F4F5F7]">
      <StatusBar style="dark" />

      {/* Top Ambient Atmospheric Glow (Monzo Style) */}
      <Svg
        width="100%"
        height={screenHeight > 800 ? 560 : 490}
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        pointerEvents="none"
      >
        <Defs>
          {/* Main vertical atmospheric gradient */}
          <LinearGradient id="topGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FF8A5B" stopOpacity="0.92" />
            <Stop offset="20%" stopColor="#FF9B73" stopOpacity="0.75" />
            <Stop offset="45%" stopColor="#FFB69A" stopOpacity="0.5" />
            <Stop offset="70%" stopColor="#FFD8C7" stopOpacity="0.22" />
            <Stop offset="90%" stopColor="#F6F7F9" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#F4F5F7" stopOpacity="0" />
          </LinearGradient>

          {/* Concentrated top-right warm amber light */}
          <RadialGradient id="coreAmberGlow" cx="80%" cy="2%" rx="75%" ry="50%">
            <Stop offset="0%" stopColor="#FF7043" stopOpacity="0.75" />
            <Stop offset="25%" stopColor="#FF825A" stopOpacity="0.55" />
            <Stop offset="50%" stopColor="#FFA17F" stopOpacity="0.3" />
            <Stop offset="75%" stopColor="#FFC8B5" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>

          {/* Soft ambient balance from top-left */}
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
        {/* Top Header Bar */}
        <View className="flex-row items-center justify-between px-5 pt-6 pb-3">
          <View className="justify-center">
            <MarkXLogo width={110} height={15} color="#111111" />
          </View>

          {/* Right Actions: Frosted Pill (Search & Add) */}
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

        {/* Fixed Hero Card (Outside ScrollView) */}
        <View className="px-4 pt-3 pb-1">
          <StorageHeroCard
            usedStorage={usedStorage}
            onManageStorage={() => triggerHaptic()}
            onUploadFile={handleUploadFile}
            onAddPhoto={handleAddPhoto}
          />
        </View>

        {/* Scrollable Content Below Hero Card */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: Math.max(insets.bottom, 12) + 75,
          }}
        >
          {/* 2x2 Feature Grid */}
          <View className="w-full gap-3.5">
            {/* Row 1: Gallery & Reminders */}
            <View className="flex-row gap-3.5">
              <FeatureCard
                title="Gallery"
                count={galleryCount}
                subtitle="Photos & Videos"
                onPress={() => {
                  triggerHaptic();
                  setActiveTab("drive");
                }}
              >
                <GalleryCardArt />
              </FeatureCard>

              <FeatureCard
                title="Reminders"
                count={remindersCount}
                subtitle="Tasks & Due Alerts"
                onPress={() => {
                  triggerHaptic();
                  setActiveTab("notes");
                }}
              >
                <RemindersCardArt />
              </FeatureCard>
            </View>

            {/* Row 2: Secure Notes & Document Drive */}
            <View className="flex-row gap-3.5">
              <FeatureCard
                title="Secure Notes"
                count="Notes"
                subtitle="Continuous Autosave"
                onPress={() => {
                  triggerHaptic();
                  setActiveTab("notes");
                }}
              >
                <NotesCardArt />
              </FeatureCard>

              <FeatureCard
                title="Document Drive"
                count={docsCount}
                subtitle="Fast Secure Sync"
                onPress={() => {
                  triggerHaptic();
                  setActiveTab("drive");
                }}
              >
                <DriveCardArt />
              </FeatureCard>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation Bar */}
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === "profile") {
              handleLogout();
            } else {
              setActiveTab(tab);
            }
          }}
          onCenterActionPress={handleUploadFile}
          bottomInset={insets.bottom}
        />
      </SafeAreaView>
    </View>
  );
}
