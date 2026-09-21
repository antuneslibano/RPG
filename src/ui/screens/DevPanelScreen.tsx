import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { SeededRandom } from '@/core/rng/random';
import { grantXp } from '@/domain/player/progression';
import { generateItem } from '@/procgen/loot';
import { addItem } from '@/domain/items/inventory';
import { advanceDay } from '@/sim/simulation';
import { recordWorldEvent } from '@/narrative/eventService';
import { ensureDungeonAt } from '@/game/dungeonFlow';
import { generateNpc } from '@/procgen/npc';
import { refreshResources } from '@/game/playerService';
import { applyReputation } from '@/game/questFlow';
import { telemetry } from '@/shell/telemetry';
import { relationshipWith } from '@/narrative/memoryService';
import { describeRelationship, ATTITUDE_LABELS } from '@/domain/narrative/memory';
import { reachableFrom } from '@/game/travel';
import { travelTo } from '@/game/travel';

/** Hidden development panel. Indispensable while tuning generation and balance. */
export function DevPanelScreen() {
  const { pop } = useNavigation();
  const { state, mutate, bus } = useGame();
  const [tab, setTab] = useState<'actions' | 'world' | 'npcs' | 'telemetry'>('actions');
  const [log, setLog] = useState<string[]>([]);
  if (!state) return null;

  const note = (text: string) => setLog((current) => [text, ...current].slice(0, 12));
  const devRng = () => new SeededRandom(`${state.world.seed}:dev:${Date.now()}`, 'dev');

  return (
    <Screen title="Dev" onBack={pop}>
      <Card>
        <AppText variant="heading">Ferramentas de desenvolvimento</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Semente {state.world.seedLabel} · ano {state.world.gameYear}, dia {state.world.gameDay}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          {(['actions', 'world', 'npcs', 'telemetry'] as const).map((entry) => (
            <Chip key={entry} label={entry} selected={tab === entry} onPress={() => setTab(entry)} />
          ))}
        </View>
      </Card>

      {tab === 'actions' ? (
        <Card>
          <AppText variant="heading">Jogador</AppText>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button label="+200 XP" onPress={() => mutate((draft) => {
              const result = grantXp(draft.player, 200);
              refreshResources(draft);
              note(`+200 XP (níveis: ${result.levelsGained})`);
            }, ['player'])} />
            <Button label="+1 nível" onPress={() => mutate((draft) => {
              draft.player.level += 1;
              draft.player.attributePoints += 3;
              draft.player.skillPoints += 1;
              refreshResources(draft);
              note(`Nível ${draft.player.level}`);
            }, ['player'])} />
            <Button label="+1000 moedas" onPress={() => mutate((draft) => {
              draft.player.gold += 1000;
              note('+1000 moedas');
            }, ['player'])} />
            <Button label="Curar totalmente" onPress={() => mutate((draft) => {
              const stats = refreshResources(draft);
              draft.player.resources.hp = stats.maxHp;
              draft.player.resources.mana = stats.maxMana;
              note('Recursos restaurados');
            }, ['player'])} />
            <Button label="Gerar item (nível do herói)" onPress={() => mutate((draft) => {
              const item = generateItem(devRng(), {
                itemLevel: draft.player.level + 2,
                luck: draft.player.attributes.luck,
                classHint: draft.player.classId,
              });
              addItem(draft.player, draft.items, item);
              note(`Item: ${item.name} (${item.rarity})`);
            }, ['player', 'items'])} />
            <Button label="Gerar item lendário" onPress={() => mutate((draft) => {
              const item = generateItem(devRng(), {
                itemLevel: draft.player.level + 6,
                luck: 40,
                minRarity: 'legendary',
                classHint: draft.player.classId,
              });
              addItem(draft.player, draft.items, item);
              note(`Lendário: ${item.name}`);
            }, ['player', 'items'])} />
            <Button label="+10 reputação global" onPress={() => mutate((draft) => {
              applyReputation(draft, { scope: 'global', targetId: null, amount: 10 }, bus);
              note(`Reputação global: ${draft.player.reputation.global}`);
            }, ['player'])} />
          </View>
        </Card>
      ) : null}

      {tab === 'world' ? (
        <Card>
          <AppText variant="heading">Mundo</AppText>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button label="Avançar 1 dia" onPress={() => mutate((draft) => {
              const report = advanceDay(draft, bus);
              note(`Dia ${report.gameDay}: ${report.director.eventsCreated} evento(s), ${report.rumorsSpread} rumor(es)`);
            }, ['world', 'npcs', 'memories', 'dungeons', 'economy'])} />
            <Button label="Avançar 7 dias" onPress={() => mutate((draft) => {
              let events = 0;
              for (let i = 0; i < 7; i++) events += advanceDay(draft, bus).director.eventsCreated;
              note(`7 dias passaram, ${events} evento(s)`);
            }, ['world', 'npcs', 'memories', 'dungeons', 'economy'])} />
            <Button label="Disparar WorldEvent" onPress={() => mutate((draft) => {
              const event = recordWorldEvent(draft, {
                type: 'settlementRaided',
                cause: 'dev',
                consequences: ['teste'],
                importance: 65,
                summary: 'Evento de teste disparado pelo painel de desenvolvimento.',
                tags: ['dev'],
                memory: { memoryType: 'witnessed', emotionalWeight: 10, trustImpact: 0, fearImpact: 12, respectImpact: 0 },
              }, bus);
              note(`Evento ${event.id}`);
            }, ['world', 'memories', 'chronicle'])} />
            <Button label="Gerar masmorra aqui" onPress={() => mutate((draft) => {
              const dungeon = ensureDungeonAt(draft, bus);
              note(dungeon ? `${dungeon.name} (${Object.keys(dungeon.rooms).length} salas)` : 'falhou');
            }, ['dungeons', 'world'])} />
            <Button label="Teleportar (vizinho aleatório)" onPress={() => mutate((draft) => {
              const options = reachableFrom(draft, draft.player.currentLocationId);
              const target = options[0];
              if (target) {
                travelTo(draft, target.id, bus);
                note(`Viajou para ${target.name}`);
              }
            }, ['player', 'world', 'npcs', 'memories'])} />
          </View>
          <AppText variant="overline" color={colors.textMuted} uppercase style={{ marginTop: spacing.lg }}>
            WorldState
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {Object.keys(state.locations).length} locais · {Object.keys(state.regions).length} regiões ·
            {' '}{Object.keys(state.dungeons).length} masmorras · {Object.keys(state.quests).length} missões
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {state.events.length} eventos · {state.rumors.length} rumores · {state.chronicle.length} crônicas
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Fingerprints recentes: {state.world.recentFingerprints.length}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Escassez: {Object.entries(state.economy.scarcityByCategory).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · ') || '—'}
          </AppText>
        </Card>
      ) : null}

      {tab === 'npcs' ? (
        <Card>
          <AppText variant="heading">NPCs e memória</AppText>
          <Button
            label="Gerar NPC aqui"
            style={{ marginTop: spacing.md }}
            onPress={() => mutate((draft) => {
              const npc = generateNpc(devRng(), { homeLocationId: draft.player.currentLocationId });
              draft.npcs[npc.id] = npc;
              draft.locations[draft.player.currentLocationId]?.npcIds.push(npc.id);
              note(`NPC: ${npc.name}`);
            }, ['npcs', 'world'])}
          />
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            {Object.values(state.npcs)
              .filter((npc) => (state.memories[npc.id]?.length ?? 0) > 0)
              .slice(0, 8)
              .map((npc) => {
                const relationship = relationshipWith(state, npc.id);
                const { attitude, score } = describeRelationship(relationship);
                return (
                  <View key={npc.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
                    <AppText variant="bodyStrong">{npc.name}</AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      {ATTITUDE_LABELS[attitude]} ({score}) · confiança {relationship.trust} · medo {relationship.fear} ·
                      {' '}respeito {relationship.respect} · gratidão {relationship.gratitude} · hostilidade {relationship.hostility}
                    </AppText>
                    {(state.memories[npc.id] ?? []).slice(0, 3).map((memory) => (
                      <AppText key={memory.id} variant="caption" color={colors.textSecondary}>
                        · [{memory.tier}] {memory.summary}
                      </AppText>
                    ))}
                  </View>
                );
              })}
          </View>
        </Card>
      ) : null}

      {tab === 'telemetry' ? (
        <Card>
          <AppText variant="heading">Telemetria local</AppText>
          {telemetry.recent(20).map((entry, index) => (
            <AppText key={`${entry.at}_${index}`} variant="caption" color={entry.kind === 'error' ? colors.danger : colors.textSecondary}>
              [{entry.kind}] {entry.message} {entry.data ? JSON.stringify(entry.data) : ''}
            </AppText>
          ))}
        </Card>
      ) : null}

      {log.length > 0 ? (
        <Card>
          <AppText variant="overline" color={colors.textMuted} uppercase>Saída</AppText>
          {log.map((entry, index) => (
            <AppText key={index} variant="caption" color={colors.info}>{entry}</AppText>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
