import React from "react";
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function NoteLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === "android" ? "slide_from_right" : "default",
        contentStyle: {
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
