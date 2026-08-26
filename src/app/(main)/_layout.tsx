import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#090A0F",
        },
      }}
    >
      <Stack.Screen name="home" />
    </Stack>
  );
}
