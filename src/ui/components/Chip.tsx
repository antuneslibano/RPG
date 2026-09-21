import { Pressable, View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { colors, radius, spacing } from '@/design/tokens';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: string;
  icon?: string;
}

export function Chip({ label, selected, onPress, tone, icon }: ChipProps) {
  const border = selected ? tone ?? colors.gold : colors.border;
  const text = selected ? tone ?? colors.gold : colors.textSecondary;
  const content = (
    <View
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: selected ? colors.surfaceRaised : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
      }}
    >
      {icon ? <AppText variant="caption" color={text}>{icon}</AppText> : null}
      <AppText variant="caption" color={text}>{label}</AppText>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
    >
      {content}
    </Pressable>
  );
}
