import React, { useEffect, useRef } from "react";
import { TouchableOpacity, Animated, StyleSheet, View } from "react-native";
import { triggerHaptic } from "../../utils/haptics";

interface IosSwitchProps {
  value: boolean;
  onValueChange?: (val: boolean) => void;
  disabled?: boolean;
  activeColor?: string;
  inactiveColor?: string;
  size?: "compact" | "medium";
}

export function IosSwitch({
  value,
  onValueChange,
  disabled = false,
  activeColor = "#111827",
  inactiveColor = "#E5E7EB",
  size = "compact",
}: IosSwitchProps) {
  const isMedium = size === "medium";
  const width = isMedium ? 48 : 44;
  const height = isMedium ? 26 : 24;
  const thumbSize = isMedium ? 22 : 20;
  const padding = 2;
  const travelDistance = width - thumbSize - padding * 2;

  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      friction: 9,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [value, anim]);

  const handleToggle = () => {
    if (disabled) return;
    triggerHaptic();
    onValueChange?.(!value);
  };

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travelDistance],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleToggle}
      disabled={disabled}
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <View
        style={[
          styles.track,
          {
            width,
            height,
            borderRadius: height / 2,
            backgroundColor: inactiveColor,
            padding,
          },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: activeColor,
              borderRadius: height / 2,
              opacity: anim,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              transform: [{ translateX }],
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    justifyContent: "center",
    overflow: "hidden",
  },
  thumb: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.18,
    shadowRadius: 2.5,
    elevation: 3,
  },
});
