import React, { useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Platform,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { triggerHaptic } from "../utils/haptics";

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Proportional scale factors anchored to standard reference design (390 x 844)
  const scale = width / 390;
  const heightScale = height / 844;

  const titleFontSize = Math.min(Math.max(Math.round(52 * scale), 42), 60);
  const titleLineHeight = Math.round(titleFontSize * 1.08);

  const sub1FontSize = Math.min(Math.max(Math.round(18.5 * scale), 15), 22);
  const sub1LineHeight = Math.round(sub1FontSize * 1.3);

  const sub2FontSize = Math.min(Math.max(Math.round(27 * scale), 22), 32);
  const sub2LineHeight = Math.round(sub2FontSize * 1.22);

  const headerMarginBottom = Math.min(Math.max(Math.round(56 * heightScale), 28), 68);

  const handleGetStarted = async () => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setIsNavigating(true);

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    router.navigate("/(auth)/login");

    setTimeout(() => {
      isNavigatingRef.current = false;
      setIsNavigating(false);
    }, 1000);
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <Image
        source={require("../../assets/images/OnboardingBG.webp")}
        style={{ width: "100%", height: "100%", position: "absolute" }}
        contentFit="cover"
        priority="high"
        cachePolicy="memory-disk"
      />

      <View
        className="flex-1 justify-end px-6"
        style={{
          paddingTop: insets.top + 20,
          paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 28 : 24) + 12,
        }}
      >
        {/* Header */}
        <View className="items-center" style={{ marginBottom: headerMarginBottom }}>
          <Text
            allowFontScaling={false}
            className="text-white tracking-[3px] text-center"
            style={{
              fontFamily: "Outfit_900Black",
              fontSize: titleFontSize,
              lineHeight: titleLineHeight,
            }}
          >
            MARK X
          </Text>

          <Text
            allowFontScaling={false}
            className="text-white tracking-[4.5px] text-center mt-3"
            style={{
              fontFamily: "Outfit_400Regular",
              fontSize: sub1FontSize,
              lineHeight: sub1LineHeight,
            }}
          >
            REDEFINING
          </Text>

          <Text
            allowFontScaling={false}
            className="text-white tracking-[2px] text-center mt-1"
            style={{
              fontFamily: "Outfit_900Black",
              fontSize: sub2FontSize,
              lineHeight: sub2LineHeight,
            }}
          >
            WHAT'S POSSIBLE
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleGetStarted}
          disabled={isNavigating}
          activeOpacity={0.85}
          className="w-full h-14 rounded-full bg-white items-center justify-center mb-2 active:bg-white/90 px-4"
        >
          <Text
            allowFontScaling={false}
            className="text-[17px] text-[#171717] text-center"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Get Started
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
