import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutAnimation,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { GalleryPin, formatBytes, normalizeGalleryPin } from "../../utils/galleryData";
import { auth } from "../../services/firebase";
import { MarkXLogo } from "../../components/common/MarkXLogo";
import { GalleryPinCard } from "../../components/gallery/GalleryPinCard";
import { GalleryPinOptionsSheet } from "../../components/gallery/GalleryPinOptionsSheet";
import { GalleryMasonrySkeleton } from "../../components/gallery/GallerySkeleton";
import { GalleryEmptyState } from "../../components/gallery/GalleryEmptyState";
import { safePickMultipleImages } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";
import { uploadFileToMarkx } from "../../services/cloudflareStorage";
import { loadCachedGalleryPins, saveCachedGalleryPins } from "../../services/storageService";
import { 
  fetchGalleryPinsPage,
  GALLERY_PAGE_LIMIT,
  addGalleryPinToServer, 
  deleteGalleryPinFromServer, 
  updateGalleryPinInServer,
  purgeLegacyFieldsFromDatabase,
  subscribeLatestGalleryPins,
} from "../../services/galleryFirebaseService";

const iOSSpringAnimation = {
  duration: 350,
  create: { type: LayoutAnimation.Types.spring, property: LayoutAnimation.Properties.opacity, springDamping: 0.8 },
  update: { type: LayoutAnimation.Types.spring, springDamping: 0.8 },
  delete: { type: LayoutAnimation.Types.spring, property: LayoutAnimation.Properties.opacity, springDamping: 0.8 },
};

export default function GalleryScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  // 2-column masonry grid layout parameters
  const gutter = 6;
  const sideMargin = 8;
  const columnWidth = (windowWidth - sideMargin * 2 - gutter) / 2;

  // Gallery state
  const [pins, setPins] = useState<GalleryPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [optionsPin, setOptionsPin] = useState<GalleryPin | null>(null);

  // References & animations
  const lastDocRef = useRef<any>(null);
  const isNavigatingRef = useRef(false);
  const [spinAnim] = useState(() => new Animated.Value(0));

  // Helper: update a single pin across state and local storage cache
  const updatePinState = useCallback((id: string, updates: Partial<GalleryPin>) => {
    LayoutAnimation.configureNext(iOSSpringAnimation);
    setPins((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      saveCachedGalleryPins(updated);
      return updated;
    });
  }, []);

  // Upload a media pin to cloud storage and sync Firestore
  const uploadAndSyncPin = useCallback(async (pin: GalleryPin) => {
    updatePinState(pin.id, { uploadStatus: "uploading" });

    try {
      const isVideo = pin.mediaType === "video";
      const mime = pin.mimeType || (isVideo ? "video/mp4" : "image/jpeg");
      const res = await uploadFileToMarkx(pin.imageUrl, mime, pin.fileName);

      if (res.success && res.url) {
        updatePinState(pin.id, { imageUrl: res.url, uploadStatus: "synced" });
        await updateGalleryPinInServer(pin.id, { imageUrl: res.url, uploadStatus: "synced" });
      } else {
        updatePinState(pin.id, { uploadStatus: "failed" });
      }
    } catch (err) {
      console.error("[GalleryUpload] Failed:", err);
      updatePinState(pin.id, { uploadStatus: "failed" });
    }
  }, [updatePinState]);

  // Load the first page (12 items)
  const loadFirstPage = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true);
    try {
      const result = await fetchGalleryPinsPage(null, GALLERY_PAGE_LIMIT);
      setPins(result.pins);
      lastDocRef.current = result.lastVisibleDoc;
      setHasMore(result.hasMore);
      await saveCachedGalleryPins(result.pins);
    } catch (err) {
      console.warn("[GalleryScreen] Failed to load first page:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load next batch of 12 items on scroll
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !lastDocRef.current) return;
    setIsLoadingMore(true);

    try {
      const result = await fetchGalleryPinsPage(lastDocRef.current, GALLERY_PAGE_LIMIT);
      lastDocRef.current = result.lastVisibleDoc;
      setHasMore(result.hasMore);

      if (result.pins.length > 0) {
        setPins((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = result.pins.filter((p) => !existingIds.has(p.id));
          const updated = [...prev, ...newItems];
          saveCachedGalleryPins(updated);
          return updated;
        });
      }
    } catch (err) {
      console.warn("[GalleryScreen] Failed to load more pins:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore]);

  // Detect scroll near bottom for infinite pagination
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 250;
    if (isCloseToBottom && hasMore && !isLoadingMore && !isLoading && !isRefreshing) {
      handleLoadMore();
    }
  }, [hasMore, isLoadingMore, isLoading, isRefreshing, handleLoadMore]);

  useFocusEffect(
    useCallback(() => {
      isNavigatingRef.current = false;
      setStatusBarStyle("dark");
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle("dark-content");
      }
      loadCachedGalleryPins().then((cached) => {
        if (cached.length > 0) {
          setPins(cached.map(normalizeGalleryPin));
        }
      });
      loadFirstPage(false);
    }, [loadFirstPage])
  );

  useEffect(() => {
    let isMounted = true;

    // 1. Instant cached load
    loadCachedGalleryPins().then((cached) => {
      if (isMounted && cached.length > 0) {
        LayoutAnimation.configureNext(iOSSpringAnimation);
        setPins(cached.map(normalizeGalleryPin));
        setIsLoading(false);
      }
    });

    // 2. Fetch fresh 12-item first page
    loadFirstPage(pins.length === 0);

    // 3. Real-time updates for latest pins
    const unsubscribe = subscribeLatestGalleryPins(
      (latestPins) => {
        if (!isMounted) return;
        LayoutAnimation.configureNext(iOSSpringAnimation);
        setPins((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]));
          latestPins.forEach((item) => map.set(item.id, { ...(map.get(item.id) || {}), ...item }));
          return Array.from(map.values());
        });
        setIsLoading(false);
      },
      GALLERY_PAGE_LIMIT,
      () => {
        if (isMounted) setIsLoading(false);
      }
    );

    // 4. Background purge
    purgeLegacyFieldsFromDatabase().catch(console.warn);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadFirstPage]);

  // Retry failed uploads
  const failedPins = useMemo(() => pins.filter((p) => p.uploadStatus === "failed"), [pins]);
  const handleRetryFailedUploads = useCallback(() => {
    if (failedPins.length === 0) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    failedPins.forEach(uploadAndSyncPin);
  }, [failedPins, uploadAndSyncPin]);

  // Navigate to pin detail
  const handleSelectPin = useCallback((pin: GalleryPin) => {
    if (pin.uploadStatus === "failed") {
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
      params: { id: pin.id, initialPin: JSON.stringify(pin) },
    });
  }, [router, handleRetryFailedUploads]);

  // Masonry column balancing
  const { leftPins, rightPins } = useMemo(() => {
    const left: GalleryPin[] = [];
    const right: GalleryPin[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    // Sort pins so saved (bookmarked) ones appear at the top
    const sortedPins = [...pins].sort((a, b) => {
      if (a.saved === b.saved) return 0;
      return a.saved ? -1 : 1;
    });

    sortedPins.forEach((pin) => {
      const estimatedHeight = Math.min(Math.max(columnWidth / pin.aspectRatio, 120), 320) + 16;
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

  // Bookmark / Save toggle
  const handleSaveToggle = async (pinId: string) => {
    const pin = pins.find((p) => p.id === pinId);
    if (!pin) return;
    const newSaved = !pin.saved;
    updatePinState(pinId, { saved: newSaved });
    await updateGalleryPinInServer(pinId, { saved: newSaved });
  };

  // Hide pin
  const handleHidePin = async (pinId: string) => {
    setPins((prev) => {
      const updated = prev.filter((p) => p.id !== pinId);
      saveCachedGalleryPins(updated);
      return updated;
    });
    await deleteGalleryPinFromServer(pinId);
  };

  // Manual refresh
  const handleRefreshPress = async () => {
    if (isRefreshing) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    setIsRefreshing(true);
    try {
      await loadFirstPage(false);
    } catch (e) {
      console.warn("[GalleryScreen] Refresh error:", e);
    } finally {
      setIsRefreshing(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Pick and upload up to 5 media items
  const handleAddPhoto = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const results = await safePickMultipleImages(5);
    if (!results || results.length === 0) return;

    const newPins: GalleryPin[] = results.map((result, idx) => {
      const ratio = result.width && result.height
        ? Math.max(Math.min(result.width / result.height, 1.4), 0.6)
        : 0.75;

      const isVideo = result.type === "video";
      const timestamp = Date.now() + idx;
      const fileName = `${timestamp}${isVideo ? ".mp4" : ".jpg"}`;
      const fileSize = result.fileSize || (isVideo ? 14800000 : 2800000);

      return {
        id: `pin-${timestamp}-${Math.random().toString(36).slice(2, 6)}`,
        fileName,
        author: auth.currentUser?.displayName || "You",
        imageUrl: result.uri,
        mediaType: isVideo ? "video" : "image",
        ...(isVideo && typeof result.duration === "number" ? { duration: result.duration } : {}),
        aspectRatio: ratio,
        width: result.width || (ratio >= 1 ? 1920 : 1080),
        height: result.height || Math.round((result.width || 1080) / ratio),
        fileSize,
        fileSizeFormatted: formatBytes(fileSize),
        mimeType: result.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
        likes: 0,
        isLiked: false,
        saved: false,
        uploadStatus: "uploading",
      };
    });

    // Optimistically prepend to UI and local storage
    setPins((prev) => {
      const updated = [...newPins, ...prev];
      saveCachedGalleryPins(updated);
      return updated;
    });

    // Save to Firestore and upload to Cloudflare concurrently
    newPins.forEach(async (pin) => {
      await addGalleryPinToServer(pin);
      uploadAndSyncPin(pin);
    });
  };

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        {/* Top Header: Logo + Actions */}
        <View className="flex-row items-center justify-between px-5 pt-6 pb-3 bg-white border-b border-[#F2F2F2]">
          <View className="justify-center">
            <MarkXLogo width={115} height={16} color="#111111" />
          </View>

          {/* Action Pill: Refresh & Add */}
          <View className="flex-row items-center bg-[#F0F2F4] border border-[#E5E7EB] rounded-full px-4 py-2 gap-4">
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

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAddPhoto}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={23} color="#111111" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2-Column Pinterest-Style Masonry Feed */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          onScroll={handleScroll}
          scrollEventThrottle={16}
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
            <GalleryEmptyState cardWidth={columnWidth} onAddPhoto={handleAddPhoto} />
          ) : (
            <>
              <View className="flex-row w-full" style={{ gap: gutter }}>
                {/* Left Column */}
                <View style={{ width: columnWidth }}>
                  {leftPins.map((pin) => (
                    <GalleryPinCard
                      key={pin.id}
                      pin={pin}
                      cardWidth={columnWidth}
                      onPress={handleSelectPin}
                      onOptionsPress={setOptionsPin}
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
                      onOptionsPress={setOptionsPin}
                    />
                  ))}
                </View>
              </View>

              {/* Infinite Scroll 12-Item Batch Indicator */}
              {isLoadingMore && (
                <View className="py-6 items-center justify-center">
                  <ActivityIndicator size="small" color="#111111" />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Pin Options Bottom Sheet */}
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
