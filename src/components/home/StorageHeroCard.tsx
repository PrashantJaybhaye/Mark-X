import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

interface StorageHeroCardProps {
  usedStorage?: string;
  totalStorage?: string;
  userName?: string;
  tagline?: string;
  onManageStorage?: () => void;
  onUploadFile?: () => void;
  onAddPhoto?: () => void;
}

export function StorageHeroCard({
  usedStorage = "0.00",
  totalStorage = "Unlimited",
  userName,
  tagline = "Beyond All Limits",
  onManageStorage,
  onUploadFile,
  onAddPhoto,
}: StorageHeroCardProps) {
  const { user } = useAuth();
  const rawName =
    userName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";
  const firstName = rawName.trim().split(/\s+/)[0];

  // Parse dynamic storage numbers for high-end typography
  const [whole, decimal = "00"] = usedStorage.includes(".")
    ? usedStorage.split(".")
    : [usedStorage, "00"];

  return (
    <View className="w-full mb-4 relative">
      {/* --- 1. Back Peeking Card (Mark-X Cloud Tier) --- */}
      <View className="w-full bg-[#FFFFFF] rounded-[24px] pt-4 pb-16 px-5 flex-row justify-between items-start border border-black/[0.04]">
        <View className="flex-1 mr-3">
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            allowFontScaling={false}
            className="text-[22px] text-[#EB5B49] tracking-tight leading-none"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            {firstName}
          </Text>
          <Text
            allowFontScaling={false}
            className="text-[9px] text-[#808080] tracking-wider uppercase mt-1"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            EXECUTIVE CLOUD
          </Text>
        </View>

        <View className="shrink-0 items-end justify-center pt-0.5">
          <Text
            allowFontScaling={false}
            className="text-[13px] text-[#111111] tracking-tight text-right"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            {tagline}
          </Text>
          <Text
            allowFontScaling={false}
            className="text-[9px] text-[#8E8E93] tracking-wider uppercase mt-0.5 text-right"
            style={{ fontFamily: "Outfit_500Medium" }}
          >
            POWERED BY MARK-X
          </Text>
        </View>
      </View>

      {/* --- 2. Front Overlapping Card (Signature Coral Card) --- */}
      <View className="w-full rounded-[24px] bg-[#EB5B49] p-5 -mt-10">
        {/* Brand & Dynamic Used Storage Balance */}
        <View className="flex-row justify-between items-baseline mb-2">
          <Text
            allowFontScaling={false}
            className="text-[26px] text-white tracking-tight leading-none"
            style={{ fontFamily: "Outfit_700Bold" }}
          >
            Mark X
          </Text>

          <View className="flex-row items-baseline">
            <Text
              allowFontScaling={false}
              className="text-[32px] text-white tracking-tight leading-none"
              style={{ fontFamily: "Outfit_700Bold" }}
            >
              {whole}
            </Text>
            <Text
              allowFontScaling={false}
              className="text-[20px] text-white/95 leading-none"
              style={{ fontFamily: "Outfit_700Bold" }}
            >
              .{decimal}
            </Text>
            <Text
              allowFontScaling={false}
              className="text-[13px] text-white/85 ml-1.5 leading-none"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              GB
            </Text>
          </View>
        </View>

        {/* Subtitle Info Row */}
        <View className="flex-row justify-between items-center mb-4 pt-0.5">
          <View className="flex-row items-center">
            <Ionicons name="cloud-done-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text
              allowFontScaling={false}
              className="text-[12px] text-white/80 ml-1.5"
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              Personal Vault • Active
            </Text>
          </View>

          <Text
            allowFontScaling={false}
            className="text-[12px] text-white/80"
            style={{ fontFamily: "Outfit_500Medium" }}
          >
            Used Storage
          </Text>
        </View>

        {/* Action Button Pills */}
        <View className="flex-row items-center pt-1">
          {/* Upload File Pill */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onUploadFile}
            className="flex-row items-center bg-[#2B140F]/60 active:bg-[#2B140F]/80 px-3.5 h-[36px] rounded-full mr-2"
          >
            <Ionicons name="add-circle" size={16} color="#FFFFFF" />
            <Text
              allowFontScaling={false}
              className="text-[13px] text-white ml-1.5"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Upload file
            </Text>
          </TouchableOpacity>

          {/* Add Photo Pill */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onAddPhoto}
            className="flex-row items-center bg-[#2B140F]/60 active:bg-[#2B140F]/80 px-3.5 h-[36px] rounded-full mr-2"
          >
            <Ionicons name="images" size={15} color="#FFFFFF" />
            <Text
              allowFontScaling={false}
              className="text-[13px] text-white ml-1.5"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Add photo
            </Text>
          </TouchableOpacity>

          {/* More Options Pill */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onManageStorage}
            className="w-[36px] h-[36px] rounded-full bg-[#2B140F]/60 active:bg-[#2B140F]/80 items-center justify-center ml-auto"
          >
            <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
