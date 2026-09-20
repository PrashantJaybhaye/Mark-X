import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  SecurityCardArt,
} from "../../components/home/HomeVisuals";
import { StorageHeroCard } from "../../components/home/StorageHeroCard";
import { safePickDocument, safePickImage } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";
import {
  loadDriveItems,
  saveDriveItems,
  loadUserPreferences,
  loadCachedGalleryPins,
  saveCachedGalleryPins,
} from "../../services/storageService";
import { addGalleryPinToServer, updateGalleryPinInServer } from "../../services/galleryFirebaseService";
import { uploadFileToMarkx } from "../../services/cloudflareStorage";
import { getFileCategory, DriveItem } from "../../utils/driveFileTypes";
import { GalleryPin, formatBytes } from "../../utils/galleryData";

export default function HomeScreen() {
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();

  // Storage and file counter states dynamically derived from real storage
  const [usedStorage, setUsedStorage] = useState("0.00");
  const [galleryCount, setGalleryCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [docsCount, setDocsCount] = useState(0);

  const refreshCounts = React.useCallback(async () => {
    try {
      const prefs = await loadUserPreferences();
      const stats = prefs.stats || {
        notesCount: 0,
        galleryCount: 0,
        driveCount: 0,
        usedStorageGB: 0,
      };
      setDocsCount(stats.driveCount);
      setGalleryCount(stats.galleryCount);
      setNotesCount(stats.notesCount);
      setUsedStorage(stats.usedStorageGB.toFixed(2));
    } catch (err) {
      console.warn("[HomeScreen] Could not refresh metrics:", err);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle("dark");
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle("dark-content");
      }
      refreshCounts();
    }, [refreshCounts])
  );

  const handleUploadFile = async () => {
    triggerHaptic();
    const file = await safePickDocument();
    if (file) {
      const category = getFileCategory(file.name, file.mimeType);
      const newItem: DriveItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name || "Uploaded Document",
        category,
        size: formatBytes(file.size),
        updatedAt: "Just now",
        uri: file.uri,
        mimeType: file.mimeType,
      };
      const existing = await loadDriveItems();
      await saveDriveItems([newItem, ...existing]);
      await refreshCounts();
    }
  };

  const handleAddPhoto = async () => {
    triggerHaptic();
    const img = await safePickImage();
    if (img && img.uri) {
      const isVideo = img.type === "video";
      const defaultMime = isVideo ? "video/mp4" : "image/jpeg";
      const timestampNow = Date.now();
      const shortFileName = `${timestampNow}${isVideo ? ".mp4" : ".jpg"}`;
      const newPinId = `pin-${timestampNow}`;
      const calculatedRatio = img.width && img.height ? Math.max(Math.min(img.width / img.height, 1.4), 0.6) : 0.75;
      const fileSize = img.fileSize || (isVideo ? 14800000 : 2800000);

      const newPin: GalleryPin = {
        id: newPinId,
        fileName: shortFileName,
        author: "You",
        imageUrl: img.uri,
        mediaType: isVideo ? "video" : "image",
        duration: img.duration,
        aspectRatio: calculatedRatio,
        width: img.width || (calculatedRatio >= 1 ? 1920 : 1080),
        height: img.height || Math.round((img.width || 1080) / calculatedRatio),
        fileSize,
        fileSizeFormatted: formatBytes(fileSize),
        mimeType: img.mimeType || defaultMime,
        likes: 1,
        isLiked: true,
        saved: true,
        uploadStatus: "uploading",
      };
      
      // Save metadata to server (gallery screen manages its own cache on focus)
      await addGalleryPinToServer(newPin);
      
      // Upload physical file to Mark-X Storage in background with shortFileName
      uploadFileToMarkx(img.uri, img.mimeType || defaultMime, shortFileName)
        .then(async (res) => {
          if (res.success && res.url) {
            await updateGalleryPinInServer(newPin.id, {
              imageUrl: res.url,
              uploadStatus: "synced",
            });
            const currentCached = await loadCachedGalleryPins();
            await saveCachedGalleryPins(
              currentCached.map((p) =>
                p.id === newPin.id
                  ? { ...p, imageUrl: res.url!, uploadStatus: "synced" as const }
                  : p
              )
            );
          } else {
            console.warn("[HomeUpload] Upload failed:", res.error);
            const currentCached = await loadCachedGalleryPins();
            await saveCachedGalleryPins(
              currentCached.map((p) =>
                p.id === newPin.id
                  ? { ...p, uploadStatus: "failed" as const }
                  : p
              )
            );
          }
        })
        .catch(async (err) => {
          console.error("[HomeUpload] Error:", err);
          const currentCached = await loadCachedGalleryPins();
          await saveCachedGalleryPins(
            currentCached.map((p) =>
              p.id === newPin.id
                ? { ...p, uploadStatus: "failed" as const }
                : p
            )
          );
        });
      
      await refreshCounts();
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

            onUploadFile={handleUploadFile}
            onAddPhoto={handleAddPhoto}
          />
        </View>

        {/* Scrollable Content Below Hero Card */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          overScrollMode="always"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: 40,
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
                  router.navigate("/(main)/gallery");
                }}
              >
                <GalleryCardArt />
              </FeatureCard>

              <FeatureCard
                title="Security Vault"
                count="Active"
                subtitle="Biometric & AES Protected"
                onPress={() => {
                  triggerHaptic();
                  router.navigate("/profile/security");
                }}
              >
                <SecurityCardArt />
              </FeatureCard>
            </View>

            {/* Row 2: Secure Notes & Document Drive */}
            <View className="flex-row gap-3.5">
              <FeatureCard
                title="Secure Notes"
                count={notesCount}
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
