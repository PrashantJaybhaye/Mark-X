import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Platform,
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

import { GalleryPin, formatBytes, normalizeGalleryPin } from "../../utils/galleryData";
import { triggerHaptic } from "../../utils/haptics";
import {
  loadCachedGalleryPins,
  saveCachedGalleryPins,
  syncGalleryStats,
} from "../../services/storageService";
import {
  updateGalleryPinInServer,
  deleteGalleryPinFromServer,
  fetchGalleryPinsFromServer,
} from "../../services/galleryFirebaseService";
import { GalleryPinOptionsSheet } from "../../components/gallery/GalleryPinOptionsSheet";
import { GalleryPinInfoSheet } from "../../components/gallery/GalleryPinInfoSheet";

/**
 * High-performance video player with custom tap-to-play/pause overlay
 * and timeline progress indicator.
 */
function InlineVideoPlayer({
  sourceUrl,
  fileName,
  isMuted,
  onDoubleTap,
}: {
  sourceUrl: string;
  fileName: string;
  isMuted: boolean;
  onDoubleTap: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);

  const playIconAnim = useRef(new Animated.Value(0)).current;
  const skeletonAnim = useRef(new Animated.Value(0.2)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const lastTapRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Direct native high-performance player instance
  const player = useVideoPlayer(sourceUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
    p.play();
  });

  // Apple-style smooth skeleton breathing animation
  useEffect(() => {
    if (showSkeleton) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          Animated.timing(skeletonAnim, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [showSkeleton]);

  const hideSkeletonSmoothly = useCallback(() => {
    if (!showSkeleton) return;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowSkeleton(false);
      skeletonAnim.stopAnimation();
    });
  }, [showSkeleton]);

  useEffect(() => {
    if (!player) return;
    player.muted = isMuted;

    const timeSub = player.addListener("timeUpdate", (e) => {
      setCurrentTime(e.currentTime);
      if (e.currentTime > 0) {
        hideSkeletonSmoothly();
      }
    });
    const sourceSub = player.addListener("sourceLoad", (e) => {
      if (e.duration) setDuration(e.duration);
      hideSkeletonSmoothly();
    });
    const playSub = player.addListener("playingChange", (e) => {
      setIsPlaying(e.isPlaying);
      if (e.isPlaying) {
        hideSkeletonSmoothly();
      }
    });

    return () => {
      timeSub.remove();
      sourceSub.remove();
      playSub.remove();
    };
  }, [player, isMuted, hideSkeletonSmoothly]);

  const togglePlayPause = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }

    setShowPlayIcon(true);
    playIconAnim.setValue(1);
    Animated.timing(playIconAnim, {
      toValue: 0,
      duration: 650,
      delay: 150,
      useNativeDriver: true,
    }).start(() => setShowPlayIcon(false));
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

  const progressPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <View className="relative w-full h-full items-center justify-center bg-black/5 overflow-hidden">
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        nativeControls={false}
      />

      {showSkeleton && (
        <Animated.View 
          className="absolute inset-0 z-10 bg-[#E5E5EA]" 
          style={{ opacity: fadeAnim }}
          pointerEvents="none"
        >
          <Animated.View 
            className="w-full h-full bg-[#C7C7CC]" 
            style={{ opacity: skeletonAnim }}
          />
        </Animated.View>
      )}

      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        className="absolute inset-0 items-center justify-center"
      >
        {showPlayIcon && (
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
            }}
            className="w-16 h-16 rounded-full bg-black/65 backdrop-blur-md items-center justify-center shadow-xl border border-white/20"
          >
            <Ionicons
              name={isPlaying ? "play" : "pause"}
              size={32}
              color="#FFFFFF"
              style={isPlaying ? { marginLeft: 2 } : undefined}
            />
          </Animated.View>
        )}
      </TouchableOpacity>

      {duration > 0 && (
        <View className="absolute bottom-2 left-6 right-6 h-1 rounded-full bg-black/10 overflow-hidden">
          <View
            className="h-full bg-[#007AFF] rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      )}
    </View>
  );
}

/**
 * Unified Media Viewer screen for full-screen photo & video presentation.
 */
export default function GalleryDetailPage() {
  const router = useRouter();
  const { id, initialPin } = useLocalSearchParams<{ id: string; initialPin?: string }>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [pin, setPin] = useState<GalleryPin | null>(() => {
    if (initialPin) {
      try {
        return normalizeGalleryPin(JSON.parse(initialPin));
      } catch {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(!pin);
  const [infoVisible, setInfoVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessageDialog, setExportMessageDialog] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS === "android") {
      RNStatusBar.setBarStyle("dark-content");
    }
  }, []);

  // Fetch / verify pin with remote Firestore
  useEffect(() => {
    let isMounted = true;
    const resolvePin = async () => {
      if (!id) return;

      // 1. Fast path: load from local cache
      const cached = await loadCachedGalleryPins();
      const foundCached = cached.find((p) => p.id === id);
      if (isMounted && foundCached) {
        setPin(normalizeGalleryPin(foundCached));
        setLoading(false);
      }

      // 2. Fresh path: query server to confirm media still exists
      const serverPins = await fetchGalleryPinsFromServer();
      if (!isMounted) return;

      if (!serverPins) {
        setLoading(false);
        return;
      }

      const remotePin = serverPins.find((p) => p.id === id);
      if (remotePin) {
        setPin(remotePin);
      } else if (!foundCached) {
        setPin(null);
      }
      setLoading(false);
    };

    resolvePin();
    return () => {
      isMounted = false;
    };
  }, [id, router]);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to persist updates to state, cache, and Firestore
  const updatePin = useCallback((updates: Partial<GalleryPin>) => {
    if (!pin) return;
    
    // 1. Optimistic UI update immediately
    setPin((prev) => (prev ? { ...prev, ...updates } : null));
    
    // 2. Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    // 3. Schedule the background sync
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await updateGalleryPinInServer(pin.id, updates);
        const cached = await loadCachedGalleryPins();
        await saveCachedGalleryPins(cached.map((p) => (p.id === pin.id ? { ...p, ...updates } : p)));
      } catch (err) {
        console.warn(err);
      }
    }, 800); // 800ms debounce
  }, [pin]);

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
    if (!pin) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    animateBookmarkBounce();
    await updatePin({ saved: !pin.saved });
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
    if (!pin || isExporting) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsExporting(true);
    try {
      const result = await exportMediaToDevice(pin.imageUrl, pin.fileName);
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
    if (!pin) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteDialogVisible(true);
  };

  const handlePerformDelete = async () => {
    if (!pin || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteGalleryPinFromServer(pin.id);
      const cached = await loadCachedGalleryPins();
      const filtered = cached.filter((p) => p.id !== pin.id);
      await saveCachedGalleryPins(filtered);
      await syncGalleryStats(filtered.length);
      setDeleteDialogVisible(false);
      router.back();
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !pin) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  if (!pin) {
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

  const isVideo = pin.mediaType === "video";

  // Fitted viewport dimensions based on aspect ratio
  const ratio = pin.aspectRatio && pin.aspectRatio > 0 ? pin.aspectRatio : 1;
  const maxImgWidth = windowWidth - 16;
  const maxImgHeight = windowHeight - 140;

  let imgWidth = maxImgWidth;
  let imgHeight = maxImgWidth / ratio;
  if (imgHeight > maxImgHeight) {
    imgHeight = maxImgHeight;
    imgWidth = maxImgHeight * ratio;
  }

  const formattedDateHeader = useMemo(() => {
    if (!pin) return { date: "", time: "" };
    let dateObj: Date | null = null;
    if (pin.createdAt) {
      if (typeof pin.createdAt === "object" && (pin.createdAt as any).seconds) {
        dateObj = new Date((pin.createdAt as any).seconds * 1000);
      } else if (typeof pin.createdAt === "string" || typeof pin.createdAt === "number") {
        const parsed = new Date(pin.createdAt);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      }
    }
    if (!dateObj) {
      const match = pin.id.match(/\d{10,13}/) || (pin.fileName && pin.fileName.match(/\d{10,13}/));
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
  }, [pin]);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* 1. Dynamic Media Viewport */}
      <View className="flex-1 items-center justify-center px-2 py-4 bg-white">
        {isVideo ? (
          <View
            style={{ width: imgWidth, height: imgHeight, borderRadius: 20, overflow: "hidden", backgroundColor: "#F2F2F7" }}
          >
            <InlineVideoPlayer 
              sourceUrl={pin.imageUrl} 
              fileName={pin.fileName || "temp.mp4"}
              isMuted={isMuted} 
              onDoubleTap={handleSaveToggle} 
            />
          </View>
        ) : (
          <TouchableOpacity activeOpacity={1} onPress={handlePhotoPress} className="w-full h-full items-center justify-center">
            <View
              style={{ width: imgWidth, height: imgHeight, borderRadius: 20, overflow: "hidden", backgroundColor: "#F2F2F7" }}
            >
              <Image
                source={{ uri: pin.imageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Floating Top Navigation Bar */}
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

            {/* Middle: Clean Apple Photos Style Date & Time Header Button */}
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
                {formattedDateHeader.time} {pin.fileSizeFormatted ? `· ${pin.fileSizeFormatted}` : ""}
              </Text>
            </TouchableOpacity>

            <View className="flex-row items-center gap-2">
              {isVideo && (
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

      {/* 3. Bottom Action Toolbar */}
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
                  name={pin.saved ? "bookmark" : "bookmark-outline"}
                  size={24}
                  color={pin.saved ? "#FF9500" : "#1C1C1E"}
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

      {/* 4. Inspector Sheet */}
      <GalleryPinInfoSheet visible={infoVisible} pin={pin} onClose={() => setInfoVisible(false)} />

      {/* 5. Options Sheet */}
      <GalleryPinOptionsSheet
        visible={optionsVisible}
        pin={pin}
        onClose={() => setOptionsVisible(false)}
        onSaveToggle={handleSaveToggle}
        onHidePin={handleDeleteConfirm}
        onInfo={() => setInfoVisible(true)}
      />

      {/* 6. Delete Confirmation Dialog */}
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

      {/* 7. Export Status Dialog */}
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
