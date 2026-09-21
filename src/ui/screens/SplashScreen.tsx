import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useTheme } from '@/ui/components/ThemeProvider';
import { animated } from '@/design/theme';

export function SplashScreen() {
  const { replace } = useNavigation();
  const theme = useTheme();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: animated(theme, theme.durations.slow),
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => replace('mainMenu'), theme.reduceAnimations ? 200 : 1100);
    return () => clearTimeout(timer);
  }, [fade, replace, theme]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
      <Animated.View style={{ opacity: fade, alignItems: 'center', gap: spacing.sm }}>
        <AppText variant="display" color={colors.gold}>RPG</AppText>
        <View style={{ width: 64, height: 1, backgroundColor: colors.borderStrong }} />
        <AppText variant="caption" color={colors.textMuted} uppercase>um mundo que lembra</AppText>
      </Animated.View>
    </View>
  );
}
