import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { triggerHaptic } from "../../utils/haptics";
import {
  getFormattedDeviceLabel,
  getHardwareInfo,
  getPersistentDeviceId,
} from "../../services/devices/deviceHardwareService";
import {
  formatDeviceActivity,
  FirestoreDevice,
  removeActiveDevice,
  removeAllOtherDevices,
  subscribeActiveDevices,
  syncCurrentDevice,
} from "../../services/deviceSyncService";

function getDeviceIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "tablet":
      return "tablet-portrait-outline";
    case "desktop":
      return "laptop-outline";
    case "browser":
      return "globe-outline";
    default:
      return "phone-portrait-outline";
  }
}

// Clean Mark-X Profile Row Item
interface DeviceInfoRowProps {
  label: string;
  description: string;
  value: string;
  isLast?: boolean;
}

function DeviceInfoRow({
  label,
  description,
  value,
  isLast = false,
}: DeviceInfoRowProps) {
  return (
    <View
      className={`py-3.5 ${isLast ? "" : "border-b border-[#EBEBEB]"} flex-row items-center justify-between`}
    >
      <View className="flex-1 pr-3">
        <Text
          className="text-[15px] text-[#222222] mb-0.5"
          style={{ fontFamily: "Outfit_500Medium" }}
        >
          {label}
        </Text>
        <Text
          className="text-[13px] text-[#717171]"
          style={{ fontFamily: "Outfit_400Regular" }}
          numberOfLines={1}
        >
          {description}
        </Text>
      </View>

      <Text
        className="text-[14px] text-[#222222]"
        style={{ fontFamily: "Outfit_500Medium" }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

type ActiveLogoutTarget =
  | { type: "remote"; device: FirestoreDevice }
  | { type: "all_others" }
  | null;

export default function DevicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.uid || "guest";

  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");
  const [allDevices, setAllDevices] = useState<FirestoreDevice[]>([]);
  const [logoutTarget, setLogoutTarget] = useState<ActiveLogoutTarget>(null);
  const [isProcessingLogout, setIsProcessingLogout] = useState(false);

  const isDismissingRef = useRef(false);

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? RNStatusBar.currentHeight || 24 : 16
  );

  const hardwareInfo = useMemo(() => getHardwareInfo(), []);
  const deviceLabel = useMemo(
    () => getFormattedDeviceLabel(hardwareInfo),
    [hardwareInfo]
  );

  // Initialize device ID and sync heartbeat to Firestore
  useEffect(() => {
    let isMounted = true;

    async function initDevice() {
      const id = await getPersistentDeviceId();
      if (isMounted) {
        setCurrentDeviceId(id);
        if (userId && userId !== "guest") {
          await syncCurrentDevice(userId, id, hardwareInfo);
        }
      }
    }

    initDevice();

    return () => {
      isMounted = false;
    };
  }, [userId, hardwareInfo]);

  // Subscribe to real-time active devices for this account in Firestore
  useEffect(() => {
    if (!userId || userId === "guest") {
      return;
    }

    const unsubscribe = subscribeActiveDevices(userId, (devices) => {
      setAllDevices(devices);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Filter out this device to show other real active devices
  const otherActiveDevices = useMemo(() => {
    return allDevices.filter((d) => d.deviceId !== currentDeviceId);
  }, [allDevices, currentDeviceId]);

  const handleDismiss = () => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/profile");
    }
    setTimeout(() => {
      isDismissingRef.current = false;
    }, 750);
  };

  const handleConfirmLogout = async () => {
    if (!logoutTarget) return;
    setIsProcessingLogout(true);
    triggerHaptic();

    try {
      if (logoutTarget.type === "remote") {
        await removeActiveDevice(userId, logoutTarget.device.deviceId);
        setLogoutTarget(null);
      } else if (logoutTarget.type === "all_others") {
        await removeAllOtherDevices(userId, currentDeviceId);
        setLogoutTarget(null);
      }
    } catch (err: any) {
      Alert.alert("Logout Error", err.message || "Failed to log out session.");
    } finally {
      setIsProcessingLogout(false);
    }
  };

  const currentDeviceIcon =
    hardwareInfo.deviceType === "tablet"
      ? "tablet-portrait-outline"
      : hardwareInfo.deviceType === "desktop"
      ? "desktop-outline"
      : "phone-portrait-outline";

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Top Navigation Bar */}
      <View
        style={{ paddingTop: topInset + 8 }}
        className="bg-white px-4 pb-3.5 border-b border-[#EBEBEB]"
      >
        <View className="flex-row items-center justify-between min-h-[44px] relative">
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-10 h-10 items-center justify-center z-10"
          >
            <Ionicons name="chevron-back" size={24} color="#222222" />
          </TouchableOpacity>

          <View className="absolute inset-0 items-center justify-center pointer-events-none">
            <Text
              className="text-[17px] text-[#222222]"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Active Devices
            </Text>
          </View>

          <View className="w-10 h-10" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom + 32, 48),
        }}
      >
        {/* ================= THIS DEVICE HEADER ================= */}
        <View className="pb-5 mb-5 border-b border-[#EBEBEB] flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-3">
            <View className="w-12 h-12 rounded-full bg-[#F7F7F7] border border-[#EBEBEB] items-center justify-center mr-3.5">
              <Ionicons name={currentDeviceIcon} size={22} color="#222222" />
            </View>

            <View className="flex-1">
              <Text
                className="text-[17px] text-[#222222]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
                numberOfLines={1}
              >
                {deviceLabel}
              </Text>
              <Text
                className="text-[13px] text-[#717171] mt-0.5"
                style={{ fontFamily: "Outfit_400Regular" }}
                numberOfLines={1}
              >
                {hardwareInfo.osName} {hardwareInfo.osVersion}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <Ionicons
              name="checkmark-circle"
              size={15}
              color="#008A05"
              style={{ marginRight: 4 }}
            />
            <Text
              className="text-[13px] text-[#008A05]"
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              Active now
            </Text>
          </View>
        </View>

        {/* ================= SECTION 1: OTHER ACTIVE DEVICES ================= */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-[17px] text-[#222222] tracking-tight"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Other active devices
            </Text>
            {otherActiveDevices.length > 0 && (
              <Text
                className="text-[13px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                {otherActiveDevices.length} {otherActiveDevices.length === 1 ? "device" : "devices"}
              </Text>
            )}
          </View>

          {otherActiveDevices.length > 0 ? (
            <>
              {otherActiveDevices.map((device) => (
                <View
                  key={device.deviceId}
                  className="py-3.5 border-b border-[#EBEBEB] flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 pr-3">
                    <View className="w-12 h-12 rounded-full bg-[#F7F7F7] border border-[#EBEBEB] items-center justify-center mr-3.5">
                      <Ionicons
                        name={getDeviceIcon(device.deviceType)}
                        size={22}
                        color="#222222"
                      />
                    </View>

                    <View className="flex-1">
                      <Text
                        className="text-[17px] text-[#222222]"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                        numberOfLines={1}
                      >
                        {device.name || device.modelName || "Authorized Device"}
                      </Text>
                      <Text
                        className="text-[13px] text-[#717171] mt-0.5"
                        style={{ fontFamily: "Outfit_400Regular" }}
                        numberOfLines={1}
                      >
                        {device.osName} {device.osVersion}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end pl-2">
                    <Text
                      className="text-[12px] text-[#717171]"
                      style={{ fontFamily: "Outfit_400Regular" }}
                    >
                      {formatDeviceActivity(device.lastActive)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        setLogoutTarget({ type: "remote", device });
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      className="mt-1"
                    >
                      <Text
                        className="text-[13px] text-[#E00B41]"
                        style={{ fontFamily: "Outfit_500Medium" }}
                      >
                        Log out
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Log out all other devices trigger */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic();
                  setLogoutTarget({ type: "all_others" });
                }}
                className="py-3.5 border-b border-[#EBEBEB] flex-row items-center justify-between"
              >
                <View className="flex-1 pr-3">
                  <Text
                    className="text-[15px] text-[#222222] mb-0.5"
                    style={{ fontFamily: "Outfit_500Medium" }}
                  >
                    Log out of all other devices
                  </Text>
                  <Text
                    className="text-[13px] text-[#717171]"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    Sign out of all sessions except this device
                  </Text>
                </View>

                <View className="py-0.5">
                  <Text
                    className="text-[14px] text-[#E00B41]"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    Log out all
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <View className="py-4 border-b border-[#EBEBEB]">
              <Text
                className="text-[14px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                No other active devices. Your account is only signed in on this device.
              </Text>
            </View>
          )}
        </View>

        {/* ================= SECTION 2: DEVICE INFORMATION ================= */}
        <View className="mb-6">
          <Text
            className="text-[17px] text-[#222222] tracking-tight mb-1"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Device information
          </Text>

          <DeviceInfoRow
            label="Model"
            description="Hardware model identifier"
            value={hardwareInfo.modelName}
          />
          <DeviceInfoRow
            label="Manufacturer"
            description="Device maker & branding"
            value={hardwareInfo.brand}
          />
          <DeviceInfoRow
            label="Operating system"
            description="Installed OS platform & build"
            value={`${hardwareInfo.osName} ${hardwareInfo.osVersion}`}
          />
          <DeviceInfoRow
            label="Application version"
            description="Mark-X client release"
            value={`v${hardwareInfo.appVersion}`}
          />
          <DeviceInfoRow
            label="Device class"
            description="Physical or virtual environment"
            value={hardwareInfo.isPhysical ? "Physical hardware" : "Simulator / Virtual"}
            isLast
          />
        </View>
      </ScrollView>

      {/* ================= UNIFIED MARK-X CONFIRMATION MODAL ================= */}
      <Modal
        visible={logoutTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutTarget(null)}
      >
        <TouchableWithoutFeedback onPress={() => setLogoutTarget(null)}>
          <View className="flex-1 bg-black/40 items-center justify-center px-8">
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View className="w-[272px] bg-[#F2F2F2] rounded-[14px] overflow-hidden shadow-2xl">
                <View className="pt-5 px-4 pb-4 items-center">
                  <Text
                    className="text-[17px] text-[#000000] text-center mb-1.5"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                  >
                    {logoutTarget?.type === "remote"
                      ? "Log Out Device"
                      : "Log Out All Devices"}
                  </Text>
                  <Text
                    className="text-[13px] text-[#3C3C43] text-center leading-5"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    {logoutTarget?.type === "remote"
                      ? `Are you sure you want to log out of "${
                          logoutTarget.device.name || logoutTarget.device.modelName
                        }"? It will be disconnected immediately.`
                      : "This will terminate sessions on all other devices. You will stay signed in on this phone."}
                  </Text>
                </View>

                <View className="h-[0.5px] bg-[#3C3C43]/20" />

                <View className="flex-row h-[44px]">
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      setLogoutTarget(null);
                    }}
                    activeOpacity={0.7}
                    disabled={isProcessingLogout}
                    className="flex-1 items-center justify-center border-r border-[#3C3C43]/20 active:bg-black/5"
                  >
                    <Text
                      className="text-[17px] text-[#007AFF]"
                      style={{ fontFamily: "Outfit_400Regular" }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirmLogout}
                    activeOpacity={0.7}
                    disabled={isProcessingLogout}
                    className="flex-1 items-center justify-center active:bg-black/5"
                  >
                    {isProcessingLogout ? (
                      <ActivityIndicator size="small" color="#E00B41" />
                    ) : (
                      <Text
                        className="text-[17px] text-[#E00B41]"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                      >
                        Log Out
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
