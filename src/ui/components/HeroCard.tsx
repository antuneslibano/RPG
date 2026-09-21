import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { StatBar } from '@/ui/components/StatBar';
import { ArtFrame } from '@/ui/components/ArtFrame';
import { colors, spacing } from '@/design/tokens';
import { CLASS_BY_ID } from '@/data/classes';
import { xpProgress } from '@/domain/player/progression';
import type { GameState } from '@/domain/world/gameState';
import { playerStats } from '@/game/playerService';
import { formatGold } from '@/core/util/text';

function StatPill({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <AppText variant="caption" color={colors.textMuted}>{icon}</AppText>
      <AppText variant="caption" color={colors.textPrimary}>{value}</AppText>
    </View>
  );
}

/** Persistent hero summary shown at the top of the main screens. */
export function HeroCard({ state, compact }: { state: GameState; compact?: boolean }) {
  const stats = playerStats(state);
  const heroClass = CLASS_BY_ID[state.player.classId];
  const xp = xpProgress(state.player);

  return (
    <Card raised padded={false}>
      <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md }}>
        <ArtFrame
          artKey={state.player.portraitKey}
          height={compact ? 72 : 96}
          rounded="md"
          compact
          borderColor={colors.gold}
          style={{ width: compact ? 72 : 96 }}
        />

        <View style={{ flex: 1, gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="title" color={colors.gold} numberOfLines={1}>{state.player.name}</AppText>
            <AppText variant="caption" color={colors.textMuted} uppercase>
              Nv. {state.player.level} · {heroClass.name}
            </AppText>
          </View>

          <StatBar value={state.player.resources.hp} max={stats.maxHp} color={colors.hp} trackColor={colors.hpTrack} label="Vida" icon="♥" />
          <StatBar value={state.player.resources.mana} max={stats.maxMana} color={colors.mana} trackColor={colors.manaTrack} label="Mana" icon="✦" />
          <StatBar
            value={xp.current}
            max={Math.max(1, xp.needed)}
            color={colors.xp}
            trackColor={colors.xpTrack}
            label="Experiência"
            icon="✧"
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs }}>
            <StatPill icon="⚔" label="Ataque" value={Math.max(stats.physicalAttack, stats.magicAttack)} />
            <StatPill icon="⛨" label="Defesa" value={stats.defense} />
            <StatPill icon="✧" label="Resistência mágica" value={stats.magicResist} />
            <StatPill icon="◈" label="Crítico" value={`${stats.critChance}%`} />
            <StatPill icon="➤" label="Velocidade" value={stats.speed} />
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surfaceSunken,
        }}
      >
        <StatPill icon="◉" label="Moedas" value={formatGold(state.player.gold)} />
        <StatPill icon="☼" label="Dia" value={`Ano ${state.world.gameYear} · Dia ${state.world.gameDay}`} />
        {state.player.skillPoints > 0 ? (
          <AppText variant="caption" color={colors.gold}>+{state.player.skillPoints} ponto(s)</AppText>
        ) : (
          <StatPill icon="✦" label="Semente" value={state.world.seedLabel} />
        )}
      </View>
    </Card>
  );
}
