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

import { GalleryPin, INITIAL_GALLERY_PINS } from "../../utils/galleryData";
import { MarkXLogo } from "../../components/common/MarkXLogo";
import { GalleryPinCard } from "../../components/gallery/GalleryPinCard";
import { GalleryDetailModal } from "../../components/gallery/GalleryDetailModal";
import { GalleryPinOptionsSheet } from "../../components/gallery/GalleryPinOptionsSheet";
import { GalleryMasonrySkeleton } from "../../components/gallery/GallerySkeleton";
import { GalleryEmptyState } from "../../components/gallery/GalleryEmptyState";
import { safePickImage } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";

import { loadGalleryPins, saveGalleryPins } from "../../services/storageService";

export default function GalleryScreen() {
  const { width: windowWidth } = useWindowDimensions();

  // 2-column masonry spacing (12px side margin, 10px gutter between columns)
  const columnWidth = (windowWidth - 24 - 10) / 2;

  // Gallery state loaded from persistence
  const [pins, setPins] = useState<GalleryPin[]>(INITIAL_GALLERY_PINS);
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
    loadGalleryPins().then((stored) => {
      if (isMounted && stored.length > 0) {
        setPins(stored);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const updatePinsAndPersist = (updater: (prev: GalleryPin[]) => GalleryPin[]) => {
    setPins((prev) => {
      const updated = updater(prev);
      saveGalleryPins(updated);
      return updated;
    });
  };

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
  const handleLikeToggle = (pinId: string) => {
    updatePinsAndPersist((prev) =>
      prev.map((pin) =>
        pin.id === pinId ? { ...pin, isLiked: !pin.isLiked, likes: pin.isLiked ? pin.likes - 1 : pin.likes + 1 } : pin
      )
    );
  };

  // Save Toggle
  const handleSaveToggle = (pinId: string) => {
    updatePinsAndPersist((prev) =>
      prev.map((pin) =>
        pin.id === pinId ? { ...pin, saved: !pin.saved } : pin
      )
    );
  };

  // Hide Pin
  const handleHidePin = (pinId: string) => {
    updatePinsAndPersist((prev) => prev.filter((p) => p.id !== pinId));
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
      updatePinsAndPersist((prev) => [newPin, ...prev]);
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
                {leftPins.map((pin) => (
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
                {rightPins.map((pin) => (
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
