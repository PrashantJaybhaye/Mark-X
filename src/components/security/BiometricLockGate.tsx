import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBiometrics } from "../../context/BiometricsContext";
import { useAuth } from "../../context/AuthContext";
import { triggerHaptic } from "../../utils/haptics";
import { MarkXLogo } from "../common/MarkXLogo";
import { IosDialog } from "../common/IosDialog";

const ACCENT_COLOR = "#007AFF";
const TEXT_MUTED = "#8E8E93";

export function BiometricLockGate() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { isLocked, capability, unlockApp } = useBiometrics();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAttempting, setIsAttempting] = useState(false);
  const [isEmergencyModalVisible, setIsEmergencyModalVisible] = useState(false);
  const isAttemptingRef = useRef(false);
  const hasAutoPromptedRef = useRef(false);

  const handleUnlock = useCallback(async () => {
    if (isAttemptingRef.current) return;
    isAttemptingRef.current = true;
    setIsAttempting(true);
    triggerHaptic();

    try {
      const res = await unlockApp();
      if (!res.success && !res.cancelled && res.error) {
        setErrorMessage(res.error);
      } else if (res.success) {
        setErrorMessage(null);
      }
    } finally {
      isAttemptingRef.current = false;
      setIsAttempting(false);
    }
  }, [unlockApp]);

  // Prompt biometrics once per lock session
  useEffect(() => {
    if (isLocked) {
      if (!hasAutoPromptedRef.current) {
        hasAutoPromptedRef.current = true;
        const timer = setTimeout(handleUnlock, 350);
        return () => clearTimeout(timer);
      }
    } else {
      hasAutoPromptedRef.current = false;
    }
  }, [isLocked, handleUnlock]);

  if (!isLocked || !user) {
    return null;
  }

  const handleSignOut = async () => {
    triggerHaptic();
    try {
      await signOut();
    } catch (e) {
      console.warn("[BiometricLockGate] Sign out error:", e);
    }
  };

  const handleEmergencyAccess = () => {
    triggerHaptic();
    setIsEmergencyModalVisible(true);
  };

  const sensorName = capability?.sensorName || (Platform.OS === "ios" ? "Face ID" : "Fingerprint");

  return (
    <>
      <Modal
        visible={isLocked}
        animationType="none"
        transparent={false}
        statusBarTranslucent
      >
        <View className="flex-1 bg-black">
          <StatusBar style="dark" />

          {/* Floating White Sheet */}
          <View
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderBottomLeftRadius: 46,
              borderBottomRightRadius: 46,
              overflow: "hidden",
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.16,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Mark-X Brand Header */}
            <View
              style={{
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: insets.top + 48,
                paddingBottom: 8,
              }}
            >
              <MarkXLogo width={145} height={19} color="#111111" />
            </View>

            {/* Biometric Center Hero */}
            <View className="flex-1 items-center justify-center px-6">
              <View className="items-center -mt-8">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleUnlock}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  className="items-center justify-center p-2 mb-3"
                >
                  <Ionicons
                    name="finger-print"
                    size={94}
                    color={ACCENT_COLOR}
                  />
                </TouchableOpacity>

                <Text
                  className="text-[18px] text-center tracking-tight"
                  style={{
                    fontFamily: "Outfit_500Medium",
                    color: errorMessage ? "#EF4444" : TEXT_MUTED,
                  }}
                >
                  {errorMessage || "App is Locked"}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Navigation Dock */}
          <View
            style={{
              paddingTop: 18,
              paddingBottom: Math.max(insets.bottom, 16) + 10,
              backgroundColor: "#000000",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Primary Unlock Action */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleUnlock}
              disabled={isAttempting}
              hitSlop={{ top: 10, bottom: 8, left: 20, right: 20 }}
              className="flex-row items-center justify-center py-1.5 px-6"
            >
              <Ionicons
                name="lock-closed"
                size={15}
                color={ACCENT_COLOR}
                style={{ marginRight: 7 }}
              />
              <Text
                style={{
                  color: ACCENT_COLOR,
                  fontSize: 15,
                  fontFamily: "Outfit_600SemiBold",
                }}
              >
                {isAttempting ? "Verifying..." : `Unlock with ${sensorName}`}
              </Text>
            </TouchableOpacity>

            {/* Emergency Access Button */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={handleEmergencyAccess}
              hitSlop={{ top: 8, bottom: 12, left: 20, right: 20 }}
              className="py-1 px-4 mt-0.5"
            >
              <Text
                style={{
                  color: TEXT_MUTED,
                  fontSize: 12,
                  fontFamily: "Outfit_400Regular",
                }}
              >
                Emergency Access
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Center iOS Alert Dialog */}
      <IosDialog
        visible={isEmergencyModalVisible}
        title="Emergency Access"
        message="Are you sure you want to sign out of your account?"
        actions={[
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setIsEmergencyModalVisible(false),
          },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: () => {
              setIsEmergencyModalVisible(false);
              handleSignOut();
            },
          },
        ]}
        onClose={() => setIsEmergencyModalVisible(false)}
      />
    </>
  );
}
