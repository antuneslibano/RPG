import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/ui/components/Text';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { ArtFrame } from '@/ui/components/ArtFrame';
import { colors, layout, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';

export function MainMenuScreen() {
  const { push, reset } = useNavigation();
  const { slots, loadGame, busy, lastError, refreshSlots } = useGame();
  const insets = useSafeAreaInsets();
  const latest = slots[0];

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingHorizontal: layout.screenGutter, gap: spacing.lg }}>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <AppText variant="display" color={colors.gold}>RPG</AppText>
        <AppText variant="caption" color={colors.textMuted} uppercase>fantasia medieval · single player</AppText>
      </View>

      <ArtFrame artKey="art.kingdom.default" height={190} label="Um reino à sua espera" sublabel="Cada semente gera um mundo diferente" />

      {latest ? (
        <Card>
          <AppText variant="overline" color={colors.textMuted} uppercase>Continuar</AppText>
          <AppText variant="heading">{latest.heroName} · Nv. {latest.level} {latest.className}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {latest.locationName} · Ano {latest.gameYear}, dia {latest.gameDay} · semente {latest.seedLabel}
          </AppText>
        </Card>
      ) : null}

      {lastError ? <AppText variant="caption" color={colors.warning}>{lastError}</AppText> : null}

      <View style={{ gap: spacing.md }}>
        {latest ? (
          <Button
            label="Continuar"
            variant="primary"
            fullWidth
            loading={busy}
            onPress={async () => {
              const ok = await loadGame(latest.slotId);
              if (ok) reset('home');
            }}
          />
        ) : null}
        <Button label="Novo jogo" variant={latest ? 'secondary' : 'primary'} fullWidth onPress={() => push('newGame')} />
        <Button label="Saves" variant="ghost" fullWidth onPress={() => push('saveLoad')} />
        <Button label="Ajustes" variant="ghost" fullWidth onPress={() => push('settings')} />
      </View>
    </View>
  );
}
