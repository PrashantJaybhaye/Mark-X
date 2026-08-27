import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Platform, TouchableOpacity, Vibration, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export type TabKey = "home" | "drive" | "upload" | "notes" | "profile";

interface Props {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onCenterActionPress?: () => void;
  bottomInset: number;
}

export function BottomTabBar({
  activeTab,
  onTabChange,
  onCenterActionPress,
  bottomInset,
}: Props) {
  const { user } = useAuth();

  const hapticFeedback = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Vibration.vibrate(Platform.OS === "android" ? 15 : 10);
    }
  };

  const onTabPress = (tab: TabKey) => {
    hapticFeedback();
    if (tab === "upload") {
      onCenterActionPress?.();
    } else {
      onTabChange(tab);
    }
  };

  const isHome = activeTab === "home";
  const isProfile = activeTab === "profile";

  return (
    <View
      className="w-full bg-white border-t border-[#E5E5EA]"
      style={{ paddingBottom: Math.max(bottomInset, 10) }}
    >
      <View className="flex-row items-center justify-around h-[54px] px-3">
        {/* Home */}
        <TouchableOpacity
          onPress={() => onTabPress("home")}
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

        {/* Drive */}
        <TouchableOpacity
          onPress={() => onTabPress("drive")}
          activeOpacity={0.7}
          className="flex-1 h-full items-center justify-center"
        >
          <Ionicons
            name={activeTab === "drive" ? "layers" : "layers-outline"}
            size={28}
            color={activeTab === "drive" ? "#111111" : "#8E8E93"}
          />
        </TouchableOpacity>

        {/* Upload (+) */}
        <TouchableOpacity
          onPress={() => onTabPress("upload")}
          activeOpacity={0.75}
          className="flex-1 h-full items-center justify-center"
        >
          <View className="w-[42px] h-[42px] rounded-full bg-[#F0F2F4] items-center justify-center border border-black/5">
            <Ionicons name="add" size={26} color="#111111" />
          </View>
        </TouchableOpacity>

        {/* Notes */}
        <TouchableOpacity
          onPress={() => onTabPress("notes")}
          activeOpacity={0.7}
          className="flex-1 h-full items-center justify-center"
        >
          <Image
            source={
              activeTab === "notes"
                ? require("../../../assets/images/svg/active-note.png")
                : require("../../../assets/images/svg/note.png")
            }
            style={{ width: 28, height: 28 }}
            tintColor={activeTab === "notes" ? "#111111" : "#8E8E93"}
            contentFit="contain"
          />
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          onPress={() => onTabPress("profile")}
          activeOpacity={0.7}
          className="flex-1 h-full items-center justify-center"
        >
          <View
            className={`w-[30px] h-[30px] rounded-full overflow-hidden items-center justify-center bg-[#E5E7EB] ${isProfile ? "border-2 border-[#111111]" : "border border-black/10"
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
