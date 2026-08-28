import "../global.css";
import React, { useEffect } from "react";
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
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import { AuthProvider, useAuth } from "../context/AuthContext";

// Keep splash screen visible while loading font assets
SplashScreen.preventAutoHideAsync();

function NavigationGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // Ensure auth is loaded and the root navigation tree is fully mounted before routing
    if (loading || !rootNavigationState?.key) return;

    let isMounted = true;
    const inAuthGroup = segments[0] === "(auth)";
    const inMainGroup = segments[0] === "(main)";
    const isVerifyScreen = inAuthGroup && segments[1] === "verify-email";
    const isOnboarding = !segments[0];

    // Use requestAnimationFrame to ensure the navigation tree has completed mounting
    const frameId = requestAnimationFrame(() => {
      if (!isMounted) return;

      // 1. Not Authenticated: redirect if trying to access protected areas
      if (!user) {
        if (inMainGroup || isVerifyScreen) {
          router.replace("/(auth)/login");
        }
        return;
      }

      // 2. Authenticated but Unverified: route to verify email screen
      if (!user.emailVerified) {
        if (!isVerifyScreen) {
          router.replace("/(auth)/verify-email");
        }
        return;
      }

      // 3. Authenticated and Verified: route to main home dashboard
      if (user.emailVerified) {
        if (inAuthGroup || isOnboarding) {
          router.replace("/(main)/home");
        }
      }
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
    };
  }, [user, loading, segments, rootNavigationState?.key]);

  return null;
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
    BebasNeue_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <StatusBar style="dark" />
        <NavigationGuard />
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
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
