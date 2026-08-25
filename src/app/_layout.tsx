import "../global.css";
import { useEffect } from "react";
import { DarkTheme, ThemeProvider, Stack } from "expo-router";
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
import { AuthProvider } from "../context/AuthContext";

// Keep splash screen visible while loading font assets
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
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
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: {
              backgroundColor: "#121212",
            },
            headerTintColor: "#FFFFFF",
            contentStyle: {
              backgroundColor: "#121212",
            },
          }}
        />
      </ThemeProvider>
    </AuthProvider>
  );
}


