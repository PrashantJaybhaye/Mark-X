import React from "react";
import { Stack } from "expo-router";

export default function GalleryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "ios_from_right",
        contentStyle: {
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      <Stack.Screen name="passcode" options={{ animation: "ios_from_right" }} />
      <Stack.Screen name="hidden" options={{ animation: "fade" }} />
      <Stack.Screen name="[id]" options={{ animation: "fade" }} />
    </Stack>
  );
}
