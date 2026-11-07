import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  AppState,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  StatusBar as RNStatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";

import { IosDialog } from "../../components/common/IosDialog";
import { exportMediaToDevice } from "../../services/mediaExportService";

import { GalleryPin, formatBytes, normalizeGalleryPin, DEFAULT_BLURHASH } from "../../utils/galleryData";
import { resolvePlayableVideoUri } from "../../services/videoCacheService";
import { triggerHaptic } from "../../utils/haptics";
import {
  loadCachedGalleryPins,
  loadCachedHiddenGalleryPins,
  saveCachedGalleryPins,
  saveCachedHiddenGalleryPins,
  syncGalleryStats,
  getMemoryGalleryPins,
  getMemoryHiddenGalleryPins,
} from "../../services/storageService";
import {
  updateGalleryPinInServer,
  deleteGalleryPinFromServer,
  fetchGalleryPinsFromServer,
} from "../../services/galleryFirebaseService";
import { deleteHiddenGalleryPinFromServer } from "../../services/hiddenGalleryFirebaseService";
import { GalleryPinOptionsSheet } from "../../components/gallery/GalleryPinOptionsSheet";
import { GalleryPinInfoSheet } from "../../components/gallery/GalleryPinInfoSheet";

const VideoProgressBar = React.memo(function VideoProgressBar({
  player,
}: {
  player: any;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!player) return;

    let lastProgress = -1;
    const updateProgress = (currentTime?: number) => {
      try {
        const dur = player.duration;
        const cur = typeof currentTime === "number" ? currentTime : player.currentTime;
        if (dur > 0 && typeof cur === "number" && !isNaN(cur)) {
          const pct = Math.min(Math.max((cur / dur) * 100, 0), 100);
          if (Math.abs(pct - lastProgress) >= 0.2 || pct === 0 || pct === 100) {
            lastProgress = pct;
            setProgress(pct);
          }
        }
      } catch {

      }
    };

    updateProgress();

    const timeSub = player.addListener("timeUpdate", (e: any) => {
      updateProgress(e?.currentTime);
    });

    const statusSub = player.addListener("statusChange", () => {
      updateProgress();
    });

    const sourceSub = player.addListener("sourceLoad", () => {
      updateProgress();
    });

    const interval = setInterval(() => {
      updateProgress();
    }, 150);

    return () => {
      clearInterval(interval);
      timeSub.remove();
      statusSub.remove();
      sourceSub.remove();
    };
  }, [player]);

  return (
    <View
      pointerEvents="none"
      className="absolute bottom-2 left-6 right-6 h-1 rounded-full bg-black/10 overflow-hidden z-20"
    >
      <View
        className="h-full bg-[#007AFF] rounded-full"
        style={{ width: `${progress}%` }}
      />
    </View>
  );
});

function InlineVideoPlayer({
  sourceUrl,
  posterUrl,
  blurHash,
  fileName,
  isMuted,
  onDoubleTap,
}: {
  sourceUrl: string;
  posterUrl?: string;
  blurHash?: string;
  fileName: string;
  isMuted: boolean;
  onDoubleTap: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  const showPosterRef = useRef(true);
  const posterFadeAnim = useRef(new Animated.Value(1)).current;
  const playIconAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(sourceUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
    p.timeUpdateEventInterval = 0.1;
    p.pause();
  });

  const hidePosterSmoothly = useCallback(() => {
    if (!showPosterRef.current) return;
    showPosterRef.current = false;
    Animated.timing(posterFadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowPoster(false);
      setIsBuffering(false);
    });
  }, [posterFadeAnim]);

  useEffect(() => {
    if (!player) return;
    player.muted = isMuted;
    try {
      player.timeUpdateEventInterval = 0.1;
    } catch {
      // ignore
    }

    if (player.status === "readyToPlay" || player.playing) {
      hidePosterSmoothly();
      setIsBuffering(false);
    }

    const statusSub = player.addListener("statusChange", (e) => {
      if (e.status === "readyToPlay") {
        hidePosterSmoothly();
        setIsBuffering(false);
      } else if (e.status === "loading") {
        setIsBuffering(true);
      }
    });

    const timeSub = player.addListener("timeUpdate", (e) => {
      if (e.currentTime > 0) {
        hidePosterSmoothly();
        setIsBuffering(false);
      }
    });

    const sourceSub = player.addListener("sourceLoad", () => {
      hidePosterSmoothly();
    });

    const playSub = player.addListener("playingChange", (e) => {
      setIsPlaying(e.isPlaying);
      if (e.isPlaying) {
        hidePosterSmoothly();
        setIsBuffering(false);
      }
    });

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        player.pause();
      }
    });

    return () => {
      statusSub.remove();
      timeSub.remove();
      sourceSub.remove();
      playSub.remove();
      appStateSub.remove();
    };
  }, [player, isMuted, hidePosterSmoothly]);

  const togglePlayPause = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setShowPlayIcon(true);
      playIconAnim.setValue(1);
      Animated.timing(playIconAnim, {
        toValue: 0,
        duration: 500,
        delay: 100,
        useNativeDriver: true,
      }).start(() => setShowPlayIcon(false));
    } else {
      hidePosterSmoothly();
      player.play();
      setShowPlayIcon(false);
    }
  };

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 260;

    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      onDoubleTap();
    } else {
      lastTapRef.current = now;
      timerRef.current = setTimeout(() => {
        togglePlayPause();
        timerRef.current = null;
      }, DOUBLE_PRESS_DELAY);
    }
  };

  return (
    <View className="relative w-full h-full items-center justify-center bg-black/5 overflow-hidden">
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        nativeControls={false}
      />

      {showPoster && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: posterFadeAnim, zIndex: 10 }]}
          pointerEvents="none"
        >
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              placeholder={{ blurhash: blurHash || DEFAULT_BLURHASH }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View className="w-full h-full bg-[#1C1C1E]" />
          )}

          {isBuffering && (
            <View className="absolute inset-0 items-center justify-center">
              <View className="w-12 h-12 rounded-full bg-black/45 items-center justify-center backdrop-blur-md border border-white/15 shadow-lg">
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            </View>
          )}
        </Animated.View>
      )}

      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        className="absolute inset-0 items-center justify-center z-20"
      >
        {!isPlaying ? (
          <View
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.55)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.25)",
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 6,
            }}
            className="w-16 h-16 rounded-full items-center justify-center backdrop-blur-md"
          >
            <Ionicons
              name="play"
              size={32}
              color="#FFFFFF"
              style={{ marginLeft: 3 }}
            />
          </View>
        ) : showPlayIcon ? (
          <Animated.View
            style={{
              opacity: playIconAnim,
              transform: [
                {
                  scale: playIconAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
              backgroundColor: "rgba(0, 0, 0, 0.55)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.25)",
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 6,
            }}
            className="w-16 h-16 rounded-full items-center justify-center backdrop-blur-md"
          >
            <Ionicons
              name="pause"
              size={32}
              color="#FFFFFF"
            />
          </Animated.View>
        ) : null}
      </TouchableOpacity>

      <VideoProgressBar player={player} />
    </View>
  );
}

export default function GalleryDetailPage() {
  const router = useRouter();
  const { id, initialPin, initialIndex, source } = useLocalSearchParams<{
    id: string;
    initialPin?: string;
    initialIndex?: string;
    source?: string;
  }>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [initialSelectedPin] = useState<GalleryPin | null>(() => {
    if (initialPin) {
      try {
        return normalizeGalleryPin(JSON.parse(initialPin));
      } catch {
        return null;
      }
    }
    return null;
  });

  const parsedInitIdx = initialIndex ? parseInt(initialIndex, 10) : 0;

  const [allPins, setAllPins] = useState<GalleryPin[]>(() => {
    const isHidden = source === "hidden";
    const memPins = isHidden ? getMemoryHiddenGalleryPins() : getMemoryGalleryPins();
    if (memPins && memPins.length > 0) {
      const normalized = memPins.map(normalizeGalleryPin);
      const filtered = isHidden ? normalized : normalized.filter((p) => !p.hidden);
      if (initialSelectedPin && !filtered.some((p) => p.id === id)) {
        return [initialSelectedPin, ...filtered];
      }
      return filtered;
    }
    return initialSelectedPin ? [initialSelectedPin] : [];
  });

  const resolvedTargetIndex = useMemo(() => {
    const idx = allPins.findIndex((p) => p.id === id);
    if (idx >= 0) return idx;
    return !isNaN(parsedInitIdx) && parsedInitIdx >= 0 && parsedInitIdx < allPins.length
      ? parsedInitIdx
      : 0;
  }, [allPins, id, parsedInitIdx]);

  const [currentIndex, setCurrentIndex] = useState<number>(resolvedTargetIndex);

  const [loading, setLoading] = useState<boolean>(!initialSelectedPin && allPins.length === 0);

  const [infoVisible, setInfoVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessageDialog, setExportMessageDialog] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const lastTapRef = useRef<number>(0);
  const isInitialScrollDoneRef = useRef(false);

  // Active pin currently in view (accurate fallback to tapped pin id)
  const currentPin =
    allPins[currentIndex] ||
    (id ? allPins.find((p) => p.id === id) : null) ||
    initialSelectedPin ||
    null;

  // Auto-lock if viewing hidden media when app backgrounded
  useEffect(() => {
    if (source !== "hidden") return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        try {
          if (router.canDismiss()) {
            router.dismissAll();
          }
        } catch {
          // ignore if not dismissible
        }
        router.replace("/(main)/gallery");
      }
    });
    return () => sub.remove();
  }, [source, router]);

  useEffect(() => {
    if (Platform.OS === "android") {
      RNStatusBar.setBarStyle("dark-content");
    }
  }, []);

  // Fetch cached pins only as fallback if memory was empty (e.g. reload or deep-link)
  useEffect(() => {
    let isMounted = true;

    if (allPins.length > 1) {
      setLoading(false);
      return;
    }

    const loadPins = async () => {
      try {
        const isHidden = source === "hidden";
        const cached = isHidden ? await loadCachedHiddenGalleryPins() : await loadCachedGalleryPins();
        if (cached && cached.length > 0 && isMounted) {
          const normalized = cached.map(normalizeGalleryPin);
          const filtered = isHidden ? normalized : normalized.filter((p) => !p.hidden);
          const fullList =
            initialSelectedPin && !filtered.some((p) => p.id === id)
              ? [initialSelectedPin, ...filtered]
              : filtered;

          setAllPins(fullList);
          const foundIdx = fullList.findIndex((p) => p.id === id);
          if (foundIdx >= 0) {
            setCurrentIndex(foundIdx);
            requestAnimationFrame(() => {
              flatListRef.current?.scrollToIndex({ index: foundIdx, animated: false });
            });
          }
        }
      } catch (err) {
        console.warn("[GalleryDetailPage] Error loading pins list:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPins();
    return () => {
      isMounted = false;
    };
  }, [id, source, allPins.length, initialSelectedPin]);

  // Initial scroll anchor as soon as list is mounted to ensure the tapped pin is immediately displayed
  useEffect(() => {
    if (isInitialScrollDoneRef.current) return;
    if (resolvedTargetIndex >= 0 && resolvedTargetIndex < allPins.length) {
      if (resolvedTargetIndex !== currentIndex) {
        setCurrentIndex(resolvedTargetIndex);
      }
      if (resolvedTargetIndex > 0) {
        const timer = setTimeout(() => {
          if (!isInitialScrollDoneRef.current && flatListRef.current) {
            isInitialScrollDoneRef.current = true;
            flatListRef.current.scrollToIndex({ index: resolvedTargetIndex, animated: false });
          }
        }, 30);
        return () => clearTimeout(timer);
      } else {
        isInitialScrollDoneRef.current = true;
      }
    }
  }, [resolvedTargetIndex, allPins.length, currentIndex]);

  const updatePin = useCallback(async (updates: Partial<GalleryPin>) => {
    if (!currentPin?.id) return;
    const targetId = currentPin.id;

    setAllPins((prev) => prev.map((p) => (p.id === targetId ? { ...p, ...updates } : p)));

    if (source === "hidden") {
      try {
        const cached = await loadCachedHiddenGalleryPins();
        const updated = cached.map((p) => (p.id === targetId ? { ...p, ...updates } : p));
        await saveCachedHiddenGalleryPins(updated);
      } catch (err) {
        console.warn("[GalleryDetailPage] Error updating cached hidden pins:", err);
      }
    } else {
      try {
        const cached = await loadCachedGalleryPins();
        const updated = cached.map((p) => (p.id === targetId ? { ...p, ...updates } : p));
        await saveCachedGalleryPins(updated);
      } catch (err) {
        console.warn("[GalleryDetailPage] Error updating cached pins:", err);
      }

      try {
        await updateGalleryPinInServer(targetId, updates);
      } catch (err) {
        console.warn("[GalleryDetailPage] Error syncing pin update to server:", err);
      }
    }
  }, [currentPin?.id, source]);

  const animateBookmarkBounce = () => {
    bookmarkScale.setValue(0.7);
    Animated.spring(bookmarkScale, {
      toValue: 1,
      friction: 3,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  const handleSaveToggle = async () => {
    if (!currentPin) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    animateBookmarkBounce();
    await updatePin({ saved: !currentPin.saved });
  };

  const handlePhotoPress = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 280;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      handleSaveToggle();
    }
    lastTapRef.current = now;
  };

  const handleExport = async () => {
    if (!currentPin || isExporting) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsExporting(true);
    try {
      const result = await exportMediaToDevice(currentPin.imageUrl, currentPin.fileName);
      if (result.success && result.savedToGallery) {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        setExportMessageDialog("Media saved directly to your device Photos.");
      } else if (!result.success && result.message) {
        setExportMessageDialog(result.message);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (!currentPin) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteDialogVisible(true);
  };

  const handlePerformDelete = async () => {
    if (!currentPin || isDeleting) return;
    setIsDeleting(true);
    try {
      const deletedId = currentPin.id;
      if (source === "hidden") {
        await deleteHiddenGalleryPinFromServer(deletedId);
        const cached = await loadCachedHiddenGalleryPins();
        const filtered = cached.filter((p) => p.id !== deletedId);
        await saveCachedHiddenGalleryPins(filtered);
      } else {
        await deleteGalleryPinFromServer(deletedId);
        const cached = await loadCachedGalleryPins();
        const filtered = cached.filter((p) => p.id !== deletedId);
        await saveCachedGalleryPins(filtered);
        await syncGalleryStats(filtered.length);
      }
      setDeleteDialogVisible(false);

      if (allPins.length <= 1) {
        router.back();
      } else {
        const nextList = allPins.filter((p) => p.id !== deletedId);
        setAllPins(nextList);
        const newIdx = Math.min(currentIndex, nextList.length - 1);
        setCurrentIndex(newIdx);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMomentumScrollEnd = useCallback(
    (e: any) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / windowWidth);
      if (newIndex >= 0 && newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    },
    [windowWidth, currentIndex]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: windowWidth,
      offset: windowWidth * index,
      index,
    }),
    [windowWidth]
  );

  const formattedDateHeader = useMemo(() => {
    if (!currentPin) return { date: "", time: "" };
    let dateObj: Date | null = null;
    if (currentPin.createdAt) {
      if (typeof currentPin.createdAt === "object" && (currentPin.createdAt as any).seconds) {
        dateObj = new Date((currentPin.createdAt as any).seconds * 1000);
      } else if (typeof currentPin.createdAt === "string" || typeof currentPin.createdAt === "number") {
        const parsed = new Date(currentPin.createdAt);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      }
    }
    if (!dateObj) {
      const match = currentPin.id.match(/\d{10,13}/) || (currentPin.fileName && currentPin.fileName.match(/\d{10,13}/));
      if (match) {
        const num = parseInt(match[0], 10);
        dateObj = new Date(num > 100000000000 ? num : num * 1000);
      } else {
        dateObj = new Date();
      }
    }

    const dateStr = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    return { date: dateStr, time: timeStr };
  }, [currentPin]);

  if (loading && !currentPin) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  if (!currentPin) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons name="images-outline" size={48} color="#9CA3AF" />
        <Text className="text-[17px] font-outfit-bold text-[#1C1C1E] mt-3">Media Not Found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-2.5 bg-[#F2F2F7] rounded-full"
        >
          <Text className="text-[#007AFF] font-outfit-semibold text-[14px]">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isCurrentVideo = currentPin.mediaType === "video";

  const renderMediaItem = useCallback(
    ({ item, index }: { item: GalleryPin; index: number }) => {
      const isItemVideo = item.mediaType === "video";
      const isActive = index === currentIndex;
      const ratio = item.aspectRatio && item.aspectRatio > 0 ? item.aspectRatio : 1;
      const maxImgWidth = windowWidth - 16;
      const maxImgHeight = windowHeight - 140;

      let imgWidth = maxImgWidth;
      let imgHeight = maxImgWidth / ratio;
      if (imgHeight > maxImgHeight) {
        imgHeight = maxImgHeight;
        imgWidth = maxImgHeight * ratio;
      }

      return (
        <View
          style={{ width: windowWidth, height: "100%" }}
          className="items-center justify-center px-2 py-4"
        >
          {isItemVideo ? (
            <View
              style={{
                width: imgWidth,
                height: imgHeight,
                borderRadius: 20,
                overflow: "hidden",
                backgroundColor: "#F2F2F7",
              }}
            >
              {isActive ? (
                <InlineVideoPlayer
                  key={item.id}
                  sourceUrl={item.localUri || item.imageUrl}
                  posterUrl={item.thumbnailUrl || item.imageUrl}
                  blurHash={item.blurHash}
                  fileName={item.fileName || "temp.mp4"}
                  isMuted={isMuted}
                  onDoubleTap={handleSaveToggle}
                />
              ) : (
                <Image
                  source={{ uri: item.thumbnailUrl || item.imageUrl }}
                  placeholder={{ blurhash: item.blurHash || DEFAULT_BLURHASH }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              )}
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={1}
              onPress={handlePhotoPress}
              delayPressIn={80}
              className="w-full h-full items-center justify-center"
            >
              <View
                style={{
                  width: imgWidth,
                  height: imgHeight,
                  borderRadius: 20,
                  overflow: "hidden",
                  backgroundColor: "#F2F2F7",
                }}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  placeholder={{ blurhash: item.blurHash || DEFAULT_BLURHASH }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  priority={isActive ? "high" : "normal"}
                />
              </View>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [currentIndex, windowWidth, windowHeight, isMuted, handleSaveToggle, handlePhotoPress]
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Horizontal Paging View with Native 60/120fps physics */}
      <FlatList
        ref={flatListRef}
        data={allPins}
        horizontal
        pagingEnabled={true}
        initialScrollIndex={
          resolvedTargetIndex > 0 && resolvedTargetIndex < allPins.length
            ? resolvedTargetIndex
            : undefined
        }
        onLayout={() => {
          if (
            !isInitialScrollDoneRef.current &&
            resolvedTargetIndex > 0 &&
            resolvedTargetIndex < allPins.length
          ) {
            isInitialScrollDoneRef.current = true;
            flatListRef.current?.scrollToIndex({ index: resolvedTargetIndex, animated: false });
          }
        }}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 50);
        }}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={Platform.OS === "android"}
        directionalLockEnabled={true}
        overScrollMode="never"
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        renderItem={renderMediaItem}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        bounces={true}
        className="flex-1"
      />

      {/* Floating Top Navigation Header */}
      <View pointerEvents="box-none" className="absolute top-0 left-0 right-0 z-30">
        <SafeAreaView edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-2 pt-4">
            <TouchableOpacity
              activeOpacity={0.65}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="w-10 h-10 rounded-full bg-white/85 border border-black/[0.08] shadow-sm items-center justify-center backdrop-blur-xl"
            >
              <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setInfoVisible(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
              className="items-center justify-center max-w-[55%]"
            >
              <Text
                numberOfLines={1}
                className="text-[14px] text-[#1C1C1E] text-center"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                {formattedDateHeader.date}
              </Text>
              <Text
                numberOfLines={1}
                className="text-[11px] text-[#8E8E93] text-center mt-0.5"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                {formattedDateHeader.time} {currentPin.fileSizeFormatted ? `· ${currentPin.fileSizeFormatted}` : ""}
              </Text>
            </TouchableOpacity>

            <View className="flex-row items-center gap-2">
              {isCurrentVideo && (
                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setIsMuted(!isMuted);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="w-10 h-10 rounded-full bg-white/85 border border-black/[0.08] shadow-sm items-center justify-center backdrop-blur-xl"
                >
                  <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={19} color="#1C1C1E" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.65}
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setOptionsVisible(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="w-10 h-10 rounded-full bg-white/85 border border-black/[0.08] shadow-sm items-center justify-center backdrop-blur-xl"
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#1C1C1E" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Floating Bottom Toolbar */}
      <View className="absolute bottom-0 left-0 right-0 z-30">
        <SafeAreaView edges={["bottom"]} className="bg-white/95 backdrop-blur-md border-t border-[#E5E5EA]">
          <View className="flex-row items-center justify-around py-3 px-2">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleExport}
              disabled={isExporting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-12 h-10 items-center justify-center"
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#1C1C1E" />
              ) : (
                <Ionicons name="download-outline" size={24} color="#1C1C1E" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSaveToggle}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-12 h-10 items-center justify-center"
            >
              <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                <Ionicons
                  name={currentPin.saved ? "bookmark" : "bookmark-outline"}
                  size={24}
                  color={currentPin.saved ? "#FF9500" : "#1C1C1E"}
                />
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setInfoVisible(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-12 h-10 items-center justify-center"
            >
              <Ionicons name="information-circle-outline" size={26} color="#1C1C1E" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDeleteConfirm}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-12 h-10 items-center justify-center"
            >
              <Ionicons name="trash-outline" size={23} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <GalleryPinInfoSheet visible={infoVisible} pin={currentPin} onClose={() => setInfoVisible(false)} />

      <GalleryPinOptionsSheet
        visible={optionsVisible}
        pin={currentPin}
        onClose={() => setOptionsVisible(false)}
        onSaveToggle={handleSaveToggle}
        onHidePin={handleDeleteConfirm}
        onInfo={() => setInfoVisible(true)}
      />

      <IosDialog
        visible={deleteDialogVisible}
        onClose={() => setDeleteDialogVisible(false)}
        title="Delete Media"
        message="This item will be permanently deleted from your Mark-X vault."
        actions={[
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setDeleteDialogVisible(false),
          },
          {
            text: "Delete",
            style: "destructive",
            bold: true,
            loading: isDeleting,
            onPress: handlePerformDelete,
          },
        ]}
      />

      <IosDialog
        visible={exportMessageDialog !== null}
        onClose={() => setExportMessageDialog(null)}
        title="Export"
        message={exportMessageDialog || ""}
        actions={[
          {
            text: "OK",
            style: "default",
            bold: true,
            onPress: () => setExportMessageDialog(null),
          },
        ]}
      />
    </View>
  );
}
