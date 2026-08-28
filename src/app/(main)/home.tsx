import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { FeatureCard } from "../../components/home/FeatureCard";
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  // Storage and file counter states
  const [usedStorage, setUsedStorage] = useState("0.00");
  const [galleryCount, setGalleryCount] = useState(0);
  const [remindersCount, setRemindersCount] = useState(0);
  const [docsCount, setDocsCount] = useState(2);

  const displayName = user?.displayName
    ? user.displayName.split(" ")[0]
    : user?.email
      ? user.email.split("@")[0]
      : "You";

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

      <SafeAreaView edges={["top"]} className="flex-1 bg-[#F4F5F7]">
        {/* Top Bar */}
        <View className="flex-row items-center justify-between px-5 pt-8 pb-3.5">
          <Text
            allowFontScaling={false}
            className="text-[20px] text-[#111111] tracking-tight leading-tight pl-0.5"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            For {displayName}
          </Text>

          <View className="flex-row items-center gap-5 pr-1">
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => triggerHaptic()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="download-outline" size={24} color="#111111" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => triggerHaptic()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="search" size={23} color="#111111" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 12) + 70,
          }}
        >
          {/* Storage Balance Hero Card */}
          <StorageHeroCard
            usedStorage={usedStorage}
            onManageStorage={() => triggerHaptic()}
            onUploadFile={handleUploadFile}
            onAddPhoto={handleAddPhoto}
          />

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
          onTabChange={setActiveTab}
          onCenterActionPress={handleUploadFile}
          bottomInset={insets.bottom}
        />
      </SafeAreaView>
    </View>
  );
}
