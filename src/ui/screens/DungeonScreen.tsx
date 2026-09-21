import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { ArtFrame } from '@/ui/components/ArtFrame';
import { EmptyState } from '@/ui/components/States';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { DUNGEON_KIND_LABELS, ROOM_KIND_LABELS, dungeonProgress } from '@/domain/world/dungeon';
import { availableExits, enterRoom, leaveDungeon } from '@/game/dungeonFlow';

export function DungeonScreen() {
  const { pop, push, replace } = useNavigation();
  const { state, mutate, bus } = useGame();
  const [message, setMessage] = useState<string | null>(null);
  if (!state) return null;

  const dungeon = state.activeDungeonId ? state.dungeons[state.activeDungeonId] : null;
  if (!dungeon) {
    return (
      <Screen title="Masmorra" onBack={pop}>
        <EmptyState
          title="Nenhuma masmorra ativa"
          description="Masmorras surgem como consequência do que acontece no mundo. Procure uma a partir da tela inicial."
        />
      </Screen>
    );
  }

  const room = dungeon.currentRoomId ? dungeon.rooms[dungeon.currentRoomId] : null;
  const exits = availableExits(state);
  const progress = dungeonProgress(dungeon);

  return (
    <Screen title="Masmorra" onBack={pop}>
      <ArtFrame
        artKey={dungeon.artKey}
        height={170}
        label={dungeon.name}
        sublabel={`${DUNGEON_KIND_LABELS[dungeon.kind]} · ${dungeon.floors} andares · nível ${dungeon.levelRange[0]}–${dungeon.levelRange[1]} · solo`}
      />

      <Card>
        <AppText variant="overline" color={colors.textMuted} uppercase>Por que ela existe</AppText>
        <AppText variant="body" color={colors.textSecondary}>{dungeon.narrativeContext}</AppText>
        <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Salas visitadas: {progress.visited}/{progress.total}
          {dungeon.cleared ? ' · limpa' : ''}
        </AppText>
      </Card>

      {room ? (
        <Card borderColor={room.kind === 'boss' ? colors.danger : colors.border}>
          <AppText variant="overline" color={colors.textMuted} uppercase>
            {ROOM_KIND_LABELS[room.kind]} · andar {room.floor}
          </AppText>
          <AppText variant="heading">{room.name}</AppText>
          <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {message ?? room.description}
          </AppText>
          {room.cleared ? (
            <AppText variant="caption" color={colors.success} style={{ marginTop: spacing.sm }}>Sala resolvida.</AppText>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">Passagens</AppText>
        {exits.length === 0 ? (
          <AppText variant="caption" color={colors.textMuted}>Sem saídas conhecidas daqui.</AppText>
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {exits.map((exit) => (
              <Button
                key={exit.id}
                label={`${ROOM_KIND_LABELS[exit.kind]}${exit.visited ? ' (visitada)' : ''} · andar ${exit.floor}`}
                variant={exit.kind === 'boss' ? 'danger' : 'secondary'}
                fullWidth
                onPress={() => {
                  mutate((draft) => {
                    const resolution = enterRoom(draft, exit.id, bus);
                    setMessage(resolution?.message ?? null);
                    if (resolution?.combatStarted) replace('combat');
                  }, ['dungeons', 'player', 'items', 'world', 'memories']);
                }}
              />
            ))}
          </View>
        )}
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label="Inventário" variant="ghost" style={{ flex: 1 }} onPress={() => push('inventory')} />
        <Button
          label="Sair da masmorra"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => {
            mutate((draft) => leaveDungeon(draft), ['dungeons']);
            pop();
          }}
        />
      </View>
    </Screen>
  );
}
