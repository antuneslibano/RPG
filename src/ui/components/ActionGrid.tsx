import { Pressable, View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { colors, layout, radius, spacing } from '@/design/tokens';
import { haptic } from '@/ui/components/haptics';

export interface GridAction {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  badge?: number;
  highlighted?: boolean;
  disabled?: boolean;
}

/** Three-column action grid: large touch targets, no desktop density. */
export function ActionGrid({ actions }: { actions: GridAction[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: layout.cardGap }}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ disabled: !!action.disabled }}
          disabled={action.disabled}
          onPress={() => {
            haptic('light');
            action.onPress();
          }}
          style={({ pressed }) => ({
            width: `${(100 - 8) / 3}%`,
            minHeight: 84,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: action.highlighted ? colors.gold : colors.border,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            opacity: action.disabled ? 0.4 : pressed ? 0.75 : 1,
          })}
        >
          <AppText variant="title" color={action.highlighted ? colors.gold : colors.textSecondary}>{action.icon}</AppText>
          <AppText variant="caption" color={colors.textSecondary} align="center">{action.label}</AppText>
          {action.badge ? (
            <View
              style={{
                position: 'absolute', top: spacing.sm, right: spacing.sm,
                minWidth: 18, height: 18, borderRadius: radius.pill,
                backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 4,
              }}
            >
              <AppText variant="caption" color={colors.textInverse}>{action.badge}</AppText>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
