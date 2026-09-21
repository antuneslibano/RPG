import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/ui/components/Text';
import { useTheme } from '@/ui/components/ThemeProvider';
import { animated } from '@/design/theme';
import { colors, radius, shadows, spacing } from '@/design/tokens';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Touch-first replacement for hover tooltips and desktop modals. */
export function BottomSheet({ visible, onClose, title, children, footer }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const translate = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(translate, {
      toValue: visible ? 0 : 1,
      duration: animated(theme, theme.durations.fast),
      useNativeDriver: true,
    }).start();
  }, [visible, theme, translate]);

  const offset = translate.interpolate({ inputRange: [0, 1], outputRange: [0, 400] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel="Fechar" onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
      <Animated.View
        style={[
          {
            transform: [{ translateY: offset }],
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingBottom: insets.bottom + spacing.lg,
            maxHeight: '82%',
          },
          shadows.sheet,
        ]}
      >
        <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
          <View style={{ width: 40, height: 4, borderRadius: radius.pill, backgroundColor: colors.borderStrong }} />
        </View>
        <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
          <AppText variant="title">{title}</AppText>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>{footer}</View> : null}
      </Animated.View>
    </Modal>
  );
}
