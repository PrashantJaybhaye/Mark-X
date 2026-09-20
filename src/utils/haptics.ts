import * as Haptics from "expo-haptics";

/**
 * Triggers light/medium/heavy haptic feedback with platform vibration fallback.
 */
export async function triggerHaptic(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
): Promise<void> {
  await Haptics.impactAsync(style);
}

/**
 * Triggers an ultra-crisp, subtle selection tick (ideal for tab swipes and pickers).
 */
export async function triggerSelectionHaptic(): Promise<void> {
  await Haptics.selectionAsync();
}
