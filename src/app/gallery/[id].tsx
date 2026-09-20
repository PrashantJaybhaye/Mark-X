import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Alert,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  StatusBar as RNStatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";

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

/**
 * High-performance video player with custom tap-to-play/pause overlay
 * and timeline progress indicator.
 */
function InlineVideoPlayer({
  sourceUrl,
  isMuted,
  onDoubleTap,
}: {
  sourceUrl: string;
  isMuted: boolean;
  onDoubleTap: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playIconAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(sourceUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    player.muted = isMuted;

    const timeSub = player.addListener("timeUpdate", (e) => setCurrentTime(e.currentTime));
    const sourceSub = player.addListener("sourceLoad", (e) => {
      if (e.duration) setDuration(e.duration);
    });
    const playSub = player.addListener("playingChange", (e) => setIsPlaying(e.isPlaying));

    return () => {
      timeSub.remove();
      sourceSub.remove();
      playSub.remove();
    };
  }, [player, isMuted]);

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
 * Inspector modal providing Apple-style metadata table for media details.
 */
function ApplePhotoInspector({
  visible,
  pin,
  onClose,
}: {
  visible: boolean;
  pin: GalleryPin | null;
  onClose: () => void;
}) {
  const specs = useMemo(() => {
    if (!pin) return [];
    const isVideo = pin.mediaType === "video";
    const durationFormatted = pin.duration
      ? `${Math.floor(pin.duration / 60)}:${(pin.duration % 60).toString().padStart(2, "0")}`
      : "0:15";

    return [
      {
        icon: "document-text-outline" as const,
        color: "#007AFF",
        label: "File Name",
        value: pin.fileName || `${Date.now()}${isVideo ? ".mp4" : ".jpg"}`,
      },
      {
        icon: "scan-outline" as const,
        color: "#5856D6",
        label: "Dimensions",
        value: `${pin.width || 1920} × ${pin.height || 1080}`,
      },
      {
        icon: "pie-chart" as const,
        color: "#FF9500",
        label: "File Size",
        value: pin.fileSizeFormatted || (pin.fileSize ? formatBytes(pin.fileSize) : isVideo ? "14.2 MB" : "2.8 MB"),
      },
      {
        icon: "document-text-outline" as const,
        color: "#AF52DE",
        label: "Format",
        value: pin.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
      },
      ...(isVideo
        ? [
            {
              icon: "time-outline" as const,
              color: "#FF2D55",
              label: "Duration",
              value: durationFormatted,
            },
          ]
        : []),
      {
        icon: "person" as const,
        color: "#007AFF",
        label: "Creator",
        value: pin.author || "You",
      },
      {
        icon: "heart" as const,
        color: "#FF2D55",
        label: "Favorites",
        value: String(pin.likes || 0),
      },
    ];
  }, [pin]);

  if (!pin) return null;
  const isVideo = pin.mediaType === "video";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/35 justify-end">
          <TouchableWithoutFeedback>
            <View className="bg-[#F2F2F7] rounded-t-[32px] px-5 pt-3 pb-8 max-h-[82%] shadow-2xl border-t border-black/5">
              <View className="w-10 h-1.5 rounded-full bg-[#C7C7CC] self-center mb-3" />

              <View className="flex-row items-center justify-between pb-3">
                <Text className="text-[20px] font-outfit-bold text-[#1C1C1E]">Info</Text>
                <TouchableOpacity
                  onPress={onClose}
                  className="px-3.5 py-1 rounded-full bg-[#E5E5EA] items-center justify-center"
                >
                  <Text className="text-[14px] font-outfit-semibold text-[#007AFF]">Done</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} className="mt-2" contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Media Preview Card */}
                <View className="bg-white rounded-2xl p-3.5 shadow-sm flex-row items-center gap-3.5 border border-black/[0.04]">
                  <Image
                    source={{ uri: pin.imageUrl }}
                    style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: "#E5E5EA" }}
                    contentFit="cover"
                  />
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-[16px] font-outfit-bold text-[#1C1C1E]">
                      {pin.fileName || `${Date.now()}${isVideo ? ".mp4" : ".jpg"}`}
                    </Text>
                    <Text className="text-[12px] font-outfit text-[#8E8E93] mt-0.5">
                      {isVideo ? "H.264 • MP4 Video" : "High-Resolution Image"}
                    </Text>
                    <Text className="text-[11px] font-outfit text-[#8E8E93] mt-0.5">
                      {pin.aspectRatio ? `${pin.aspectRatio.toFixed(2)}:1 Ratio` : "Standard"} • Synced
                    </Text>
                  </View>
                </View>

                {/* Specs Table */}
                <View className="mt-3.5 bg-white rounded-2xl px-4 py-1 shadow-sm border border-black/[0.04]">
                  {specs.map((item, index) => (
                    <View
                      key={item.label}
                      className={`flex-row items-center justify-between py-2.5 ${
                        index < specs.length - 1 ? "border-b border-[#F2F2F7]" : ""
                      }`}
                    >
                      <View className="flex-row items-center gap-2.5">
                        <View
                          style={{ backgroundColor: `${item.color}1F` }}
                          className="w-7 h-7 rounded-lg items-center justify-center"
                        >
                          <Ionicons name={item.icon} size={15} color={item.color} />
                        </View>
                        <Text className="text-[14px] font-outfit text-[#1C1C1E]">{item.label}</Text>
                      </View>
                      <Text className="text-[13px] font-outfit-medium text-[#8E8E93] max-w-[55%]" numberOfLines={1}>
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
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
  const [isMuted, setIsMuted] = useState(false);

  const heartScale = useRef(new Animated.Value(1)).current;
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
      try {
        const remote = await fetchGalleryPinsFromServer();
        const foundRemote = remote.find((p: GalleryPin) => p.id === id);
        if (isMounted) {
          if (foundRemote) {
            setPin(normalizeGalleryPin(foundRemote));
          } else {
            setPin(null); // Deleted remotely
          }
        }
      } catch (err) {
        console.warn("[GalleryDetailPage] Remote fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    resolvePin();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Helper to persist updates to state, cache, and Firestore
  const updatePin = useCallback(async (updates: Partial<GalleryPin>) => {
    if (!pin) return;
    const updated = { ...pin, ...updates };
    setPin(updated);

    await updateGalleryPinInServer(pin.id, updates).catch(console.warn);
    const cached = await loadCachedGalleryPins();
    await saveCachedGalleryPins(cached.map((p) => (p.id === pin.id ? { ...p, ...updates } : p)));
  }, [pin]);

  const animateHeartBounce = () => {
    heartScale.setValue(0.7);
    Animated.spring(heartScale, {
      toValue: 1,
      friction: 3,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  const handleLikeToggle = async () => {
    if (!pin) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    animateHeartBounce();

    const newLiked = !pin.isLiked;
    const newLikes = Math.max(0, (pin.likes || 0) + (newLiked ? 1 : -1));
    await updatePin({ isLiked: newLiked, likes: newLikes });
  };

  const handleSaveToggle = async () => {
    if (!pin) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    await updatePin({ saved: !pin.saved });
  };

  const handlePhotoPress = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 280;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      handleLikeToggle();
    }
    lastTapRef.current = now;
  };

  const handleShare = async () => {
    if (!pin) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const displayTitle = pin.fileName || `${Date.now()}${pin.mediaType === "video" ? ".mp4" : ".jpg"}`;
    try {
      await Share.share({ title: displayTitle, message: `${displayTitle}\n${pin.imageUrl}` });
    } catch {}
  };

  const handleDeleteConfirm = () => {
    if (!pin) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Media",
      "This item will be permanently deleted from your Mark-X vault.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteGalleryPinFromServer(pin.id);
            const cached = await loadCachedGalleryPins();
            const filtered = cached.filter((p) => p.id !== pin.id);
            await saveCachedGalleryPins(filtered);
            await syncGalleryStats(filtered.length);
            router.back();
          },
        },
      ]
    );
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

  const fileNameDisplay = pin.fileName || `${Date.now()}${isVideo ? ".mp4" : ".jpg"}`;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* 1. Dynamic Media Viewport */}
      <View className="flex-1 items-center justify-center px-2 py-4 bg-white">
        {isVideo ? (
          <View
            style={{ width: imgWidth, height: imgHeight, borderRadius: 20, overflow: "hidden", backgroundColor: "#F2F2F7" }}
          >
            <InlineVideoPlayer sourceUrl={pin.imageUrl} isMuted={isMuted} onDoubleTap={handleLikeToggle} />
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

            <View className="items-center px-3 py-1 rounded-full bg-white/75 border border-black/[0.06] backdrop-blur-xl max-w-[60%]">
              <Text numberOfLines={1} className="text-[14px] font-outfit-bold text-[#1C1C1E] text-center">
                {fileNameDisplay}
              </Text>
              <Text numberOfLines={1} className="text-[10px] font-outfit text-[#8E8E93] text-center tracking-wide">
                {pin.author} • Mark HD
              </Text>
            </View>

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
              onPress={handleShare}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-12 h-10 items-center justify-center"
            >
              <Ionicons name="share-outline" size={24} color="#1C1C1E" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLikeToggle}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-12 h-10 items-center justify-center"
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons name={pin.isLiked ? "heart" : "heart-outline"} size={25} color={pin.isLiked ? "#FF2D55" : "#1C1C1E"} />
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSaveToggle}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-12 h-10 items-center justify-center"
            >
              <Ionicons name={pin.saved ? "bookmark" : "bookmark-outline"} size={23} color={pin.saved ? "#FF9500" : "#1C1C1E"} />
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
      <ApplePhotoInspector visible={infoVisible} pin={pin} onClose={() => setInfoVisible(false)} />

      {/* 5. Options Sheet */}
      <GalleryPinOptionsSheet
        visible={optionsVisible}
        pin={pin}
        onClose={() => setOptionsVisible(false)}
        onSaveToggle={handleSaveToggle}
        onHidePin={handleDeleteConfirm}
      />
    </View>
  );
}
