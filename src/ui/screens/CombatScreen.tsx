import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatBar } from '@/ui/components/StatBar';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { ArtFrame } from '@/ui/components/ArtFrame';
import { colors, layout, radius, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { performAction } from '@/domain/combat/combatEngine';
import { combatDeps, resolveCombat } from '@/game/combatFlow';
import { currentActor, livingOf, type CombatLogEntry } from '@/domain/combat/combat';
import { STATUS_LABELS, skillManaCost } from '@/domain/skills/skill';
import { unlockedSkills } from '@/game/playerService';
import { inventoryEntries } from '@/domain/items/inventory';
import { markRoomCleared } from '@/game/dungeonFlow';
import { haptic } from '@/ui/components/haptics';

const TONE_COLORS: Record<CombatLogEntry['tone'], string> = {
  neutral: colors.textSecondary,
  damage: colors.hp,
  heal: colors.success,
  crit: colors.gold,
  status: colors.info,
  system: colors.textMuted,
  dodge: colors.textSecondary,
};

export function CombatScreen() {
  const { pop, replace } = useNavigation();
  const { state, mutate, bus } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [skillSheet, setSkillSheet] = useState(false);
  const [itemSheet, setItemSheet] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const skills = useMemo(() => (state ? unlockedSkills(state) : []), [state]);
  const potions = useMemo(
    () => (state ? inventoryEntries(state.player, state.items).filter((entry) => entry.item.consumableEffect) : []),
    [state],
  );

  const insets = useSafeAreaInsets();
  const combat = state?.combat ?? null;

  if (!state || !combat) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
        <AppText variant="heading">Nenhum combate ativo.</AppText>
        <Button label="Voltar" onPress={pop} />
      </View>
    );
  }

  const enemies = livingOf(combat, 'enemy');
  const hero = combat.combatants.hero!;
  const actor = currentActor(combat);
  const activeTarget = target && combat.combatants[target]?.hp ? target : enemies[0]?.id ?? null;
  const finished = combat.outcome !== 'ongoing';

  const act = (fn: Parameters<typeof performAction>[1]) => {
    mutate((draft) => {
      if (!draft.combat) return;
      const result = performAction(draft.combat, fn, combatDeps(draft));
      if (!result.ok && result.reason) setMessage(result.reason);
      else setMessage(null);
      if (draft.combat.outcome === 'victory') haptic('success');
      if (draft.combat.outcome === 'defeat') haptic('error');
    }, ['player', 'items', 'world']);
  };

  const finish = () => {
    mutate((draft) => {
      const wasDungeon = draft.combat?.dungeonId ?? null;
      const outcome = draft.combat?.outcome;
      const resolution = resolveCombat(draft, bus);
      if (wasDungeon && outcome === 'victory') markRoomCleared(draft, bus);
      if (resolution && resolution.outcome === 'victory') {
        replace('loot', {
          xp: resolution.xp,
          gold: resolution.gold,
          levels: resolution.levelsGained,
          itemIds: resolution.itemIds.join(','),
          fromDungeon: !!wasDungeon,
        });
      } else {
        replace(wasDungeon ? 'dungeon' : 'home');
      }
    }, ['player', 'items', 'world', 'memories', 'dungeons', 'chronicle', 'economy']);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: layout.screenGutter, paddingVertical: spacing.sm }}>
        <AppText variant="overline" color={colors.textMuted} uppercase>
          Combate · rodada {combat.round}
        </AppText>
        <AppText variant="title">{combat.encounterName}</AppText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: layout.screenGutter, gap: spacing.md, paddingBottom: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          {Object.values(combat.combatants)
            .filter((combatant) => combatant.side === 'enemy')
            .map((enemy) => (
              <Card
                key={enemy.id}
                padded={false}
                borderColor={activeTarget === enemy.id ? colors.gold : enemy.hp <= 0 ? colors.border : colors.borderStrong}
              >
                <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, opacity: enemy.hp <= 0 ? 0.4 : 1 }}>
                  <ArtFrame artKey={enemy.artKey} height={56} compact rounded="md" style={{ width: 56 }} />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {enemy.isBoss ? '☠ ' : ''}{enemy.name}
                      </AppText>
                      <AppText variant="caption" color={colors.textMuted}>Nv {enemy.level}</AppText>
                    </View>
                    <StatBar value={enemy.hp} max={enemy.maxHp} color={colors.hp} trackColor={colors.hpTrack} label="Vida" height={8} />
                    {enemy.statuses.length > 0 ? (
                      <AppText variant="caption" color={colors.info}>
                        {enemy.statuses.map((status) => `${STATUS_LABELS[status.kind]} (${status.remainingTurns})`).join(' · ')}
                      </AppText>
                    ) : null}
                  </View>
                  {enemy.hp > 0 && !finished ? (
                    <Button
                      label={activeTarget === enemy.id ? 'Alvo' : 'Mirar'}
                      compact
                      variant={activeTarget === enemy.id ? 'primary' : 'ghost'}
                      onPress={() => setTarget(enemy.id)}
                    />
                  ) : null}
                </View>
              </Card>
            ))}
        </View>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="bodyStrong">{hero.name}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {actor?.side === 'hero' ? 'seu turno' : 'aguarde'}
            </AppText>
          </View>
          <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
            <StatBar value={hero.hp} max={hero.maxHp} color={colors.hp} trackColor={colors.hpTrack} label="Vida" icon="♥" />
            <StatBar value={hero.mana} max={hero.maxMana} color={colors.mana} trackColor={colors.manaTrack} label="Mana" icon="✦" />
          </View>
          {hero.statuses.length > 0 ? (
            <AppText variant="caption" color={colors.info} style={{ marginTop: spacing.sm }}>
              {hero.statuses.map((status) => `${STATUS_LABELS[status.kind]} (${status.remainingTurns})`).join(' · ')}
            </AppText>
          ) : null}
        </Card>

        <Card>
          <AppText variant="overline" color={colors.textMuted} uppercase>Registro</AppText>
          <View style={{ gap: 2, marginTop: spacing.sm }}>
            {combat.log.slice(-9).map((entry) => (
              <AppText key={entry.id} variant="caption" color={TONE_COLORS[entry.tone]}>{entry.text}</AppText>
            ))}
          </View>
        </Card>

        {message ? <AppText variant="caption" color={colors.warning}>{message}</AppText> : null}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: layout.screenGutter,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          gap: spacing.sm,
        }}
      >
        {finished ? (
          <Button
            label={combat.outcome === 'victory' ? 'Recolher espólios' : combat.outcome === 'fled' ? 'Você fugiu' : 'Você caiu'}
            variant="primary"
            fullWidth
            onPress={finish}
          />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label="Atacar"
                variant="primary"
                style={{ flex: 1 }}
                disabled={!activeTarget}
                onPress={() => activeTarget && act({ kind: 'attack', targetId: activeTarget })}
              />
              <Button label="Habilidade" style={{ flex: 1 }} onPress={() => setSkillSheet(true)} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label="Item" variant="ghost" style={{ flex: 1 }} onPress={() => setItemSheet(true)} />
              <Button label="Defender" variant="ghost" style={{ flex: 1 }} onPress={() => act({ kind: 'defend' })} />
              <Button label="Fugir" variant="ghost" style={{ flex: 1 }} onPress={() => act({ kind: 'flee' })} />
            </View>
          </>
        )}
      </View>

      <BottomSheet visible={skillSheet} onClose={() => setSkillSheet(false)} title="Habilidades">
        {skills.length === 0 ? (
          <AppText variant="body" color={colors.textSecondary}>
            Nenhuma habilidade ativa desbloqueada. Gaste pontos na árvore de habilidades.
          </AppText>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {skills.map(({ node, rank }) => {
              const cost = skillManaCost(node, rank);
              const onCooldown = !!hero.cooldowns[node.id];
              return (
                <Button
                  key={node.id}
                  label={`${node.name} (r${rank}) · ${cost} mana${onCooldown ? ` · recarga ${hero.cooldowns[node.id]}` : ''}`}
                  variant={hero.mana >= cost && !onCooldown ? 'secondary' : 'ghost'}
                  disabled={hero.mana < cost || onCooldown}
                  fullWidth
                  onPress={() => {
                    act({ kind: 'skill', skillId: node.id, targetId: activeTarget ?? '' });
                    setSkillSheet(false);
                  }}
                />
              );
            })}
          </View>
        )}
      </BottomSheet>

      <BottomSheet visible={itemSheet} onClose={() => setItemSheet(false)} title="Consumíveis">
        {potions.length === 0 ? (
          <AppText variant="body" color={colors.textSecondary}>Nenhum consumível no inventário.</AppText>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {potions.map((entry) => (
              <Button
                key={entry.item.id}
                label={`${entry.item.name} ×${entry.item.quantity}`}
                variant="secondary"
                fullWidth
                onPress={() => {
                  act({ kind: 'item', itemId: entry.item.id });
                  setItemSheet(false);
                }}
              />
            ))}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}
