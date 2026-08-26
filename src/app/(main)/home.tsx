import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const triggerHaptic = async (
    style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
  ) => {
    try {
      await Haptics.impactAsync(style);
    } catch {
      Vibration.vibrate(Platform.OS === "android" ? 25 : 15);
    }
  };

  const handleSignOut = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signOut();
      router.replace("/(auth)/login");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const displayName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "User");

  return (
    <View className="flex-1 bg-[#090A0F]">
      <StatusBar style="light" />

      <SafeAreaView
        className="flex-1 px-6 justify-between"
        style={{
          paddingTop: Math.max(insets.top, 20) + 12,
          paddingBottom: Math.max(insets.bottom, 24) + 16,
        }}
      >
        {/* Header */}
        <View>
          <View className="flex-row items-center justify-between mb-4">
            <Text allowFontScaling={false} style={styles.brandTitle}>
              MARK X
            </Text>
            <View className="flex-row items-center bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
              <Text allowFontScaling={false} style={styles.badgeText}>
                VERIFIED
              </Text>
            </View>
          </View>

          <Text allowFontScaling={false} style={styles.greeting}>
            Hello, {displayName}
          </Text>
        </View>

        {/* Empty Canvas Body for your upcoming components */}
        <View className="flex-1 items-center justify-center">
          {/* Ready for your instructions */}
        </View>

        {/* Bottom Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.8}
          className="h-14 rounded-2xl bg-white/5 border border-white/10 items-center justify-center"
        >
          <Text allowFontScaling={false} style={styles.signOutText}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  brandTitle: {
    fontFamily: "Outfit_900Black",
    fontSize: 22,
    letterSpacing: 2,
    color: "#FFFFFF",
  },
  badgeText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: "#34D399",
    letterSpacing: 0.5,
  },
  greeting: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 28,
    color: "#FFFFFF",
  },
  signOutText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
    color: "#F87171",
  },
});
