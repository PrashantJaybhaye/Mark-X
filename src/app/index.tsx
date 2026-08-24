import React from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

function ArrowRightIcon({ size = 20, color = "#111111" }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <View
        style={{ width: size * 0.75, height: 2.2, backgroundColor: color }}
        className="absolute left-0.5 rounded-full"
      />
      <View
        style={{
          width: size * 0.44,
          height: 2.2,
          backgroundColor: color,
          top: size / 2 - 3.8,
          transform: [{ rotate: "45deg" }],
        }}
        className="absolute right-0.5 rounded-full"
      />
      <View
        style={{
          width: size * 0.44,
          height: 2.2,
          backgroundColor: color,
          bottom: size / 2 - 3.8,
          transform: [{ rotate: "-45deg" }],
        }}
        className="absolute right-0.5 rounded-full"
      />
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <ImageBackground
        source={require("../../assets/images/OnboardingBG.png")}
        className="flex-1 w-full h-full"
        resizeMode="cover"
      >
        <View
          className="flex-1 justify-end px-6"
          style={{
            paddingTop: insets.top + 20,
            paddingBottom: Math.max(insets.bottom, 24) + 12,
          }}
        >
        </View>
      </ImageBackground>
    </View>
  );
}
