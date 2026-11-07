import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  BackHandler,
  AppState,
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
  getCachedHasHiddenPasscode,
  getPasscodeLockoutRemainingSeconds,
} from "../../services/hiddenPasscodeService";
import { triggerHaptic } from "../../utils/haptics";

const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

const KeypadButton = React.memo(function KeypadButton({
  digit,
  onPressIn,
}: {
  digit: string;
  onPressIn: (digit: string) => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.25}
      delayPressIn={0}
      onPressIn={() => onPressIn(digit)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
  );
});

export default function MyEyesOnlyPasscodeScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  const cachedHas = getCachedHasHiddenPasscode();
  const [isLoading, setIsLoading] = useState(() => (cachedHas !== null || mode === "change" ? false : true));
  const [isSetupMode, setIsSetupMode] = useState(() => (mode === "change" || cachedHas === false));
  const [setupStep, setSetupStep] = useState<"initial" | "confirm">("initial");
  const [firstPasscode, setFirstPasscode] = useState("");
  const [enteredPin, setEnteredPin] = useState("");
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pinRef = useRef("");
  const hasErrorRef = useRef(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dashScaleAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const isNavigatingRef = useRef(false);

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
  }, [mode]);

  const handleBackAction = useCallback(() => {
    if (isNavigatingRef.current) return;
    if (isSetupMode && setupStep === "confirm") {
      setSetupStep("initial");
      pinRef.current = "";
      setEnteredPin("");
      setFirstPasscode("");
      setErrorMessage(null);
      setHasError(false);
      hasErrorRef.current = false;
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/gallery");
    }
  }, [isSetupMode, setupStep, router]);

  useEffect(() => {
    const onBackPress = () => {
      handleBackAction();
      return true;
    };

    const backSub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => backSub.remove();
  }, [handleBackAction]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        pinRef.current = "";
        setEnteredPin("");
        setErrorMessage(null);
        setHasError(false);
        hasErrorRef.current = false;
        if (isSetupMode && setupStep === "confirm") {
          setSetupStep("initial");
          setFirstPasscode("");
        }
      }
    });
    return () => sub.remove();
  }, [isSetupMode, setupStep]);

  const triggerShake = useCallback(() => {
    setHasError(true);
    hasErrorRef.current = true;
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
      setTimeout(() => {
        setHasError(false);
        hasErrorRef.current = false;
      }, 500);
    });
  }, [shakeAnim]);

  const animateDash = useCallback((index: number) => {
    const anim = dashScaleAnims[index];
    if (anim) {
      anim.setValue(1.18);
      Animated.timing(anim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [dashScaleAnims]);

  const handleKeyPress = useCallback((digit: string) => {
    if (isNavigatingRef.current) return;
    const remaining = getPasscodeLockoutRemainingSeconds();
    if (remaining > 0) {
      triggerShake();
      setErrorMessage(`Too many failed attempts. Locked for ${remaining}s.`);
      return;
    }

    if (pinRef.current.length >= 4) return;

    // Instant touch feedback
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

    if (hasErrorRef.current) {
      setHasError(false);
      setErrorMessage(null);
      hasErrorRef.current = false;
    }

    const nextPin = pinRef.current + digit;
    pinRef.current = nextPin;
    setEnteredPin(nextPin);
    animateDash(nextPin.length - 1);

    if (nextPin.length === 4) {
      // Ensure UI renders the 4th dash smoothly before navigation/verification starts
      requestAnimationFrame(() => {
        handleComplete(nextPin);
      });
    }
  }, [triggerShake, animateDash]);

  const handleBackspace = useCallback(() => {
    if (isNavigatingRef.current) return;
    if (pinRef.current.length === 0) return;

    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

    if (hasErrorRef.current) {
      setHasError(false);
      setErrorMessage(null);
      hasErrorRef.current = false;
    }

    const nextPin = pinRef.current.slice(0, -1);
    pinRef.current = nextPin;
    setEnteredPin(nextPin);
  }, []);

  const handleComplete = async (pin: string) => {
    if (isNavigatingRef.current) return;

    if (isSetupMode) {
      if (setupStep === "initial") {
        setFirstPasscode(pin);
        pinRef.current = "";
        setEnteredPin("");
        setSetupStep("confirm");
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        if (pin === firstPasscode) {
          isNavigatingRef.current = true;
          try {
            await setHiddenPasscode(pin);
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
            if (mode === "change") {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/gallery/hidden");
              }
            } else {
              router.replace("/gallery/hidden");
            }
          } finally {
            setTimeout(() => {
              isNavigatingRef.current = false;
            }, 1000);
          }
        } else {
          triggerShake();
          setErrorMessage("Passcodes didn't match. Try again.");
          pinRef.current = "";
          setEnteredPin("");
          setFirstPasscode("");
          setSetupStep("initial");
        }
      }
    } else {
      isNavigatingRef.current = true;
      try {
        const isValid = await verifyHiddenPasscode(pin);
        if (isValid) {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          router.replace("/gallery/hidden");
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 1000);
        } else {
          isNavigatingRef.current = false;
          triggerShake();
          setErrorMessage("Incorrect passcode. Try again.");
          pinRef.current = "";
          setEnteredPin("");
        }
      } catch (err: any) {
        isNavigatingRef.current = false;
        triggerShake();
        setErrorMessage(err?.message || "Something went wrong. Try again.");
        pinRef.current = "";
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
      ? mode === "change"
        ? "Enter new passcode"
        : "Create your passcode"
      : "Retype your passcode"
    : "Enter your passcode";

  const subtitleText =
    mode === "change"
      ? "Set a new 4-digit passcode for your vault"
      : "You will use this to log in securely";

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />

      {/* Top Header Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }} className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={handleBackAction}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          activeOpacity={0.6}
          style={{ width: 40, height: 40, justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={26} color="#000000" />
        </TouchableOpacity>
        <View style={{ width: 40, height: 40 }} />
      </View>

      {/* Main Content Column */}
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

        {/* Keypad: Clean SemiBold, Pure Numerals */}
        <View style={{ width: "100%", maxWidth: 300, gap: 20 }}>
          {KEYPAD_ROWS.map((row, rIdx) => (
            <View key={rIdx} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              {row.map((digit) => (
                <KeypadButton
                  key={digit}
                  digit={digit}
                  onPressIn={handleKeyPress}
                />
              ))}
            </View>
          ))}

          {/* Bottom Row: Empty, 0, Backspace */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ width: 80, height: 68 }} />

            {/* Zero */}
            <KeypadButton
              digit="0"
              onPressIn={handleKeyPress}
            />

            {/* Backspace */}
            <TouchableOpacity
              activeOpacity={0.25}
              delayPressIn={0}
              onPressIn={handleBackspace}
              disabled={enteredPin.length === 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
