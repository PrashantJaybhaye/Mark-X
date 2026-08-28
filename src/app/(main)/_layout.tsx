import React from "react";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBar, TabKey } from "../../components/navigation/BottomTabBar";
import { safePickDocument } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleCenterAction = async () => {
    triggerHaptic();
    await safePickDocument();
  };

  return (
    <Tabs
      tabBar={(props) => {
        const currentRoute = props.state.routes[props.state.index].name as TabKey;
        return (
          <BottomTabBar
            activeTab={currentRoute}
            onTabChange={(tab) => {
              if (tab !== currentRoute) {
                router.replace(`/(main)/${tab}` as any);
              }
            }}
            onCenterActionPress={handleCenterAction}
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
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
