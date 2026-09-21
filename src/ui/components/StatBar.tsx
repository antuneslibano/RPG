import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { colors, radius, spacing } from '@/design/tokens';
import { useTheme } from '@/ui/components/ThemeProvider';
import { animated } from '@/design/theme';
import { percent } from '@/core/util/math';

export interface StatBarProps {
  value: number;
  max: number;
  color: string;
  trackColor: string;
  label?: string;
  /** Always shown as text too — colour alone never carries meaning. */
  showNumbers?: boolean;
  height?: number;
  icon?: string;
}

/** Animated fill bar used for HP, Mana, XP and energy. */
export function StatBar({ value, max, color, trackColor, label, showNumbers = true, height = 10, icon }: StatBarProps) {
  const theme = useTheme();
  const ratio = percent(value, max);
  const width = useRef(new Animated.Value(ratio)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: ratio,
      duration: animated(theme, theme.durations.normal),
      useNativeDriver: false,
    }).start();
  }, [ratio, theme, width]);

  const fill = width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View
      accessible
      accessibilityLabel={`${label ?? ''} ${Math.round(value)} de ${Math.round(max)}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
    >
      {icon ? <AppText variant="caption" color={color}>{icon}</AppText> : null}
      <View style={{ flex: 1, height, backgroundColor: trackColor, borderRadius: radius.pill, overflow: 'hidden' }}>
        <Animated.View style={{ width: fill, height: '100%', backgroundColor: color, borderRadius: radius.pill }} />
      </View>
      {showNumbers ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {Math.round(value)}/{Math.round(max)}
        </AppText>
      ) : null}
    </View>
  );
}
