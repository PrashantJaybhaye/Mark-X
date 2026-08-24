import React from "react";
import {
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  const handleGetStarted = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Fallback to native vibration for platforms/builds where expo-haptics isn't linked
      Vibration.vibrate(Platform.OS === "android" ? 30 : 15);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <ImageBackground
        source={require("../../assets/images/OnboardingBG.png")}
        className="flex-1"
        resizeMode="cover"
      >
        <View
          className="flex-1 justify-end px-6"
          style={{
            paddingTop: insets.top + 20,
            paddingBottom: Math.max(insets.bottom, 24) + 12,
          }}
        >
          {/* Header */}
          <View className="items-center mb-10">
            {/* 3D Title */}
            <View className="items-center justify-center">
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={[styles.title, styles.titleShadowDeep]}
              >
                MARK X
              </Text>
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={[styles.title, styles.titleShadowMid]}
              >
                MARK X
              </Text>
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={[styles.title, styles.titleFront]}
              >
                MARK X
              </Text>
            </View>

            {/* Subtitles */}
            <Text
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={styles.subtitleSmall}
            >
              REDEFINING
            </Text>
            <Text
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={styles.subtitleLarge}
            >
              WHAT'S POSSIBLE
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.85}
            className="h-14 rounded-full bg-white items-center justify-center mb-2"
          >
            <Text
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={styles.buttonText}
            >
              Get Started
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: "Outfit_900Black",
    fontSize: 54,
    lineHeight: 58,
    letterSpacing: 3,
    textAlign: "center",
  },
  titleShadowDeep: {
    position: "absolute",
    top: 4.5,
    color: "rgba(0, 0, 0, 0.95)",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 10,
  },
  titleShadowMid: {
    position: "absolute",
    top: 2.5,
    color: "#6E1B00",
  },
  titleFront: {
    color: "#FFFFFF",
    textShadowColor: "rgba(255, 100, 0, 0.85)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitleSmall: {
    fontFamily: "Outfit_400Regular",
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 4.5,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 24,
  },
  subtitleLarge: {
    fontFamily: "Outfit_900Black",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 2,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 4,
  },
  buttonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 17,
    letterSpacing: -0.2,
    color: "#171717",
  },
});
