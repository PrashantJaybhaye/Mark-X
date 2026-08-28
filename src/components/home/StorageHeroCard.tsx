import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";

interface StorageHeroCardProps {
  usedStorage?: string;
  totalStorage?: string;
  userName?: string;
  tagline?: string;
  isLoading?: boolean;
  onManageStorage?: () => void;
  onUploadFile?: () => void;
  onAddPhoto?: () => void;
}

export function StorageHeroCardSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View className="w-full mb-4 relative">
      {/* --- 1. Back Peeking Card Skeleton --- */}
      <View className="w-full bg-[#FFFFFF] rounded-[24px] pt-4 pb-16 px-5 flex-row justify-between items-start border border-black/[0.04]">
        <View className="flex-1 mr-3">
          <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-28 h-5 bg-black/10 rounded-md mb-2"
          />
          <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-20 h-2.5 bg-black/10 rounded-md"
          />
        </View>

        <View className="shrink-0 items-end justify-center pt-0.5">
          <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-24 h-3.5 bg-black/10 rounded-md mb-1.5"
          />
          <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-28 h-2.5 bg-black/10 rounded-md"
          />
        </View>
      </View>

      {/* --- 2. Front Overlapping Card Skeleton --- */}
      <View className="w-full rounded-[24px] bg-[#EB5B49] p-5 -mt-10">
        <View className="flex-row justify-between items-start mb-1">
          <View>
            <Animated.View
              style={{ opacity: pulseAnim }}
              className="w-20 h-2.5 bg-white/30 rounded-md mb-2"
            />
            <Animated.View
              style={{ opacity: pulseAnim }}
              className="w-36 h-9 bg-white/35 rounded-lg"
            />
          </View>

          <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-28 h-7 bg-black/15 rounded-full border border-white/20 mt-1 mb-10"
          />
        </View>

        {/* Action Button Pills Skeletons */}
        <View className="flex-row items-center pt-1">
          <Animated.View
            style={{ opacity: pulseAnim }}
            className="flex-1 h-[36px] rounded-full bg-[#2B140F]/40 mr-2"
          />
          <Animated.View
            style={{ opacity: pulseAnim }}
            className="flex-1 h-[36px] rounded-full bg-[#2B140F]/40 mr-2"
          />
          <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-[36px] h-[36px] rounded-full bg-[#2B140F]/40 ml-auto"
          />
        </View>
      </View>
    </View>
  );
}

export function StorageHeroCard({
  usedStorage = "0.00",
  userName,
  tagline = "Beyond All Limits",
  isLoading,
  onManageStorage,
  onUploadFile,
  onAddPhoto,
}: StorageHeroCardProps) {
  const { user, loading } = useAuth();

  if (isLoading || (loading && !userName)) {
    return <StorageHeroCardSkeleton />;
  }

  const rawName =
    userName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";
  const firstName = rawName.trim().split(/\s+/)[0];

  // Parse dynamic storage numbers for high-end typography
  const [whole, decimal = "00"] = usedStorage.includes(".")
    ? usedStorage.split(".")
    : [usedStorage, "00"];

  return (
    <View className="w-full mb-4 relative">
      {/* --- 1. Back Peeking Card (Mark-X Cloud Tier) --- */}
      <View className="w-full bg-[#FFFFFF] rounded-[24px] pt-4 pb-16 px-5 flex-row justify-between items-start border border-black/[0.04]">
        <View className="flex-1 mr-3">
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            allowFontScaling={false}
            className="text-[22px] text-[#EB5B49] tracking-tight leading-none"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            {firstName}
          </Text>
          <Text
            allowFontScaling={false}
            className="text-[9px] text-[#808080] tracking-wider uppercase mt-1"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            EXECUTIVE CLOUD
          </Text>
        </View>

        <View className="shrink-0 items-end justify-center pt-0.5">
          <Text
            allowFontScaling={false}
            className="text-[13px] text-[#111111] tracking-tight text-right"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            {tagline}
          </Text>
          <Text
            allowFontScaling={false}
            className="text-[9px] text-[#8E8E93] tracking-wider uppercase mt-0.5 text-right"
            style={{ fontFamily: "Outfit_500Medium" }}
          >
            POWERED BY MARK-X
          </Text>
        </View>
      </View>

      {/* --- 2. Front Overlapping Card (Signature Coral Card) --- */}
      <View className="w-full rounded-[24px] bg-[#EB5B49] p-5 -mt-10">
        {/* Top Metric Header Row */}
        <View className="flex-row justify-between items-start mb-1">
          {/* Large Storage Balance */}
          <View>
            <Text
              allowFontScaling={false}
              className="text-[11px] text-white/75 uppercase tracking-wider mb-0.5"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Used Storage
            </Text>

            <View className="flex-row items-baseline">
              <Text
                allowFontScaling={false}
                className="text-[36px] text-white tracking-tight leading-none"
                style={{ fontFamily: "Outfit_700Bold" }}
              >
                {whole}
              </Text>
              <Text
                allowFontScaling={false}
                className="text-[22px] text-white/95 leading-none"
                style={{ fontFamily: "Outfit_700Bold" }}
              >
                .{decimal}
              </Text>
              <Text
                allowFontScaling={false}
                className="text-[14px] text-white/85 ml-1.5 leading-none"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                GB
              </Text>
            </View>
          </View>

          {/* Right Status Capsule */}
          <View className="flex-row items-center bg-black/15 px-2.5 py-1 rounded-full border border-white/20 mt-1 mb-10">
            <Ionicons name="cloud-done-outline" size={13} color="rgba(255,255,255,0.9)" style={{ marginRight: 4 }} />
            <Text
              allowFontScaling={false}
              className="text-[11px] text-white tracking-wide"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Personal Vault
            </Text>
          </View>
        </View>

        {/* Action Button Pills */}
        <View className="flex-row items-center pt-1">
          {/* Upload File Pill */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onUploadFile}
            className="flex-row items-center bg-[#2B140F]/60 active:bg-[#2B140F]/80 px-3.5 h-[36px] rounded-full mr-2"
          >
            <Ionicons name="add-circle" size={16} color="#FFFFFF" />
            <Text
              allowFontScaling={false}
              className="text-[13px] text-white ml-1.5"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Upload file
            </Text>
          </TouchableOpacity>

          {/* Add Photo Pill */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onAddPhoto}
            className="flex-row items-center bg-[#2B140F]/60 active:bg-[#2B140F]/80 px-3.5 h-[36px] rounded-full mr-2"
          >
            <Ionicons name="images" size={15} color="#FFFFFF" />
            <Text
              allowFontScaling={false}
              className="text-[13px] text-white ml-1.5"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Add photo
            </Text>
          </TouchableOpacity>

          {/* More Options Pill */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onManageStorage}
            className="w-[36px] h-[36px] rounded-full bg-[#2B140F]/60 active:bg-[#2B140F]/80 items-center justify-center ml-auto"
          >
            <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
