import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { GalleryPin, INITIAL_GALLERY_PINS } from "../../utils/galleryData";
import { MarkXLogo } from "../../components/common/MarkXLogo";
import { GalleryPinCard } from "../../components/gallery/GalleryPinCard";
import { GalleryDetailModal } from "../../components/gallery/GalleryDetailModal";
import { GalleryPinOptionsSheet } from "../../components/gallery/GalleryPinOptionsSheet";
import { GalleryMasonrySkeleton } from "../../components/gallery/GallerySkeleton";
import { safePickImage } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";

export default function GalleryScreen() {
  const { width: windowWidth } = useWindowDimensions();

  // 2-column masonry spacing (12px side margin, 10px gutter between columns)
  const columnWidth = (windowWidth - 24 - 10) / 2;

  // Gallery state
  const [pins, setPins] = useState<GalleryPin[]>(INITIAL_GALLERY_PINS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Spin animation for refresh button
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Active Pin Modals
  const [selectedPin, setSelectedPin] = useState<GalleryPin | null>(null);
  const [optionsPin, setOptionsPin] = useState<GalleryPin | null>(null);

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
  const handleLikeToggle = (pinId: string) => {
    setPins((prev) =>
      prev.map((pin) =>
        pin.id === pinId ? { ...pin, isLiked: !pin.isLiked } : pin
      )
    );
  };

  // Save Toggle
  const handleSaveToggle = (pinId: string) => {
    setPins((prev) =>
      prev.map((pin) =>
        pin.id === pinId ? { ...pin, saved: !pin.saved } : pin
      )
    );
  };

  // Hide Pin
  const handleHidePin = (pinId: string) => {
    setPins((prev) => prev.filter((p) => p.id !== pinId));
  };

  // Manual Refresh Button Press
  const handleRefreshPress = () => {
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

    // Simulate feed refresh / shuffle
    setTimeout(() => {
      setPins((prev) => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        // Shuffle subtly
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      });
      setIsRefreshing(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    }, 650);
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

      const newPin: GalleryPin = {
        id: `pin-user-${Date.now()}`,
        title: result.fileName || "Captured inspiration",
        domain: "my-uploads",
        author: "You",
        imageUrl: result.uri,
        aspectRatio: calculatedRatio,
        category: "Aesthetic",
        likes: 1,
        isLiked: true,
        saved: true,
        tags: ["MyUploads", "Inspiration"],
        description: "Added to your inspiration collection.",
      };
      setPins((prev) => [newPin, ...prev]);
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

          {/* Right Actions: Refresh and Plus Buttons */}
          <View className="flex-row items-center gap-2.5">
            {/* Refresh Button */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleRefreshPress}
              disabled={isRefreshing}
              className="w-10 h-10 rounded-full bg-[#F0F2F4] items-center justify-center active:bg-[#E5E7EB]"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
                <Ionicons name="refresh" size={20} color="#111111" />
              </Animated.View>
            </TouchableOpacity>

            {/* Plus Add Button */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleAddPhoto}
              className="w-10 h-10 rounded-full bg-[#F0F2F4] items-center justify-center active:bg-[#E5E7EB]"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={24} color="#111111" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2-Column Pinterest-Style Masonry Feed (No Pull-To-Refresh) */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 30,
          }}
        >
          {isRefreshing ? (
            <GalleryMasonrySkeleton cardWidth={columnWidth} />
          ) : pins.length === 0 ? (
            <View className="items-center justify-center py-24">
              <Ionicons name="images-outline" size={36} color="#B4B8BF" />
              <Text className="text-[15px] font-outfit-semibold text-[#111111] mt-3">
                No pins in gallery
              </Text>
              <TouchableOpacity
                onPress={handleAddPhoto}
                className="mt-3 px-5 py-2.5 bg-[#111111] rounded-full"
              >
                <Text className="text-[13px] font-outfit-semibold text-white">
                  Add Your First Pin
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row w-full justify-between">
              {/* Left Column */}
              <View style={{ width: columnWidth }}>
                {leftPins.map((pin) => (
                  <GalleryPinCard
                    key={pin.id}
                    pin={pin}
                    cardWidth={columnWidth}
                    onPress={(p) => setSelectedPin(p)}
                    onOptionsPress={(p) => setOptionsPin(p)}
                  />
                ))}
              </View>

              {/* Right Column */}
              <View style={{ width: columnWidth }}>
                {rightPins.map((pin) => (
                  <GalleryPinCard
                    key={pin.id}
                    pin={pin}
                    cardWidth={columnWidth}
                    onPress={(p) => setSelectedPin(p)}
                    onOptionsPress={(p) => setOptionsPin(p)}
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
