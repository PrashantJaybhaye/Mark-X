import React from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBar, TabKey } from "../../components/navigation/BottomTabBar";
import { SwipeableTabs } from "../../components/navigation/SwipeableTabNavigator";

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
      <SwipeableTabs
        tabBar={renderTabBar}
        screenOptions={{
          headerShown: false,
        }}
      >
        <SwipeableTabs.Screen name="home" />
        <SwipeableTabs.Screen name="drive" />
        <SwipeableTabs.Screen name="gallery" />
        <SwipeableTabs.Screen name="notes" />
        <SwipeableTabs.Screen name="profile" />
      </SwipeableTabs>
    </>
  );
}
