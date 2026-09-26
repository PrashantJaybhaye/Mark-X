import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { LogoDraw } from "./LogoDraw";
import { triggerHaptic } from "../../utils/haptics";

interface AnimatedSplashScreenProps {
  isReady: boolean;
  children: React.ReactNode;
}

export function AnimatedSplashScreen({
  isReady,
  children,
}: AnimatedSplashScreenProps) {
  const [animationFinished, setAnimationFinished] = useState(false);
  const [isDrawingDone, setIsDrawingDone] = useState(false);

  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  // Reveal subtitle smoothly in sync with logo fill (starts at 750ms)
  useEffect(() => {
    subtitleOpacity.value = withDelay(
      750,
      withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.quad),
      })
    );
  }, [subtitleOpacity]);

  const handleDrawingComplete = useCallback(() => {
    setIsDrawingDone(true);
    subtitleOpacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.quad),
    });
  }, [subtitleOpacity]);

  // Safety fallback timer: ensure drawing is marked done even if frame was dropped
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsDrawingDone(true);
    }, 1600);
    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    if (!isReady || !isDrawingDone) return;

    // Comfortable dwell time (850ms) so users can clearly read both MARK-X and EXECUTIVE CLOUD
    const timeout = setTimeout(() => {
      triggerHaptic();

      scale.value = withTiming(1.04, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });

      opacity.value = withDelay(
        50,
        withTiming(
          0,
          {
            duration: 350,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          },
          (finished) => {
            if (finished) {
              runOnJS(setAnimationFinished)(true);
            }
          }
        )
      );
    }, 850);

    return () => clearTimeout(timeout);
  }, [isReady, isDrawingDone, opacity, scale]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedSubtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {children}

      {!animationFinished && (
        <Animated.View
          pointerEvents={isReady && isDrawingDone ? "none" : "auto"}
          style={[StyleSheet.absoluteFill, styles.splashContainer, animatedContainerStyle]}
        >
          <Animated.View style={[styles.logoWrapper, animatedLogoStyle]}>
            <LogoDraw
              width={240}
              height={30.6}
              drawDuration={1.2}
              fillStartPercent={70}
              fillDuration={0.35}
              strokeWidth={10}
              outlineColor="#111111"
              fillColor="#111111"
              onComplete={handleDrawingComplete}
            />

            <Animated.View style={[styles.subtitleContainer, animatedSubtitleStyle]}>
              <Text style={styles.subtitle}>EXECUTIVE CLOUD</Text>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  splashContainer: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  subtitleContainer: {
    marginTop: 18,
  },
  subtitle: {
    fontFamily: "Outfit_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    letterSpacing: 4.5,
    color: "#8E8E93",
    textTransform: "uppercase",
  },
});
