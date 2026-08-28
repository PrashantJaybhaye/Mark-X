import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";

/**
 * Triggers light/medium/heavy haptic feedback with platform vibration fallback.
 */
export async function triggerHaptic(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
): Promise<void> {
  try {
    await Haptics.impactAsync(style);
  } catch {
    Vibration.vibrate(Platform.OS === "android" ? 15 : 10);
  }
}
