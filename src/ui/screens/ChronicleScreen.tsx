import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { EmptyState } from '@/ui/components/States';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { chronicleByYear } from '@/narrative/chronicleService';

export function ChronicleScreen() {
  const { pop } = useNavigation();
  const { state } = useGame();
  if (!state) return null;

  const years = chronicleByYear(state);

  return (
    <Screen title="Crônica" onBack={pop}>
      <Card>
        <AppText variant="heading">A história deste save</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Semente {state.world.seedLabel} · {state.chronicle.length} registro(s) ·
          {' '}{state.player.stats.enemiesDefeated} inimigos · {state.player.stats.questsCompleted} missões ·
          {' '}{state.player.stats.dungeonsCleared} masmorras
        </AppText>
      </Card>

      {years.length === 0 ? (
        <EmptyState title="Nada aconteceu ainda" description="A crônica se preenche conforme o mundo reage a você." />
      ) : (
        years.map((group) => (
          <Card key={group.year}>
            <AppText variant="overline" color={colors.gold} uppercase>Ano {group.year}</AppText>
            <View style={{ marginTop: spacing.md, gap: spacing.md }}>
              {group.entries.map((entry) => (
                <View
                  key={entry.id}
                  style={{ borderLeftWidth: 2, borderLeftColor: entry.importance >= 60 ? colors.gold : colors.border, paddingLeft: spacing.md }}
                >
                  <AppText variant="caption" color={colors.textMuted} uppercase>
                    Dia {entry.gameDay} · {entry.title}
                  </AppText>
                  <AppText variant="body" color={colors.textSecondary}>{entry.text}</AppText>
                </View>
              ))}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
