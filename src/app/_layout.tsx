import "../global.css";
import React, { useEffect, useState, useRef } from "react";
import {
  DefaultTheme,
  ThemeProvider,
  Stack,
  useRouter,
  useSegments,
  useRootNavigationState,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";
import { Anton_400Regular } from "@expo-google-fonts/anton";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { BiometricsProvider } from "../context/BiometricsContext";
import { BiometricLockGate } from "../components/security/BiometricLockGate";
import { AnimatedSplashScreen } from "../components/splash/AnimatedSplashScreen";

// Keep native splash screen visible until custom splash is ready to animate
SplashScreen.preventAutoHideAsync().catch(() => {});

interface NavigationGuardProps {
  onDecisionComplete: () => void;
}

function NavigationGuard({ onDecisionComplete }: NavigationGuardProps) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const isDecisionCompletedRef = useRef(false);

  const markDecisionComplete = () => {
    if (!isDecisionCompletedRef.current) {
      isDecisionCompletedRef.current = true;
      onDecisionComplete();
    }
  };

  useEffect(() => {
    if (loading || !rootNavigationState?.key) return;

    let isMounted = true;
    const inAuthGroup = segments[0] === "(auth)";
    const inMainGroup = segments[0] === "(main)";
    const isProfileGroup = segments[0] === "profile";
    const isVerifyScreen = inAuthGroup && segments[1] === "verify-email";
    const isOnboarding = !segments[0];

    const frameId = requestAnimationFrame(() => {
      if (!isMounted) return;

      if (!user) {
        if (inMainGroup || isProfileGroup || isVerifyScreen) {
          router.replace("/(auth)/login");
        } else {
          markDecisionComplete();
        }
        return;
      }

      if (!user.emailVerified) {
        if (!isVerifyScreen) {
          router.replace("/(auth)/verify-email");
        } else {
          markDecisionComplete();
        }
        return;
      }

      if (user.emailVerified) {
        if (inAuthGroup || isOnboarding) {
          router.replace("/(main)/home");
        } else {
          markDecisionComplete();
        }
      }
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
    };
  }, [user, loading, segments, rootNavigationState?.key, router]);

  return null;
}

function RootLayoutContent({ isFontsReady }: { isFontsReady: boolean }) {
  const [isDecisionComplete, setIsDecisionComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDecisionComplete(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const isAppReady = isFontsReady && isDecisionComplete;

  return (
    <AnimatedSplashScreen isReady={isAppReady}>
      <ThemeProvider value={DefaultTheme}>
        <StatusBar style="dark" />
        <NavigationGuard onDecisionComplete={() => setIsDecisionComplete(true)} />
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: {
              backgroundColor: "#FFFFFF",
            },
            headerTintColor: "#000000",
            contentStyle: {
              backgroundColor: "#FFFFFF",
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="profile" />
        </Stack>
        <BiometricLockGate />
      </ThemeProvider>
    </AnimatedSplashScreen>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
    Anton_400Regular,
  });

  const isFontsReady = !!(fontsLoaded || fontError);

  return (
    <AuthProvider>
      <BiometricsProvider>
        <RootLayoutContent isFontsReady={isFontsReady} />
      </BiometricsProvider>
    </AuthProvider>
  );
}
