import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#090A0F",
        },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
