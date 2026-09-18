import React, { useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { withLayoutContext } from "expo-router";
import {
  useNavigationBuilder,
  createNavigatorFactory,
} from "expo-router/build/react-navigation/core";
import { TabRouter, TabActions } from "expo-router/build/react-navigation/routers";

import { triggerSelectionHaptic } from "../../utils/haptics";

interface SwipeableTabViewProps {
  state: any;
  descriptors: any;
  navigation: any;
  tabBar?: (props: any) => React.ReactNode;
}

function SwipeableTabView({
  state,
  descriptors,
  navigation,
  tabBar,
}: SwipeableTabViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const isProgrammaticScroll = useRef(false);
  const programmaticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isProgrammaticScroll.current) return;
    const targetX = state.index * windowWidth;
    isProgrammaticScroll.current = true;
    scrollViewRef.current?.scrollTo({ x: targetX, animated: true });

    if (programmaticTimer.current) clearTimeout(programmaticTimer.current);
    programmaticTimer.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 350);

    return () => {
      if (programmaticTimer.current) clearTimeout(programmaticTimer.current);
    };
  }, [state.index, windowWidth]);

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    if (isProgrammaticScroll.current) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / windowWidth);

    if (
      newIndex >= 0 &&
      newIndex < state.routes.length &&
      newIndex !== state.index
    ) {
      triggerSelectionHaptic();
      const route = state.routes[newIndex];
      const navEvent = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!navEvent.defaultPrevented) {
        navigation.dispatch({
          ...TabActions.jumpTo(route.name),
          target: state.key,
        });
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        directionalLockEnabled
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {state.routes.map((route: any) => {
          const descriptor = descriptors[route.key];
          return (
            <View
              key={route.key}
              style={{ width: windowWidth, flex: 1 }}
              collapsable={false}
            >
              {descriptor.render()}
            </View>
          );
        })}
      </ScrollView>

      {tabBar ? tabBar({ state, descriptors, navigation }) : null}
    </View>
  );
}

function SwipeableTabNavigatorBase({
  id,
  initialRouteName,
  backBehavior,
  children,
  screenOptions,
  tabBar,
  ...rest
}: any) {
  const { state, descriptors, navigation, NavigationContent } =
    useNavigationBuilder(TabRouter, {
      id,
      initialRouteName,
      backBehavior,
      children,
      screenOptions,
      ...rest,
    });

  return (
    <NavigationContent>
      <SwipeableTabView
        state={state}
        descriptors={descriptors}
        navigation={navigation}
        tabBar={tabBar}
      />
    </NavigationContent>
  );
}

const navigator = createNavigatorFactory(SwipeableTabNavigatorBase)();

export const SwipeableTabs = withLayoutContext<any, any, any, any>(
  navigator.Navigator
);
