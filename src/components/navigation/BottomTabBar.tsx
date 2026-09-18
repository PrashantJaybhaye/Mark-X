import React from "react";
import { Animated, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuth } from "../../context/AuthContext";
import { triggerHaptic } from "../../utils/haptics";

const ICON_HOME_ACTIVE = require("../../../assets/images/svg/active-home.svg");
const ICON_HOME_INACTIVE = require("../../../assets/images/svg/home.svg");
const ICON_GALLERY_ACTIVE = require("../../../assets/images/svg/active-gallery.png");
const ICON_GALLERY_INACTIVE = require("../../../assets/images/svg/gallery.png");
const ICON_NOTE_ACTIVE = require("../../../assets/images/svg/active-note.png");
const ICON_NOTE_INACTIVE = require("../../../assets/images/svg/note.png");
const DEFAULT_AVATAR = require("../../../assets/images/default-avatar.jpg");

export type TabKey = "home" | "drive" | "gallery" | "notes" | "profile";

interface BottomTabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  bottomInset: number;
}

interface TabButtonProps {
  onPress: () => void;
  isActive: boolean;
  children: React.ReactNode;
}

function TabButton({ onPress, isActive, children }: TabButtonProps) {
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isActive) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.88,
          duration: 75,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive, scale]);

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.9,
      duration: 60,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className="flex-1 h-full items-center justify-center"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export const BottomTabBar = React.memo(function BottomTabBar({
  activeTab,
  onTabChange,
  bottomInset,
}: BottomTabBarProps) {
  const { user } = useAuth();

  const handleTabPress = (tab: TabKey) => {
    if (tab === activeTab) return;
    onTabChange(tab);
    triggerHaptic();
  };

  const isHome = activeTab === "home";
  const isDrive = activeTab === "drive";
  const isGallery = activeTab === "gallery";
  const isNotes = activeTab === "notes";
  const isProfile = activeTab === "profile";

  return (
    <View
      className="w-full bg-white border-t border-[#E5E5EA]"
      style={{ paddingBottom: Math.max(bottomInset, 10) }}
    >
      <View className="flex-row items-center justify-around h-[54px] px-3">
        {/* 1. Home Tab */}
        <TabButton onPress={() => handleTabPress("home")} isActive={isHome}>
          <Image
            source={isHome ? ICON_HOME_ACTIVE : ICON_HOME_INACTIVE}
            style={{ width: 28, height: 28 }}
            tintColor={isHome ? "#111111" : "#8E8E93"}
            contentFit="contain"
          />
        </TabButton>

        {/* 2. Drive Tab */}
        <TabButton onPress={() => handleTabPress("drive")} isActive={isDrive}>
          <Ionicons
            name={isDrive ? "layers" : "layers-outline"}
            size={28}
            color={isDrive ? "#111111" : "#8E8E93"}
          />
        </TabButton>

        {/* 3. Center Gallery / Inspiration Tab */}
        <TabButton onPress={() => handleTabPress("gallery")} isActive={isGallery}>
          <Image
            source={isGallery ? ICON_GALLERY_ACTIVE : ICON_GALLERY_INACTIVE}
            style={{ width: 26, height: 26 }}
            tintColor={isGallery ? "#111111" : "#8E8E93"}
            contentFit="contain"
          />
        </TabButton>

        {/* 4. Notes Tab */}
        <TabButton onPress={() => handleTabPress("notes")} isActive={isNotes}>
          <Image
            source={isNotes ? ICON_NOTE_ACTIVE : ICON_NOTE_INACTIVE}
            style={{ width: 28, height: 28 }}
            tintColor={isNotes ? "#111111" : "#8E8E93"}
            contentFit="contain"
          />
        </TabButton>

        {/* 5. Profile Tab */}
        <TabButton onPress={() => handleTabPress("profile")} isActive={isProfile}>
          <View
            className={`w-[30px] h-[30px] rounded-full overflow-hidden items-center justify-center bg-[#E5E7EB] ${
              isProfile ? "border-2 border-[#111111]" : "border border-black/10"
            }`}
          >
            <Image
              source={
                user?.photoURL || user?.providerData?.[0]?.photoURL
                  ? { uri: user?.photoURL || user?.providerData?.[0]?.photoURL! }
                  : DEFAULT_AVATAR
              }
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>
        </TabButton>
      </View>
    </View>
  );
});

