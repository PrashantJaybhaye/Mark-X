import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { MarkXLogo } from "../../components/common/MarkXLogo";
import {
  hasHiddenPasscode,
  verifyHiddenPasscode,
  setHiddenPasscode,
} from "../../services/hiddenPasscodeService";
import { triggerHaptic } from "../../utils/haptics";

export default function MyEyesOnlyPasscodeScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupStep, setSetupStep] = useState<"initial" | "confirm">("initial");
  const [firstPasscode, setFirstPasscode] = useState("");
  const [enteredPin, setEnteredPin] = useState("");
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dashScaleAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => {
    if (Platform.OS === "android") {
      RNStatusBar.setBarStyle("dark-content");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function checkState() {
      try {
        const hasCode = await hasHiddenPasscode();
        if (!isMounted) return;

        if (mode === "change" || !hasCode) {
          setIsSetupMode(true);
          setSetupStep("initial");
        } else {
          setIsSetupMode(false);
        }
      } catch (err) {
        console.warn("[PasscodeScreen] Init error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    checkState();
    return () => {
      isMounted = false;
    };
  }, []);

  const triggerShake = useCallback(() => {
    setHasError(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 3, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => setHasError(false), 500);
    });
  }, [shakeAnim]);

  const animateDash = (index: number) => {
    const anim = dashScaleAnims[index];
    if (anim) {
      anim.setValue(1.35);
      Animated.spring(anim, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleKeyPress = (digit: string) => {
    if (enteredPin.length >= 4) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setErrorMessage(null);
    setHasError(false);

    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);
    animateDash(enteredPin.length);

    if (nextPin.length === 4) {
      handleComplete(nextPin);
    }
  };

  const handleBackspace = () => {
    if (enteredPin.length === 0) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setErrorMessage(null);
    setHasError(false);
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const handleComplete = async (pin: string) => {
    if (isSetupMode) {
      if (setupStep === "initial") {
        setFirstPasscode(pin);
        setEnteredPin("");
        setSetupStep("confirm");
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        if (pin === firstPasscode) {
          await setHiddenPasscode(pin);
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          router.replace("/gallery/hidden");
        } else {
          triggerShake();
          setErrorMessage("Passcodes didn't match. Try again.");
          setEnteredPin("");
          setFirstPasscode("");
          setSetupStep("initial");
        }
      }
    } else {
      const isValid = await verifyHiddenPasscode(pin);
      if (isValid) {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
        router.replace("/gallery/hidden");
      } else {
        triggerShake();
        setErrorMessage("Incorrect passcode. Try again.");
        setEnteredPin("");
      }
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="small" color="#111111" />
      </View>
    );
  }

  const titleText = isSetupMode
    ? setupStep === "initial"
      ? "Create your passcode"
      : "Retype your passcode"
    : "Enter your passcode";

  const subtitleText = "You will use this to log in securely";

  const keypadRows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />

      {/* Top Header Bar - Identical header level to other pages */}
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }} className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          activeOpacity={0.6}
          style={{ width: 40, height: 40, justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={26} color="#000000" />
        </TouchableOpacity>
        <View style={{ width: 40, height: 40 }} />
      </View>

      {/* Main Content Column - Centered Vertically */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, marginTop: -56 }}>
        {/* Prominent Mark X Logo */}
        <View style={{ marginBottom: 20 }} className="items-center justify-center">
          <MarkXLogo width={185} height={24} color="#000000" />
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 23,
            fontFamily: "Outfit_600SemiBold",
            color: "#000000",
            textAlign: "center",
            letterSpacing: -0.3,
            marginBottom: 8,
          }}
        >
          {titleText}
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Outfit_400Regular",
            color: "#71767B",
            textAlign: "center",
            maxWidth: 290,
            lineHeight: 20,
            marginBottom: 28,
          }}
        >
          {subtitleText}
        </Text>

        {/* 4 Horizontal Dash Segments */}
        <Animated.View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            transform: [{ translateX: shakeAnim }],
            marginBottom: 10,
          }}
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <Animated.View
                key={idx}
                style={{
                  width: 44,
                  height: 4.5,
                  borderRadius: 2.5,
                  marginHorizontal: 3.5,
                  backgroundColor: hasError
                    ? "#EF4444"
                    : isFilled
                    ? "#EB5B49"
                    : "#FEECE9",
                  transform: [{ scaleY: dashScaleAnims[idx] }],
                }}
              />
            );
          })}
        </Animated.View>

        {/* Error message slot */}
        <View style={{ height: 22, marginBottom: 44, justifyContent: "center", alignItems: "center" }}>
          {errorMessage ? (
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Outfit_500Medium",
                color: "#EF4444",
                textAlign: "center",
              }}
            >
              {errorMessage}
            </Text>
          ) : null}
        </View>

        {/* Keypad: Clean SemiBold, Pure Numerals (No letters) */}
        <View style={{ width: "100%", maxWidth: 300, gap: 20 }}>
          {keypadRows.map((row, rIdx) => (
            <View key={rIdx} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              {row.map((digit) => (
                <TouchableOpacity
                  key={digit}
                  activeOpacity={0.25}
                  onPress={() => handleKeyPress(digit)}
                  style={{ width: 80, height: 68, alignItems: "center", justifyContent: "center" }}
                >
                  <Text
                    style={{
                      fontSize: 34,
                      fontFamily: "Outfit_600SemiBold",
                      color: "#000000",
                      textAlign: "center",
                    }}
                  >
                    {digit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Bottom Row: Empty, 0, Backspace */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ width: 80, height: 68 }} />

            {/* Zero */}
            <TouchableOpacity
              activeOpacity={0.25}
              onPress={() => handleKeyPress("0")}
              style={{ width: 80, height: 68, alignItems: "center", justifyContent: "center" }}
            >
              <Text
                style={{
                  fontSize: 34,
                  fontFamily: "Outfit_600SemiBold",
                  color: "#000000",
                  textAlign: "center",
                }}
              >
                0
              </Text>
            </TouchableOpacity>

            {/* Backspace */}
            <TouchableOpacity
              activeOpacity={0.25}
              onPress={handleBackspace}
              disabled={enteredPin.length === 0}
              style={{ width: 80, height: 68, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons
                name="backspace-outline"
                size={27}
                color={enteredPin.length > 0 ? "#000000" : "#D1D5DB"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
