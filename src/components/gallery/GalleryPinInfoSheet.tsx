import React, { useMemo, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GalleryPin, formatBytes } from "../../utils/galleryData";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface GalleryPinInfoSheetProps {
  visible: boolean;
  pin: GalleryPin | null;
  onClose: () => void;
}

function parsePinDate(rawDate: any, fileName?: string): Date {
  if (rawDate) {
    if (typeof rawDate?.toDate === "function") return rawDate.toDate();
    if (typeof rawDate?.seconds === "number") return new Date(rawDate.seconds * 1000);
    if (typeof rawDate === "number") return new Date(rawDate);
    if (typeof rawDate === "string") {
      const trimmed = rawDate.trim();
      if (/^\d{12,14}$/.test(trimmed)) return new Date(parseInt(trimmed, 10));
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  if (fileName) {
    const match = fileName.match(/(\d{12,14})/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) return new Date(num);
    }
  }

  return new Date();
}

function formatPinDateTime(pin?: GalleryPin | null): string {
  if (!pin) return "";
  let date: Date;
  try {
    date = parsePinDate(pin.createdAt, pin.fileName);
  } catch {
    date = new Date();
  }

  const dayStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dayStr} • ${timeStr}`;
}

export function GalleryPinInfoSheet({
  visible,
  pin,
  onClose,
}: GalleryPinInfoSheetProps) {
  const insets = useSafeAreaInsets();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  };

  const isVideo = pin?.mediaType === "video";

  const sizeText = useMemo(() => {
    if (!pin) return "";
    return (
      pin.fileSizeFormatted ||
      (pin.fileSize ? formatBytes(pin.fileSize) : isVideo ? "14.2 MB" : "2.8 MB")
    );
  }, [pin, isVideo]);

  const fileSpecs = useMemo(() => {
    if (!pin) return [];
    const durationFormatted = pin.duration
      ? `${Math.floor(pin.duration / 60)}:${(pin.duration % 60).toString().padStart(2, "0")}`
      : "0:15";

    return [
      {
        label: "File Name",
        value: pin.fileName || `${Date.now()}${isVideo ? ".mp4" : ".jpg"}`,
      },
      {
        label: "Resolution",
        value: `${pin.width || 1920} × ${pin.height || 1080}`,
      },
      {
        label: "File Size",
        value: sizeText,
      },
      {
        label: "Format",
        value: pin.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
      },
      ...(isVideo ? [{ label: "Duration", value: durationFormatted }] : []),
      {
        label: "Creator",
        value: pin.author || "You",
      },
    ];
  }, [pin, isVideo, sizeText]);

  if (!pin) return null;

  const dateTimeStr = formatPinDateTime(pin);
  const titleText = pin.fileName || (isVideo ? "Recorded Video" : "Captured Photo");

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end">
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.45)",
              opacity: backdropOpacity,
            }}
          />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback>
          <Animated.View
            className="bg-white rounded-t-[36px] px-6 pt-3 shadow-2xl"
            style={{
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            {/* Handlebar */}
            <View className="w-10 h-1.5 rounded-full bg-[#E0E0E0] self-center mb-4 mt-1" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              {/* Merged Hero Header Row: Thumbnail + Date/Time + Title */}
              <View className="flex-row items-center gap-4 bg-[#F8F9FA] p-3.5 rounded-[24px] border border-black/[0.04] mb-4">
                <View className="relative">
                  <Image
                    source={{ uri: pin.imageUrl }}
                    style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: "#E5E5EA" }}
                    contentFit="cover"
                  />
                  {isVideo && (
                    <View className="absolute inset-0 bg-black/30 rounded-[16px] items-center justify-center">
                      <Ionicons name="play" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </View>

                <View className="flex-1 justify-center">
                  <Text
                    allowFontScaling={false}
                    className="text-[15px] font-outfit-bold text-[#1C1C1E] tracking-tight"
                  >
                    {dateTimeStr}
                  </Text>
                  <Text
                    numberOfLines={1}
                    allowFontScaling={false}
                    className="text-[13px] font-outfit text-[#70757A] mt-0.5"
                  >
                    {titleText}
                  </Text>
                </View>
              </View>

              {/* 2 Stacked Card Buttons: Backed up & On device */}
              <View className="gap-[2px] mb-2">
                {/* Top Card: Backed Up */}
                <View className="bg-[#F0F4F9] rounded-t-[20px] rounded-b-[4px] px-4 py-3.5 flex-row items-center">
                  <Ionicons name="cloud-outline" size={22} color="#1F1F1F" style={{ marginRight: 14 }} />
                  <View className="flex-1">
                    <Text allowFontScaling={false} className="text-[15px] text-[#1F1F1F]">
                      <Text className="font-outfit-semibold">Backed up</Text>{" "}
                      <Text className="font-outfit text-[#444746]">({sizeText})</Text>
                    </Text>
                    <Text allowFontScaling={false} className="text-[13px] font-outfit text-[#444746] mt-0.5">
                      Original quality. <Text className="underline text-[#444746]">Learn more</Text>
                    </Text>
                  </View>
                </View>

                {/* Bottom Card: On Device */}
                <View className="bg-[#F0F4F9] rounded-b-[20px] rounded-t-[4px] px-4 py-3.5">
                  <View className="flex-row items-center flex-1">
                    <Ionicons name="aperture-outline" size={20} color="#1F1F1F" style={{ marginRight: 14 }} />
                    <Text allowFontScaling={false} className="text-[15px] text-[#1F1F1F]">
                      <Text className="font-outfit-semibold">On device</Text>{" "}
                      <Text className="font-outfit text-[#444746]">· {sizeText}</Text>
                    </Text>
                  </View>

                  {/* Technical Specs inside On Device Card */}
                  <View className="mt-3 pt-3 border-t border-black/[0.06] gap-2">
                    {fileSpecs.map((spec) => (
                      <View key={spec.label} className="flex-row justify-between items-center py-1">
                        <Text allowFontScaling={false} className="text-[13px] font-outfit text-[#70757A]">
                          {spec.label}
                        </Text>
                        <Text allowFontScaling={false} className="text-[13px] font-outfit-semibold text-[#1F1F1F]">
                          {spec.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

export const ApplePhotoInspector = GalleryPinInfoSheet;
