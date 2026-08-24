import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

function ArrowRightIcon({ size = 20, color = "#111111" }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      <View
        style={{
          position: "absolute",
          width: size * 0.75,
          height: 2.2,
          backgroundColor: color,
          borderRadius: 1,
          left: 1,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size * 0.44,
          height: 2.2,
          backgroundColor: color,
          borderRadius: 1,
          right: 2,
          top: size / 2 - 3.8,
          transform: [{ rotate: "45deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size * 0.44,
          height: 2.2,
          backgroundColor: color,
          borderRadius: 1,
          right: 2,
          bottom: size / 2 - 3.8,
          transform: [{ rotate: "-45deg" }],
        }}
      />
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ImageBackground
        source={require("../../assets/images/OnboardingBG.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View
          style={[
            styles.contentContainer,
            {
              paddingTop: insets.top + 20,
              paddingBottom: Math.max(insets.bottom, 24) + 12,
            },
          ]}
        >

          {/* Action Buttons Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.learnMoreButton}
              activeOpacity={0.85}
            >
              <Text style={styles.learnMoreText}>Learn More</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.arrowButton}
              activeOpacity={0.85}
            >
              <ArrowRightIcon size={22} color="#111111" />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
  },
  textContainer: {
    marginBottom: 32,
  },
  titleText: {
    fontSize: width > 380 ? 44 : 38,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -1.2,
    lineHeight: width > 380 ? 50 : 44,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  learnMoreButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  learnMoreText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.2,
  },
  arrowButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
});
