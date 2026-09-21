import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/ui/components/Text';
import { colors, layout, spacing } from '@/design/tokens';

export interface ScreenProps {
  title: string;
  children: ReactNode;
  onBack?: () => void;
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}

/** Portrait-first page frame: safe areas, notch, gutters and a back affordance. */
export function Screen({ title, children, onBack, scroll = true, header, footer }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const body = (
    <View style={{ paddingHorizontal: layout.screenGutter, gap: layout.cardGap, paddingBottom: spacing.xxl }}>
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {header}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: layout.screenGutter,
          paddingVertical: spacing.md,
        }}
      >
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={onBack}
            hitSlop={12}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <AppText variant="bodyStrong" color={colors.textSecondary}>← Voltar</AppText>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
        <AppText variant="overline" color={colors.textMuted} uppercase>{title}</AppText>
      </View>

      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}

      {footer ? <View style={{ paddingBottom: insets.bottom }}>{footer}</View> : null}
    </View>
  );
}
