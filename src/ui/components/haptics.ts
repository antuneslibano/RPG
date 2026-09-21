import * as Haptics from 'expo-haptics';

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/** Fire-and-forget: haptics are a nicety and must never break an interaction. */
export function haptic(kind: HapticKind): void {
  if (!enabled) return;
  try {
    switch (kind) {
      case 'light': void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
      case 'medium': void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
      case 'heavy': void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); break;
      case 'success': void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case 'warning': void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break;
      case 'error': void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break;
    }
  } catch {
    // Device without haptics support — ignore.
  }
}
