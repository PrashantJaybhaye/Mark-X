import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
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
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { GalleryPin, formatBytes, normalizeGalleryPin, generateShortFileName } from "../../utils/galleryData";
import { auth } from "../../services/firebase";
import { MarkXLogo } from "../../components/common/MarkXLogo";
import { GalleryPinCard } from "../../components/gallery/GalleryPinCard";
import { GalleryPinOptionsSheet } from "../../components/gallery/GalleryPinOptionsSheet";
import { GalleryMasonrySkeleton } from "../../components/gallery/GallerySkeleton";
import { GalleryEmptyState } from "../../components/gallery/GalleryEmptyState";
import { safePickImage } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";
import { generateUUID } from "../../utils/uuid";

import { 
  fetchGalleryPinsFromServer, 
  addGalleryPinToServer, 
  deleteGalleryPinFromServer, 
  updateGalleryPinInServer,
  purgeLegacyFieldsFromDatabase,
  subscribeGalleryPins,
} from "../../services/galleryFirebaseService";
import { uploadFileToMarkx } from "../../services/cloudflareStorage";
import { 
  loadCachedGalleryPins, 
  saveCachedGalleryPins 
} from "../../services/storageService";

export default function GalleryScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  // 2-column masonry spacing (8px side margin, 6px gutter between columns)
  const gutter = 6;
  const sideMargin = 8;
  const columnWidth = (windowWidth - (sideMargin * 2) - gutter) / 2;

  // Gallery state loaded from persistence
  const [pins, setPins] = useState<GalleryPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Navigation debounce lock to prevent duplicate screens on multi-taps
  const isNavigatingRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      isNavigatingRef.current = false;
      setStatusBarStyle("dark");
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle("dark-content");
      }
      // Re-hydrate cached pins on screen focus and sync with server
      loadCachedGalleryPins().then((cached) => {
        setPins(cached.map(normalizeGalleryPin));
      });
      fetchGalleryPinsFromServer().then((fetched) => {
        setPins(fetched);
      }).catch(console.warn);
    }, [])
  );

  useEffect(() => {
    let isMounted = true;

    // 1. Fast path: load local cache immediately (0ms flash-free!)
    loadCachedGalleryPins().then((cached) => {
      if (isMounted && cached.length > 0) {
        setPins(cached.map(normalizeGalleryPin));
        setIsLoading(false);
      }
    });

    // 2. Real-time Firestore sync: updates instantly when images are added, edited, or deleted in DB
    const unsubscribe = subscribeGalleryPins(
      (updatedPins) => {
        if (isMounted) {
          setPins(updatedPins);
          setIsLoading(false);
        }
      },
      () => {
        if (isMounted) setIsLoading(false);
      }
    );

    // 3. Background purge and backfill to guarantee database has latest filename format
    purgeLegacyFieldsFromDatabase().catch(console.warn);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Spin animation for refresh button
  const [spinAnim] = useState(() => new Animated.Value(0));

  // Active Pin Modals
  const [optionsPin, setOptionsPin] = useState<GalleryPin | null>(null);

  // Failed Uploads Retry Logic
  const failedPins = useMemo(() => pins.filter((p) => p.uploadStatus === "failed"), [pins]);

  const handleRetryFailedUploads = React.useCallback(async () => {
    if (failedPins.length === 0) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    for (const pin of failedPins) {
      // Mark as uploading in state
      setPins((prev) =>
        prev.map((p) => (p.id === pin.id ? { ...p, uploadStatus: "uploading" as const } : p))
      );

      // If it's a test/mock pin (starts with test-failed- or http)
      if (pin.id.startsWith("test-failed-") || pin.imageUrl.startsWith("http")) {
        setTimeout(() => {
          setPins((prev) =>
            prev.map((p) =>
              p.id === pin.id ? { ...p, uploadStatus: "synced" as const } : p
            )
          );
          triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
        }, 1200);
        continue;
      }

      const isVideo = pin.mediaType === "video";
      const defaultMime = isVideo ? "video/mp4" : "image/jpeg";
      const fileName = pin.fileName || `${Date.now()}${isVideo ? ".mp4" : ".jpg"}`;

      uploadFileToMarkx(pin.imageUrl, pin.mimeType || defaultMime, fileName)
        .then(async (res) => {
          if (res.success && res.url) {
            setPins((prev) => {
              const updated = prev.map((p) =>
                p.id === pin.id
                  ? { ...p, imageUrl: res.url!, uploadStatus: "synced" as const }
                  : p
              );
              saveCachedGalleryPins(updated);
              return updated;
            });
            await updateGalleryPinInServer(pin.id, {
              imageUrl: res.url,
              uploadStatus: "synced",
            });
          } else {
            setPins((prev) => {
              const updated = prev.map((p) =>
                p.id === pin.id
                  ? { ...p, uploadStatus: "failed" as const }
                  : p
              );
              saveCachedGalleryPins(updated);
              return updated;
            });
          }
        })
        .catch((err) => {
          console.error("[RetryUpload] Failed:", err);
          setPins((prev) => {
            const updated = prev.map((p) =>
              p.id === pin.id
                ? { ...p, uploadStatus: "failed" as const }
                : p
            );
            saveCachedGalleryPins(updated);
            return updated;
          });
        });
    }
  }, [failedPins]);

  const handleSelectPin = React.useCallback((p: GalleryPin) => {
    if (p.uploadStatus === "failed") {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      handleRetryFailedUploads();
      return;
    }
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);

    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/gallery/[id]",
      params: {
        id: p.id,
        initialPin: JSON.stringify(p),
      },
    });
  }, [router, handleRetryFailedUploads]);

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
        Math.min(Math.max(columnWidth / pin.aspectRatio, 120), 320) + 16;
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
    await updateGalleryPinInServer(pinId, { isLiked: newIsLiked, likes: newLikes });
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
    await updateGalleryPinInServer(pinId, { saved: newSaved });
  };

  // Hide Pin
  const handleHidePin = async (pinId: string) => {
    setPins((prev) => {
      const updated = prev.filter((p) => p.id !== pinId);
      saveCachedGalleryPins(updated);
      return updated;
    });
    await deleteGalleryPinFromServer(pinId);
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
    try {
      const fetched = await fetchGalleryPinsFromServer();
      setPins(fetched);
      await saveCachedGalleryPins(fetched);
    } catch (e) {
      console.warn("[GalleryScreen] Refresh error:", e);
    } finally {
      setIsRefreshing(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    }
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
      const defaultMime = isVideo ? "video/mp4" : "image/jpeg";
      const timestampNow = Date.now();
      const shortFileName = `${timestampNow}${isVideo ? ".mp4" : ".jpg"}`;
      const newPinId = `pin-${timestampNow}`;
      const fileSize = result.fileSize || (isVideo ? 14800000 : 2800000);
      const newPin: GalleryPin = {
        id: newPinId,
        fileName: shortFileName,
        author: auth.currentUser?.displayName || "You",
        imageUrl: result.uri,
        mediaType: isVideo ? "video" : "image",
        ...(isVideo && typeof result.duration === "number" ? { duration: result.duration } : {}),
        aspectRatio: calculatedRatio,
        width: result.width || (calculatedRatio >= 1 ? 1920 : 1080),
        height: result.height || Math.round((result.width || 1080) / calculatedRatio),
        fileSize,
        fileSizeFormatted: formatBytes(fileSize),
        mimeType: result.mimeType || defaultMime,
        likes: 1,
        isLiked: true,
        saved: true,
        uploadStatus: "uploading",
      };
      
      // Update local state and cache immediately
      setPins((prev) => {
        const updated = [newPin, ...prev];
        saveCachedGalleryPins(updated);
        return updated;
      });

      // Use Server for metadata instead of local array rewrite
      await addGalleryPinToServer(newPin);

      // Upload to Mark-X Storage in background with shortFileName
      uploadFileToMarkx(result.uri, result.mimeType || defaultMime, shortFileName)
        .then(async (res) => {
          if (res.success && res.url) {
            setPins((prev) => {
              const updated = prev.map((p) =>
                p.id === newPin.id
                  ? { ...p, imageUrl: res.url!, uploadStatus: "synced" as const }
                  : p
              );
              saveCachedGalleryPins(updated);
              return updated;
            });
            await updateGalleryPinInServer(newPin.id, {
              imageUrl: res.url,
              uploadStatus: "synced",
            });
          } else {
            console.warn("[GalleryUpload] Failed:", res.error);
            setPins((prev) => {
              const updated = prev.map((p) =>
                p.id === newPin.id
                  ? { ...p, uploadStatus: "failed" as const }
                  : p
              );
              saveCachedGalleryPins(updated);
              return updated;
            });
          }
        })
        .catch((err) => {
          console.error("[GalleryUpload] Error:", err);
          setPins((prev) => {
            const updated = prev.map((p) =>
              p.id === newPin.id
                ? { ...p, uploadStatus: "failed" as const }
                : p
            );
            saveCachedGalleryPins(updated);
            return updated;
          });
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
        {/* Simple & Clean Header: Mark-X Logo + Action Pill */}
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
            paddingHorizontal: sideMargin,
            paddingTop: 8,
            paddingBottom: 40,
          }}
        >
          {isLoading || isRefreshing ? (
            <GalleryMasonrySkeleton cardWidth={columnWidth} />
          ) : pins.length === 0 ? (
            <GalleryEmptyState
              cardWidth={columnWidth}
              onAddPhoto={handleAddPhoto}
            />
          ) : (
            <View className="flex-row w-full" style={{ gap: gutter }}>
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
