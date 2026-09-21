import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { StatBar } from '@/ui/components/StatBar';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { reputationTier } from '@/domain/faction/faction';
import { npcFullName } from '@/domain/npc/npc';

export function FactionsScreen() {
  const { pop } = useNavigation();
  const { state } = useGame();
  if (!state) return null;

  return (
    <Screen title="Facções" onBack={pop}>
      <Card>
        <AppText variant="heading">Reputação em camadas</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Global {state.player.reputation.global}. Uma pessoa pode gostar de você enquanto a facção dela te odeia.
        </AppText>
      </Card>

      {Object.values(state.factions).map((faction) => {
        const factionState = state.factionStates[faction.id];
        const value = factionState?.reputationWithPlayer ?? 0;
        const tier = reputationTier(value);
        const leader = faction.leaderNpcId ? state.npcs[faction.leaderNpcId] : null;
        const enemies = (factionState?.enemyIds ?? []).map((id) => state.factions[id]?.name).filter(Boolean);
        return (
          <Card key={faction.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="bodyStrong">{faction.name}</AppText>
              <AppText variant="caption" color={value >= 20 ? colors.success : value <= -20 ? colors.danger : colors.textMuted}>
                {tier.label} ({value})
              </AppText>
            </View>
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>{faction.description}</AppText>
            <View style={{ marginTop: spacing.md }}>
              <StatBar
                value={value + 100}
                max={200}
                color={value >= 0 ? colors.success : colors.danger}
                trackColor={colors.border}
                label="Reputação"
                showNumbers={false}
                height={8}
              />
            </View>
            {leader ? (
              <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
                Liderança: {npcFullName(leader)}
              </AppText>
            ) : null}
            {enemies.length > 0 ? (
              <AppText variant="caption" color={colors.warning}>Em conflito com: {enemies.join(', ')}</AppText>
            ) : null}
            <AppText variant="caption" color={colors.textMuted}>
              Influência {factionState?.influence ?? 0} · recursos {factionState?.resources ?? 0}
            </AppText>
          </Card>
        );
      })}
    </Screen>
  );
}
