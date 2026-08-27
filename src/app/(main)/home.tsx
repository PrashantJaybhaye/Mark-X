import React, { useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BottomTabBar, TabKey } from "../../components/navigation/BottomTabBar";
import { useAuth } from "../../context/AuthContext";
import { safePickDocument, safePickImage } from "../../services/nativePickerService";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  const [usedStorage, setUsedStorage] = useState("0.00");
  const [vaultCount, setVaultCount] = useState(0);
  const [docsCount, setDocsCount] = useState(2);

  const haptic = async (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      await Haptics.impactAsync(style);
    } catch {
      Vibration.vibrate(Platform.OS === "android" ? 15 : 10);
    }
  };

  const handleUploadFile = async () => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    const file = await safePickDocument();
    if (file) {
      setDocsCount((n) => n + 1);
      setUsedStorage((v) => (parseFloat(v) + 0.05).toFixed(2));
    }
  };

  const handleAddPhoto = async () => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    const img = await safePickImage();
    if (img) {
      setVaultCount((n) => n + 1);
      setUsedStorage((v) => (parseFloat(v) + 0.02).toFixed(2));
    }
  };

  return (
    <View className="flex-1 bg-[#F4F5F7]">
      <StatusBar style="dark" />

      <SafeAreaView edges={["top"]} className="flex-1 bg-[#F4F5F7]">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-3">
          <Text
            allowFontScaling={false}
            className="text-[34px] text-[#111111] tracking-tight"
            style={{ fontFamily: "Outfit_800ExtraBold" }}
          >
            Mark-X
          </Text>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              haptic();
              setActiveTab("profile");
            }}
            className="w-10 h-10 rounded-full overflow-hidden border border-black/5 items-center justify-center bg-[#E5E7EB]"
          >
            {user?.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <Ionicons name="person" size={20} color="#6B7280" />
            )}
          </TouchableOpacity>
        </View>

        {/* Content Body */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 12) + 70,
          }}
        >
          {/* Storage Balance Hero Card */}
          <View className="w-full bg-white rounded-[28px] p-6 mb-3.5 border border-black/[0.04] shadow-sm">
            <View className="flex-row items-center justify-between mb-1">
              <Text
                allowFontScaling={false}
                className="text-[15px] text-[#111111]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Cloud Storage
              </Text>
              <TouchableOpacity
                activeOpacity={0.65}
                className="flex-row items-center"
                onPress={() => haptic()}
              >
                <Text
                  allowFontScaling={false}
                  className="text-[13px] text-[#8E8E93] mr-0.5"
                  style={{ fontFamily: "Outfit_500Medium" }}
                >
                  Encrypted Vault
                </Text>
                <Ionicons name="chevron-forward" size={13} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-baseline my-3">
              <Text
                allowFontScaling={false}
                className="text-[52px] text-[#111111] tracking-tight mr-2 leading-[56px]"
                style={{ fontFamily: "Outfit_700Bold" }}
              >
                {usedStorage}
              </Text>
              <Text
                allowFontScaling={false}
                className="text-2xl text-[#8E8E93]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                GB
              </Text>
            </View>

            <View className="flex-row items-center justify-between mt-3 gap-3">
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleUploadFile}
                className="flex-1 h-[48px] rounded-full bg-[#F0F2F4] items-center justify-center"
              >
                <Text
                  allowFontScaling={false}
                  className="text-[15px] text-[#111111]"
                  style={{ fontFamily: "Outfit_700Bold" }}
                >
                  Upload File
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleAddPhoto}
                className="flex-1 h-[48px] rounded-full bg-[#F0F2F4] items-center justify-center"
              >
                <Text
                  allowFontScaling={false}
                  className="text-[15px] text-[#111111]"
                  style={{ fontFamily: "Outfit_700Bold" }}
                >
                  Add Photo
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2x2 Feature Grid */}
          <View className="w-full gap-3.5">
            {/* Row 1 */}
            <View className="flex-row gap-3.5">
              {/* Private Vault */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  haptic();
                  setActiveTab("drive");
                }}
                className="flex-1 bg-white rounded-3xl p-4 min-h-[180px] justify-between border border-black/[0.04] shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    allowFontScaling={false}
                    className="text-[15px] text-[#111111]"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Private Vault
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color="#8E8E93" />
                </View>

                {/* Vault Safe Dial */}
                <View className="h-16 items-center justify-center my-1">
                  <View className="w-[52px] h-[52px] rounded-full bg-emerald-100 items-center justify-center">
                    <View className="w-10 h-10 rounded-full bg-emerald-900 items-center justify-center relative">
                      <View className="w-3.5 h-3.5 rounded-full bg-emerald-200" />
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                        <View
                          key={deg}
                          className="absolute w-[2px] h-[4px] bg-emerald-400 top-[2px]"
                          style={{ transform: [{ rotate: `${deg}deg` }] }}
                        />
                      ))}
                    </View>
                  </View>
                </View>

                <View>
                  <Text
                    allowFontScaling={false}
                    className="text-[22px] text-[#111111] mt-1"
                    style={{ fontFamily: "Outfit_700Bold" }}
                  >
                    {vaultCount}
                  </Text>
                  <Text
                    allowFontScaling={false}
                    className="text-[12px] text-[#8E8E93] mt-0.5"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    Zero-Knowledge Files
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Document Drive */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  haptic();
                  setActiveTab("drive");
                }}
                className="flex-1 bg-white rounded-3xl p-4 min-h-[180px] justify-between border border-black/[0.04] shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    allowFontScaling={false}
                    className="text-[15px] text-[#111111]"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Document Drive
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color="#8E8E93" />
                </View>

                {/* Storage Discs */}
                <View className="h-16 w-full relative items-center justify-center">
                  <View className="absolute w-[90%] h-[50px] bg-slate-100 rounded-xl bottom-0" />
                  <View className="absolute w-[68px] h-[24px] rounded-full border-2 border-white items-center justify-center top-0 bg-cyan-300">
                    <Ionicons name="document-text" size={12} color="#FFFFFF" />
                  </View>
                  <View className="absolute w-[68px] h-[24px] rounded-full border-2 border-white items-center justify-center top-4 bg-sky-400">
                    <Ionicons name="document-text" size={12} color="#FFFFFF" />
                  </View>
                  <View className="absolute w-[68px] h-[24px] rounded-full border-2 border-white items-center justify-center top-8 bg-sky-600">
                    <Ionicons name="document-text" size={12} color="#FFFFFF" />
                  </View>
                </View>

                <View>
                  <Text
                    allowFontScaling={false}
                    className="text-[22px] text-[#111111] mt-1"
                    style={{ fontFamily: "Outfit_700Bold" }}
                  >
                    {docsCount}
                  </Text>
                  <Text
                    allowFontScaling={false}
                    className="text-[12px] text-[#8E8E93] mt-0.5"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    Fast Secure Sync
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Row 2 */}
            <View className="flex-row gap-3.5">
              {/* Secure Notes */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  haptic();
                  setActiveTab("notes");
                }}
                className="flex-1 bg-white rounded-3xl p-4 min-h-[180px] justify-between border border-black/[0.04] shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    allowFontScaling={false}
                    className="text-[15px] text-[#111111]"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Secure Notes
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color="#8E8E93" />
                </View>

                {/* Violet Waves */}
                <View className="h-16 w-full rounded-xl overflow-hidden relative bg-slate-50">
                  <View className="absolute w-full h-full bg-slate-100" />
                  <View className="absolute w-full rounded-t-2xl bg-violet-100 h-[48px] bottom-0" />
                  <View className="absolute w-full rounded-t-2xl bg-violet-200 h-[36px] bottom-0" />
                  <View className="absolute w-full rounded-t-2xl bg-violet-300 h-[24px] bottom-0" />
                  <View className="absolute w-full rounded-t-2xl bg-violet-700 h-[12px] bottom-0" />
                </View>

                <View>
                  <Text
                    allowFontScaling={false}
                    className="text-[22px] text-[#111111] mt-1"
                    style={{ fontFamily: "Outfit_700Bold" }}
                  >
                    Quick Notes
                  </Text>
                  <Text
                    allowFontScaling={false}
                    className="text-[12px] text-[#8E8E93] mt-0.5"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    Continuous Autosave
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Personal Cloud */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  haptic();
                  setActiveTab("profile");
                }}
                className="flex-1 bg-white rounded-3xl p-4 min-h-[180px] justify-between border border-black/[0.04] shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    allowFontScaling={false}
                    className="text-[15px] text-[#111111]"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Personal Cloud
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color="#8E8E93" />
                </View>

                {/* Golden Document Sheets */}
                <View className="h-16 w-full rounded-xl items-center justify-center bg-slate-100 relative">
                  <View
                    className="absolute w-[48px] h-[36px] rounded-md p-1 border border-black/5 bg-yellow-700"
                    style={{ transform: [{ rotate: "-10deg" }] }}
                  />
                  <View
                    className="absolute w-[48px] h-[36px] rounded-md p-1 border border-black/5 bg-yellow-600"
                    style={{ transform: [{ rotate: "-4deg" }] }}
                  />
                  <View
                    className="absolute w-[48px] h-[36px] rounded-md p-1 border border-black/5 bg-yellow-400"
                    style={{ transform: [{ rotate: "4deg" }] }}
                  >
                    <View className="w-4/5 h-1 bg-white rounded-sm mb-[3px]" />
                    <View className="w-11/12 h-[2px] bg-white/70 rounded-[1px] mb-0.5" />
                    <View className="w-1/2 h-[2px] bg-white/70 rounded-[1px]" />
                  </View>
                </View>

                <View>
                  <Text
                    allowFontScaling={false}
                    className="text-[22px] text-[#111111] mt-1"
                    style={{ fontFamily: "Outfit_700Bold" }}
                  >
                    10 GB Free
                  </Text>
                  <Text
                    allowFontScaling={false}
                    className="text-[12px] text-[#8E8E93] mt-0.5"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    Zero Egress Fees
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCenterActionPress={handleUploadFile}
          bottomInset={insets.bottom}
        />
      </SafeAreaView>
    </View>
  );
}
