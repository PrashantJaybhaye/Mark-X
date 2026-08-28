import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  const isCompact = screenHeight < 720;
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  // Storage and file counter states
  const [usedStorage, setUsedStorage] = useState("0.00");
  const [galleryCount, setGalleryCount] = useState(0);
  const [remindersCount, setRemindersCount] = useState(0);
  const [docsCount, setDocsCount] = useState(2);

  const handleLogout = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signOut();
    } catch (e) {
      console.warn("Logout error:", e);
    }
  };

  const handleUploadFile = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const file = await safePickDocument();
    if (file) {
      setDocsCount((prev) => prev + 1);
      setUsedStorage((prev) => (parseFloat(prev) + 0.05).toFixed(2));
    }
  };

  const handleAddPhoto = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const img = await safePickImage();
    if (img) {
      setGalleryCount((prev) => prev + 1);
      setUsedStorage((prev) => (parseFloat(prev) + 0.02).toFixed(2));
    }
  };

  return (
    <View className="flex-1 bg-[#F4F5F7]">
      <StatusBar style="dark" />

      {/* Top Ambient Peach/Orange Glow (Monzo Style) */}
      <Svg
        width="100%"
        height={screenHeight > 800 ? 540 : 480}
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
      >
        <Defs>
          <LinearGradient id="monzoTopGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFA685" stopOpacity="0.95" />
            <Stop offset="30%" stopColor="#FFB89E" stopOpacity="0.75" />
            <Stop offset="65%" stopColor="#FFDFC8" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#F4F5F7" stopOpacity="0" />
          </LinearGradient>
          <RadialGradient id="monzoRadialGlow" cx="60%" cy="8%" rx="70%" ry="60%">
            <Stop offset="0%" stopColor="#FF7A50" stopOpacity="0.65" />
            <Stop offset="55%" stopColor="#FFAA8A" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#F4F5F7" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#monzoTopGlow)" />
        <Rect width="100%" height="100%" fill="url(#monzoRadialGlow)" />
      </Svg>

      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Top Header Bar with breathable padding */}
        <View className="flex-row items-center justify-between px-5 pt-6 pb-3">
          <View className="justify-center">
            <MarkXLogo width={110} height={15} color="#111111" />
          </View>

          {/* Right Actions: Frosted Pill (Gift, Search, Add) */}
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

        {/* --- Bottom Navigation Bar --- */}
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
