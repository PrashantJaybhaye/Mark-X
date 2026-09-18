import React from "react";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBar, TabKey } from "../../components/navigation/BottomTabBar";

export default function MainLayout() {
  const insets = useSafeAreaInsets();

  const renderTabBar = React.useCallback(
    (props: any) => {
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
    },
    [insets.bottom]
  );

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        tabBar={renderTabBar}
        screenOptions={{
          headerShown: false,
          freezeOnBlur: false,
          lazy: false,
          animation: "none",
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="drive" />
        <Tabs.Screen name="gallery" />
        <Tabs.Screen name="notes" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </>
  );
}
