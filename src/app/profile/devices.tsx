import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { triggerHaptic } from "../../utils/haptics";
import { IosDialog } from "../../components/common/IosDialog";
import {
  getFormattedDeviceLabel,
  getHardwareInfo,
  getPersistentDeviceId,
} from "../../services/devices/deviceHardwareService";
import {
  formatDeviceActivity,
  FirestoreDevice,
  removeActiveDevice,
  subscribeActiveDevices,
  syncCurrentDevice,
} from "../../services/deviceSyncService";


/**
 * Renders an active device row (icon badge, name, platform, and right action/status).
 */
interface DeviceRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  rightElement: React.ReactNode;
  showDivider?: boolean;
}

function DeviceRow({
  icon,
  title,
  subtitle,
  rightElement,
  showDivider = true,
}: DeviceRowProps) {
  return (
    <View
      className={`py-3.5 ${showDivider ? "border-b border-[#EBEBEB]" : ""} flex-row items-center justify-between`}
    >
      <View className="flex-row items-center flex-1 pr-3">
        <View className="w-12 h-12 rounded-full bg-[#F7F7F7] border border-[#EBEBEB] items-center justify-center mr-3.5">
          <Ionicons name={icon} size={22} color="#222222" />
        </View>

        <View className="flex-1">
          <Text
            className="text-[17px] text-[#222222]"
            style={{ fontFamily: "Outfit_600SemiBold" }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            className="text-[13px] text-[#717171] mt-0.5"
            style={{ fontFamily: "Outfit_400Regular" }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      {rightElement}
    </View>
  );
}

/**
 * Standard Mark-X profile key-value specification row.
 */
function SpecRow({
  label,
  description,
  value,
  isLast = false,
}: {
  label: string;
  description: string;
  value: string;
  isLast?: boolean;
}) {
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


export default function DevicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.uid || "guest";

  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");
  const [allDevices, setAllDevices] = useState<FirestoreDevice[]>([]);
  const [logoutTarget, setLogoutTarget] = useState<FirestoreDevice | null>(null);

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

  // Sync heartbeat & persistent ID
  useEffect(() => {
    let isMounted = true;
    getPersistentDeviceId().then((id) => {
      if (isMounted) {
        setCurrentDeviceId(id);
        if (userId && userId !== "guest") {
          syncCurrentDevice(userId, id, hardwareInfo);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [userId, hardwareInfo]);

  // Subscribe to real-time active devices
  useEffect(() => {
    if (!userId || userId === "guest") return;
    const unsubscribe = subscribeActiveDevices(userId, setAllDevices);
    return () => unsubscribe();
  }, [userId]);

  const otherDevices = useMemo(
    () => allDevices.filter((d) => d.deviceId !== currentDeviceId),
    [allDevices, currentDeviceId]
  );

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
    const target = logoutTarget;
    setLogoutTarget(null);
    triggerHaptic();

    // Optimistically update list immediately for instant UI feedback
    setAllDevices((prev) => prev.filter((d) => d.deviceId !== target.deviceId));

    try {
      await removeActiveDevice(userId, target.deviceId);
    } catch (err: any) {
      console.warn("[DevicesScreen] Failed to remove active session:", err);
    }
  };

  // Declarative hardware specifications data
  const hardwareSpecs = [
    { label: "Model", description: "Hardware model identifier", value: hardwareInfo.modelName },
    { label: "Manufacturer", description: "Device maker & branding", value: hardwareInfo.brand },
    { label: "Operating system", description: "Installed OS platform & build", value: `${hardwareInfo.osName} ${hardwareInfo.osVersion}` },
    { label: "Application version", description: "Mark-X client release", value: `v${hardwareInfo.appVersion}` },
    { label: "Device class", description: "Physical or virtual environment", value: hardwareInfo.isPhysical ? "Physical hardware" : "Simulator / Virtual" },
  ];

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
        {/* ================= CURRENT DEVICE ================= */}
        <DeviceRow
          icon={getDeviceIcon(hardwareInfo.deviceType)}
          title={deviceLabel}
          subtitle={`${hardwareInfo.osName} ${hardwareInfo.osVersion}`}
          rightElement={
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
          }
        />

        <View className="h-5" />

        {/* ================= OTHER ACTIVE DEVICES ================= */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-[17px] text-[#222222] tracking-tight"
              style={{ fontFamily: "Outfit_600SemiBold" }}
            >
              Other active devices
            </Text>
            {otherDevices.length > 0 && (
              <Text
                className="text-[13px] text-[#717171]"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                {otherDevices.length} {otherDevices.length === 1 ? "device" : "devices"}
              </Text>
            )}
          </View>

          {otherDevices.length > 0 ? (
            <>
              {otherDevices.map((device, idx) => (
                <DeviceRow
                  key={device.deviceId}
                  icon={getDeviceIcon(device.deviceType)}
                  title={device.name || device.modelName || "Authorized Device"}
                  subtitle={`${device.osName} ${device.osVersion}`}
                  showDivider={idx !== otherDevices.length - 1}
                  rightElement={
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
                          setLogoutTarget(device);
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
                  }
                />
              ))}
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

        {/* ================= HARDWARE SPECIFICATIONS ================= */}
        <View className="mb-6">
          <Text
            className="text-[17px] text-[#222222] tracking-tight mb-1"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            Device information
          </Text>

          {hardwareSpecs.map((spec, idx) => (
            <SpecRow
              key={spec.label}
              label={spec.label}
              description={spec.description}
              value={spec.value}
              isLast={idx === hardwareSpecs.length - 1}
            />
          ))}
        </View>
      </ScrollView>

      {/* iOS Confirmation Dialog */}
      <IosDialog
        visible={logoutTarget !== null}
        title="Log Out Device"
        message={
          logoutTarget
            ? `Are you sure you want to log out of "${
                logoutTarget.name || logoutTarget.modelName
              }"? It will be disconnected immediately.`
            : ""
        }
        actions={[
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setLogoutTarget(null),
          },
          {
            text: "Log Out",
            style: "destructive",
            onPress: handleConfirmLogout,
          },
        ]}
        onClose={() => setLogoutTarget(null)}
      />
    </View>
  );
}
