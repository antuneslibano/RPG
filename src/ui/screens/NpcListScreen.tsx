import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { EmptyState } from '@/ui/components/States';
import { Button } from '@/ui/components/Button';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { npcsAt } from '@/domain/world/gameState';
import { npcFullName } from '@/domain/npc/npc';
import { OCCUPATION_BY_ID } from '@/data/npcContent';
import { relationshipWith } from '@/narrative/memoryService';
import { ATTITUDE_LABELS, describeRelationship } from '@/domain/narrative/memory';

export function NpcListScreen() {
  const { pop, push } = useNavigation();
  const { state } = useGame();
  if (!state) return null;

  const people = npcsAt(state, state.player.currentLocationId);
  const location = state.locations[state.player.currentLocationId]!;

  return (
    <Screen title="Pessoas" onBack={pop}>
      <Card>
        <AppText variant="heading">{location.name}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {people.length} pessoa(s) por perto. Cada uma lembra do que você fez.
        </AppText>
      </Card>

      {people.length === 0 ? (
        <EmptyState title="Ninguém por aqui" description="Regiões selvagens raramente têm moradores." />
      ) : (
        people.map((npc) => {
          const relationship = relationshipWith(state, npc.id);
          const { attitude } = describeRelationship(relationship);
          const memories = state.memories[npc.id]?.length ?? 0;
          return (
            <Card key={npc.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{npcFullName(npc)}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {OCCUPATION_BY_ID[npc.occupationId]?.name ?? 'morador'} · {npc.age} anos
                    {npc.importance === 'major' ? ' · figura importante' : ''}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
                    Atitude: {ATTITUDE_LABELS[attitude]} · {memories} lembrança(s) sobre você
                  </AppText>
                </View>
                <Button label="Falar" compact variant="secondary" onPress={() => push('dialogue', { npcId: npc.id })} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
