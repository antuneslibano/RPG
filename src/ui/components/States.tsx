import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Button } from '@/ui/components/Button';
import { colors, spacing } from '@/design/tokens';

export function LoadingState({ message = 'Carregando…' }: { message?: string }) {
  return (
    <View accessible accessibilityLabel={message} style={{ padding: spacing.xxl, alignItems: 'center', gap: spacing.md }}>
      <ActivityIndicator color={colors.gold} />
      <AppText variant="caption" color={colors.textSecondary}>{message}</AppText>
    </View>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
      <AppText variant="heading" color={colors.textSecondary} align="center">{title}</AppText>
      {description ? (
        <AppText variant="body" color={colors.textMuted} align="center">{description}</AppText>
      ) : null}
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ title, description, onRetry }: { title: string; description?: string; onRetry?: () => void }) {
  return (
    <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
      <AppText variant="heading" color={colors.danger} align="center">{title}</AppText>
      {description ? <AppText variant="body" color={colors.textSecondary} align="center">{description}</AppText> : null}
      {onRetry ? <Button label="Tentar novamente" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}
