import React from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBar, TabKey } from "../../components/navigation/BottomTabBar";

export default function MainLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => {
        const currentRoute = props.state.routes[props.state.index].name as TabKey;
        return (
          <BottomTabBar
            activeTab={currentRoute}
            onTabChange={(tab) => {
              if (tab !== currentRoute) {
                props.navigation.navigate(tab);
              }
            }}
            bottomInset={insets.bottom}
          />
        );
      }}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="drive" />
      <Tabs.Screen name="gallery" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
