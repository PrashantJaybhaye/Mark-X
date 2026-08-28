import React, { useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { triggerHaptic } from "../utils/haptics";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);

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
            paddingBottom: Math.max(insets.bottom, 24) + 12,
          }}
        >
          {/* Header */}
          <View className="items-center mb-20">
            <Text
              allowFontScaling={false}
              className="text-[54px] text-white tracking-[3px] text-center leading-[58px]"
              style={{ fontFamily: "Outfit_900Black" }}
            >
              MARK X
            </Text>

            <Text
              allowFontScaling={false}
              className="text-[20px] text-white tracking-[4.5px] text-center leading-[26px] mt-6"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              REDEFINING
            </Text>

            <Text
              allowFontScaling={false}
              className="text-[28px] text-white tracking-[2px] text-center leading-[34px] mt-1"
              style={{ fontFamily: "Outfit_900Black" }}
            >
              WHAT'S POSSIBLE
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleGetStarted}
            disabled={isNavigating}
            activeOpacity={0.85}
            className="h-14 rounded-full bg-white items-center justify-center mb-2 active:bg-white/90"
          >
            <Text
              allowFontScaling={false}
              className="text-[17px] text-[#171717] tracking-tight"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Get Started
            </Text>
          </TouchableOpacity>
        </View>
    </View>
  );
}
