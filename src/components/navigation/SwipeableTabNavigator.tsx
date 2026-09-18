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
  const swipedToIndex = useRef<number | null>(null);

  useEffect(() => {
    // If navigation change was initiated by swipe gesture, ScrollView is already in position
    if (swipedToIndex.current === state.index) {
      swipedToIndex.current = null;
      return;
    }
    swipedToIndex.current = null;

    const targetX = state.index * windowWidth;
    // Jump directly without animating linearly across intermediate pages (Instagram-style)
    scrollViewRef.current?.scrollTo({ x: targetX, animated: false });
  }, [state.index, windowWidth]);

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / windowWidth);

    if (
      newIndex >= 0 &&
      newIndex < state.routes.length &&
      newIndex !== state.index
    ) {
      swipedToIndex.current = newIndex;
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
      } else {
        swipedToIndex.current = null;
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
