import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { colors, layout, opacity, radius, spacing } from '@/design/tokens';
import { haptic } from '@/ui/components/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const VARIANTS: Record<ButtonVariant, { bg: string; border: string; text: string }> = {
  primary: { bg: colors.goldSoft, border: colors.gold, text: colors.gold },
  secondary: { bg: colors.surfaceRaised, border: colors.borderStrong, text: colors.textPrimary },
  ghost: { bg: 'transparent', border: colors.border, text: colors.textSecondary },
  danger: { bg: '#2E1412', border: colors.danger, text: colors.danger },
};

export function Button({
  label, onPress, variant = 'secondary', disabled, loading, fullWidth, icon, compact, style, accessibilityHint,
}: ButtonProps) {
  const palette = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={() => {
        haptic('light');
        onPress();
      }}
      style={({ pressed }) => [
        {
          minHeight: compact ? 38 : layout.touchTarget,
          paddingHorizontal: compact ? spacing.md : spacing.lg,
          paddingVertical: compact ? spacing.sm : spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          alignSelf: fullWidth ? 'stretch' : 'auto',
          opacity: isDisabled ? opacity.disabled : pressed ? opacity.pressed : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {icon ? <AppText variant="caption" color={palette.text}>{icon}</AppText> : null}
          <AppText variant="bodyStrong" color={palette.text}>{label}</AppText>
        </View>
      )}
    </Pressable>
  );
}
