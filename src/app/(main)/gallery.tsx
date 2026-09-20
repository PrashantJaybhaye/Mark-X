import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { GalleryPin } from "../../utils/galleryData";
import { MarkXLogo } from "../../components/common/MarkXLogo";
import { GalleryPinCard } from "../../components/gallery/GalleryPinCard";
import { GalleryDetailModal } from "../../components/gallery/GalleryDetailModal";
import { GalleryPinOptionsSheet } from "../../components/gallery/GalleryPinOptionsSheet";
import { GalleryMasonrySkeleton } from "../../components/gallery/GallerySkeleton";
import { GalleryEmptyState } from "../../components/gallery/GalleryEmptyState";
import { safePickImage } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";
import { generateUUID } from "../../utils/uuid";

import { 
  fetchGalleryPinsFromFirestore, 
  addGalleryPinToFirestore, 
  deleteGalleryPinFromFirestore, 
  updateGalleryPinInFirestore 
} from "../../services/galleryFirebaseService";
import { uploadFileToCloudflare } from "../../services/cloudflareStorage";

export default function GalleryScreen() {
  const { width: windowWidth } = useWindowDimensions();

  // 2-column masonry spacing (12px side margin, 10px gutter between columns)
  const columnWidth = (windowWidth - 24 - 10) / 2;

  // Gallery state loaded from persistence
  const [pins, setPins] = useState<GalleryPin[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle("dark");
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle("dark-content");
      }
    }, [])
  );

  useEffect(() => {
    let isMounted = true;
    const fetchPins = async () => {
      const fetched = await fetchGalleryPinsFromFirestore();
      if (isMounted) {
        setPins(fetched);
      }
    };
    fetchPins();
    return () => {
      isMounted = false;
    };
  }, []);

  // Spin animation for refresh button
  const [spinAnim] = useState(() => new Animated.Value(0));

  // Active Pin Modals
  const [selectedPin, setSelectedPin] = useState<GalleryPin | null>(null);
  const [optionsPin, setOptionsPin] = useState<GalleryPin | null>(null);

  const handleSelectPin = React.useCallback((p: GalleryPin) => {
    setSelectedPin(p);
  }, []);

  const handleOptionsPin = React.useCallback((p: GalleryPin) => {
    setOptionsPin(p);
  }, []);

  // Balance pins across 2 masonry columns based on dynamic height
  const { leftPins, rightPins } = useMemo(() => {
    const left: GalleryPin[] = [];
    const right: GalleryPin[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    pins.forEach((pin) => {
      const estimatedHeight =
        Math.min(Math.max(columnWidth / pin.aspectRatio, 120), 320) + 26;
      if (leftHeight <= rightHeight) {
        left.push(pin);
        leftHeight += estimatedHeight;
      } else {
        right.push(pin);
        rightHeight += estimatedHeight;
      }
    });

    return { leftPins: left, rightPins: right };
  }, [pins, columnWidth]);

  // Like Toggle
  const handleLikeToggle = async (pinId: string) => {
    const pin = pins.find((p) => p.id === pinId);
    if (!pin) return;
    const newIsLiked = !pin.isLiked;
    const newLikes = newIsLiked ? pin.likes + 1 : pin.likes - 1;

    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId ? { ...p, isLiked: newIsLiked, likes: newLikes } : p
      )
    );
    await updateGalleryPinInFirestore(pinId, { isLiked: newIsLiked, likes: newLikes });
  };

  // Save Toggle
  const handleSaveToggle = async (pinId: string) => {
    const pin = pins.find((p) => p.id === pinId);
    if (!pin) return;
    const newSaved = !pin.saved;

    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId ? { ...p, saved: newSaved } : p
      )
    );
    await updateGalleryPinInFirestore(pinId, { saved: newSaved });
  };

  // Hide Pin
  const handleHidePin = async (pinId: string) => {
    setPins((prev) => prev.filter((p) => p.id !== pinId));
    await deleteGalleryPinFromFirestore(pinId);
  };

  // Manual Refresh Button Press
  const handleRefreshPress = async () => {
    if (isRefreshing) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    // Spin animation
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    setIsRefreshing(true);

    const fetched = await fetchGalleryPinsFromFirestore();
    if (fetched.length > 0) {
      setPins(fetched);
    }
    setIsRefreshing(false);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  };

  // Pick photo to add to user's inspiration pins
  const handleAddPhoto = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const result = await safePickImage();
    if (result && result.uri) {
      const calculatedRatio =
        result.width && result.height
          ? Math.max(Math.min(result.width / result.height, 1.4), 0.6)
          : 0.75;

      const isVideo = result.type === "video";
      const newPin: GalleryPin = {
        id: `pin-${generateUUID()}`,
        title: result.fileName || (isVideo ? "Video Inspiration" : "New Inspiration"),
        domain: isVideo ? "video" : "my-uploads",
        author: "You",
        imageUrl: result.uri,
        mediaType: isVideo ? "video" : "image",
        duration: result.duration,
        aspectRatio: calculatedRatio,
        category: "Aesthetic",
        likes: 1,
        isLiked: true,
        saved: true,
        tags: isVideo ? ["Video", "Inspiration"] : ["MyUploads", "Inspiration"],
        description: isVideo ? "Video added to your collection." : "Added to your inspiration collection.",
      };
      
      // Update local state immediately
      setPins((prev) => [newPin, ...prev]);

      // Use Firestore for metadata instead of local array rewrite
      await addGalleryPinToFirestore(newPin);

      // Upload to Cloudflare in background
      const defaultMime = isVideo ? "video/mp4" : "image/jpeg";
      const defaultFilename = isVideo ? "video.mp4" : "photo.jpg";
      uploadFileToCloudflare(result.uri, result.mimeType || defaultMime, result.fileName || defaultFilename).then(async res => {
        if (res.success && res.url) {
          setPins((prev) => 
            prev.map(p => p.id === newPin.id ? { ...p, imageUrl: res.url! } : p)
          );
          await updateGalleryPinInFirestore(newPin.id, { imageUrl: res.url });
        }
      });
    }
  };

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        {/* Simple & Clean Header: Mark-X Logo + Refresh & Add Buttons */}
        <View className="flex-row items-center justify-between px-5 pt-6 pb-3 bg-white border-b border-[#F2F2F2]">
          <View className="justify-center">
            <MarkXLogo width={115} height={16} color="#111111" />
          </View>

          {/* Right Actions: Pill Container (Refresh & Add) */}
          <View className="flex-row items-center bg-[#F0F2F4] border border-[#E5E7EB] rounded-full px-4 py-2 gap-4">
            {/* Refresh Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRefreshPress}
              disabled={isRefreshing}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
                <Ionicons name="refresh" size={19} color="#111111" />
              </Animated.View>
            </TouchableOpacity>

            {/* Plus Add Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAddPhoto}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={23} color="#111111" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2-Column Pinterest-Style Masonry Feed (No Pull-To-Refresh) */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 30,
          }}
        >
          {isRefreshing ? (
            <GalleryMasonrySkeleton cardWidth={columnWidth} />
          ) : pins.length === 0 ? (
            <GalleryEmptyState
              cardWidth={columnWidth}
              onAddPhoto={handleAddPhoto}
            />
          ) : (
            <View className="flex-row w-full justify-between">
              {/* Left Column */}
              <View style={{ width: columnWidth }}>
                {leftPins.map((pin: GalleryPin) => (
                  <GalleryPinCard
                    key={pin.id}
                    pin={pin}
                    cardWidth={columnWidth}
                    onPress={handleSelectPin}
                    onOptionsPress={handleOptionsPin}
                  />
                ))}
              </View>

              {/* Right Column */}
              <View style={{ width: columnWidth }}>
                {rightPins.map((pin: GalleryPin) => (
                  <GalleryPinCard
                    key={pin.id}
                    pin={pin}
                    cardWidth={columnWidth}
                    onPress={handleSelectPin}
                    onOptionsPress={handleOptionsPin}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Pin Detail Modal */}
      <GalleryDetailModal
        pin={selectedPin}
        visible={!!selectedPin}
        onClose={() => setSelectedPin(null)}
        onLikeToggle={handleLikeToggle}
        onSaveToggle={handleSaveToggle}
      />

      {/* 3 Dots Options Sheet */}
      <GalleryPinOptionsSheet
        pin={optionsPin}
        visible={!!optionsPin}
        onClose={() => setOptionsPin(null)}
        onSaveToggle={handleSaveToggle}
        onHidePin={handleHidePin}
      />
    </View>
  );
}
