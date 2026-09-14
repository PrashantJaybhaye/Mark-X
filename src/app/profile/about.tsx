import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar as RNStatusBar,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../../utils/haptics";
import { checkOtaUpdate, OtaCheckResult } from "../../services/updateService";

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isChecking, setIsChecking] = useState(false);
  const [modalResult, setModalResult] = useState<OtaCheckResult | null>(null);

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) : 16
  );

  const handleDismiss = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/profile");
    }
  };

  const handleCheckUpdate = async () => {
    triggerHaptic();
    setIsChecking(true);
    try {
      const result = await checkOtaUpdate();
      setModalResult(result);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCloseModal = () => {
    triggerHaptic();
    setModalResult(null);
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View
        style={{ paddingTop: topInset + 8 }}
        className="bg-white px-4 pb-3.5 border-b border-[#F1F5F9]"
      >
        <View className="flex-row items-center justify-between min-h-[44px] relative">
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-10 h-10 items-center justify-center z-10"
          >
            <Ionicons name="chevron-back" size={24} color="#111111" />
          </TouchableOpacity>

          <View className="absolute inset-0 items-center justify-center pointer-events-none">
            <Text
              className="text-[17px] text-[#111111]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              About This Version
            </Text>
          </View>

          <View className="w-10 h-10" />
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-6 pb-24">
        <View className="w-[154px] h-[154px] rounded-[38px] bg-white items-center justify-center shadow-lg border border-[#F0F0F0] overflow-hidden mb-8">
          <Image
            source={require("../../../assets/images/icon.png")}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>

        {/* Tappable Version & Build (Clean, No intrusive buttons) */}
        <TouchableOpacity
          onPress={handleCheckUpdate}
          disabled={isChecking}
          activeOpacity={0.6}
          className="items-center py-2"
        >
          <Text
            className="text-[18px] text-[#111111] mb-1.5"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Version 1.0.0
          </Text>

          <View className="flex-row items-center justify-center">
            {isChecking ? (
              <ActivityIndicator size="small" color="#8E8E93" style={{ marginRight: 6 }} />
            ) : null}
            <Text
              className="text-[14px] text-[#71717A]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              {isChecking ? "Checking for updates..." : "Build: 57.0.22"}
            </Text>
          </View>
        </TouchableOpacity>

        <View className="h-14" />

        {/* Copyright */}
        <Text
          className="text-[13px] text-[#8E8E93] text-center leading-5"
          style={{ fontFamily: "Outfit_400Regular" }}
        >
          Copyright {new Date().getFullYear()} Mark-X, Inc.{"\n"}
          All Rights Reserved
        </Text>
      </View>

      {/* Pixel-Perfect iOS Alert Modal */}
      <Modal
        visible={modalResult !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseModal}>
          <View className="flex-1 bg-black/40 items-center justify-center px-8">
            <TouchableWithoutFeedback>
              <View className="w-[272px] bg-[#F2F2F2] rounded-[14px] overflow-hidden shadow-2xl">
                {/* Content Area */}
                <View className="pt-5 px-4 pb-4 items-center">
                  <Text
                    className="text-[17px] text-[#000000] text-center mb-1.5"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    {modalResult?.title}
                  </Text>
                  <Text
                    className="text-[13px] text-[#3C3C43] text-center leading-5"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    {modalResult?.message}
                  </Text>
                </View>

                {/* Hairline Divider */}
                <View className="h-[0.5px] bg-[#3C3C43]/20" />

                {/* iOS Action Buttons */}
                {modalResult?.hasUpdate && modalResult?.applyUpdate ? (
                  <View className="flex-row h-[44px]">
                    <TouchableOpacity
                      onPress={handleCloseModal}
                      activeOpacity={0.7}
                      className="flex-1 items-center justify-center border-r border-[#3C3C43]/20 active:bg-black/5"
                    >
                      <Text
                        className="text-[17px] text-[#007AFF]"
                        style={{ fontFamily: "Outfit_400Regular" }}
                      >
                        Later
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        handleCloseModal();
                        if (modalResult.applyUpdate) {
                          await modalResult.applyUpdate();
                        }
                      }}
                      activeOpacity={0.7}
                      className="flex-1 items-center justify-center active:bg-black/5"
                    >
                      <Text
                        className="text-[17px] text-[#007AFF]"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                      >
                        Update
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleCloseModal}
                    activeOpacity={0.7}
                    className="h-[44px] items-center justify-center active:bg-black/5"
                  >
                    <Text
                      className="text-[17px] text-[#007AFF]"
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                    >
                      OK
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
