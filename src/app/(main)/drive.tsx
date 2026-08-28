import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function DriveScreen() {
  return (
    <View className="flex-1 bg-[#F4F5F7] items-center justify-center">
      <StatusBar style="dark" />
      <SafeAreaView className="items-center justify-center">
        <Text className="text-xl font-semibold text-[#111111] font-outfit-semibold">
          Drive page
        </Text>
      </SafeAreaView>
    </View>
  );
}
