import * as Haptics from "expo-haptics";

export async function triggerHaptic(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
): Promise<void> {
  await Haptics.impactAsync(style);
}

export async function triggerSelectionHaptic(): Promise<void> {
  await Haptics.selectionAsync();
}
