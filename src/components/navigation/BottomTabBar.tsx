import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../context/AuthContext";
import { triggerHaptic } from "../../utils/haptics";

export type TabKey = "home" | "drive" | "gallery" | "notes" | "profile";

interface BottomTabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onCenterActionPress?: () => void;
  bottomInset: number;
}

export function BottomTabBar({
  activeTab,
  onTabChange,
  bottomInset,
}: BottomTabBarProps) {
  const { user } = useAuth();

  const handleTabPress = (tab: TabKey) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tab);
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
        <TouchableOpacity
          onPress={() => handleTabPress("home")}
          activeOpacity={0.7}
          className="flex-1 h-full items-center justify-center"
        >
          <Image
            source={
              isHome
                ? require("../../../assets/images/svg/active-home.svg")
                : require("../../../assets/images/svg/home.svg")
            }
            style={{ width: 28, height: 28 }}
            tintColor={isHome ? "#111111" : "#8E8E93"}
            contentFit="contain"
          />
        </TouchableOpacity>

        {/* 2. Drive Tab */}
        <TouchableOpacity
          onPress={() => handleTabPress("drive")}
          activeOpacity={0.7}
          className="flex-1 h-full items-center justify-center"
        >
          <Ionicons
            name={isDrive ? "layers" : "layers-outline"}
            size={28}
            color={isDrive ? "#111111" : "#8E8E93"}
          />
        </TouchableOpacity>

        {/* 3. Center Gallery / Inspiration Tab */}
        <TouchableOpacity
          onPress={() => handleTabPress("gallery")}
          activeOpacity={0.7}
          className="flex-1 h-full items-center justify-center"
        >
          <Image
            source={
              isGallery
                ? require("../../../assets/images/svg/active-gallery.png")
                : require("../../../assets/images/svg/gallery.png")
            }
            style={{ width: 26, height: 26 }}
            tintColor={isGallery ? "#111111" : "#8E8E93"}
            contentFit="contain"
          />
        </TouchableOpacity>

        {/* 4. Notes Tab */}
        <TouchableOpacity
          onPress={() => handleTabPress("notes")}
          activeOpacity={0.7}
          className="flex-1 h-full items-center justify-center"
        >
          <Image
            source={
              isNotes
                ? require("../../../assets/images/svg/active-note.png")
                : require("../../../assets/images/svg/note.png")
            }
            style={{ width: 28, height: 28 }}
            tintColor={isNotes ? "#111111" : "#8E8E93"}
            contentFit="contain"
          />
        </TouchableOpacity>

        {/* 5. Profile Tab */}
        <TouchableOpacity
          onPress={() => handleTabPress("profile")}
          activeOpacity={0.7}
          className="flex-1 h-full items-center justify-center"
        >
          <View
            className={`w-[30px] h-[30px] rounded-full overflow-hidden items-center justify-center bg-[#E5E7EB] ${
              isProfile ? "border-2 border-[#111111]" : "border border-black/10"
            }`}
          >
            {user?.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <Ionicons
                name="person"
                size={18}
                color={isProfile ? "#111111" : "#6B7280"}
              />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
