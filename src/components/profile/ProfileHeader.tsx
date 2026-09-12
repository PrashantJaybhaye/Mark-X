import React, { useEffect } from "react";
import {
  BackHandler,
  Platform,
  StatusBar as RNStatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { triggerHaptic } from "../../utils/haptics";

interface ProfileHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}

export function ProfileHeader({
  title,
  subtitle,
  rightAction,
  onBack,
}: ProfileHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = React.useCallback(() => {
    triggerHaptic();
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/profile");
    }
  }, [onBack, router]);

  // Hardware back button support for Android
  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) : 16
  );

  return (
    <>
      <StatusBar style="dark" />
      <View
        style={{ paddingTop: topInset + 6 }}
        className="bg-white px-4 pb-3.5 border-b border-[#F1F5F9]"
      >
        <View className="flex-row items-center justify-between min-h-[44px]">
          {/* Left: Back button + Title in modern native mobile pattern */}
          <View className="flex-row items-center flex-1 pr-2">
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-10 h-10 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </TouchableOpacity>

            <View className="flex-1">
              <Text
                className="text-[19px] text-[#0F172A] tracking-tight"
                style={{ fontFamily: "Outfit_700Bold" }}
                numberOfLines={1}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  className="text-[12px] text-[#64748B] mt-0.5"
                  style={{ fontFamily: "Outfit_400Regular" }}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Right Action slot */}
          {rightAction ? (
            <View className="items-end justify-center pl-2">
              {rightAction}
            </View>
          ) : null}
        </View>
      </View>
    </>
  );
}
