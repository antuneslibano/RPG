import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { ArtFrame } from '@/ui/components/ArtFrame';
import { HeroCard } from '@/ui/components/HeroCard';
import { ActionGrid, type GridAction } from '@/ui/components/ActionGrid';
import { Button } from '@/ui/components/Button';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { activeQuests, npcsAt } from '@/domain/world/gameState';
import { LOCATION_KIND_LABELS, regionLevelLabel } from '@/domain/world/world';
import { startRandomEncounter } from '@/game/combatFlow';
import { advanceDay } from '@/sim/simulation';
import { ensureDungeonAt, enterDungeon } from '@/game/dungeonFlow';
import { restorePlayer } from '@/game/playerService';

export function HomeScreen() {
  const { push, reset } = useNavigation();
  const { state, mutate, narrative, bus, saveGame } = useGame();
  const [restSheet, setRestSheet] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const location = state ? state.locations[state.player.currentLocationId] : null;
  const region = location && state ? state.regions[location.regionId] : null;
  const locationState = state ? state.locationStates[state.player.currentLocationId] : null;

  const mood = useMemo(
    () => (state && location ? narrative.describeLocationMood(state, location.id) : ''),
    [state, location, narrative],
  );

  if (!state || !location || !region) return null;

  const quests = activeQuests(state);
  const npcCount = npcsAt(state, location.id).length;
  const problems = locationState?.activeProblems.filter((problem) => !problem.resolved) ?? [];

  const actions: GridAction[] = [
    {
      id: 'adventure', label: 'Aventura', icon: '✦', highlighted: true,
      onPress: () => {
        mutate((draft) => {
          const combat = startRandomEncounter(draft, bus);
          if (!combat) setNotice('Nada acontece por aqui agora.');
        }, ['player', 'world']);
        push('combat');
      },
    },
    { id: 'character', label: 'Personagem', icon: '☗', onPress: () => push('character') },
    { id: 'map', label: 'Mapa', icon: '◈', onPress: () => push('worldMap') },
    { id: 'inventory', label: 'Inventário', icon: '⌂', onPress: () => push('inventory') },
    {
      id: 'skills', label: 'Habilidades', icon: '✹',
      badge: state.player.skillPoints > 0 ? state.player.skillPoints : 0,
      onPress: () => push('skills'),
    },
    { id: 'quests', label: 'Missões', icon: '✉', badge: quests.length, onPress: () => push('questJournal') },
    {
      id: 'city', label: location.kind === 'wilderness' ? 'Região' : 'Cidade', icon: '⛫',
      disabled: location.kind === 'wilderness',
      onPress: () => push('city'),
    },
    { id: 'npcs', label: 'Pessoas', icon: '☺', badge: npcCount, onPress: () => push('npcList') },
    { id: 'bestiary', label: 'Bestiário', icon: '☠', onPress: () => push('bestiary') },
    { id: 'chronicle', label: 'Crônica', icon: '❧', onPress: () => push('chronicle') },
    { id: 'factions', label: 'Facções', icon: '♛', onPress: () => push('factions') },
    { id: 'settings', label: 'Ajustes', icon: '⚙', onPress: () => push('settings') },
  ];

  return (
    <Screen title="RPG">
      <HeroCard state={state} />

      <ArtFrame
        artKey={location.artKey}
        height={200}
        label={location.name}
        sublabel={`${LOCATION_KIND_LABELS[location.kind]} · ${region.name} · ${regionLevelLabel(region)}`}
      />

      <Card>
        <AppText variant="overline" color={colors.textMuted} uppercase>Agora</AppText>
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>{mood}</AppText>
        {problems.length > 0 ? (
          <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
            {problems.slice(0, 2).map((problem) => (
              <AppText key={problem.id} variant="caption" color={colors.warning}>
                ⚠ {problem.summary} (gravidade {problem.severity})
              </AppText>
            ))}
          </View>
        ) : null}
        {notice ? <AppText variant="caption" color={colors.info} style={{ marginTop: spacing.sm }}>{notice}</AppText> : null}
      </Card>

      <ActionGrid actions={actions} />

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button
          label="Descansar"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => setRestSheet(true)}
        />
        <Button
          label="Masmorra"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => {
            mutate((draft) => {
              const dungeon = ensureDungeonAt(draft, bus);
              if (dungeon) enterDungeon(draft, dungeon.id, bus);
            }, ['dungeons', 'world', 'memories']);
            push('dungeon');
          }}
        />
      </View>

      <Button
        label="Salvar e sair para o menu"
        variant="ghost"
        fullWidth
        onPress={async () => {
          await saveGame();
          reset('mainMenu');
        }}
      />

      <BottomSheet
        visible={restSheet}
        onClose={() => setRestSheet(false)}
        title="Descansar até amanhã"
        footer={
          <Button
            label="Dormir"
            variant="primary"
            fullWidth
            onPress={() => {
              mutate((draft) => {
                advanceDay(draft, bus);
                restorePlayer(draft, 1);
              }, ['player', 'world', 'memories', 'npcs', 'dungeons']);
              setRestSheet(false);
              setNotice('Você dormiu. O mundo não parou.');
            }}
          />
        }
      >
        <AppText variant="body" color={colors.textSecondary}>
          Um dia passa. Vida e mana são restauradas, mas o mundo avança: facções se movem, rumores se
          espalham e problemas ignorados pioram.
        </AppText>
      </BottomSheet>
    </Screen>
  );
}
