import { DarkTheme, ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
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
  );
}

