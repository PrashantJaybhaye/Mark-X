import React from "react";
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function GalleryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      <Stack.Screen name="passcode" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="hidden" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="[id]" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
