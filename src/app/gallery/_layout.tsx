import React from "react";
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function GalleryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === "android" ? "fade" : "default",
        contentStyle: {
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
