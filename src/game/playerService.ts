import type { GameState } from '@/domain/world/gameState';
import type { Player } from '@/domain/player/player';
import { computeDerivedStats, type DerivedStats, type FlatBonuses } from '@/domain/player/stats';
import { addStats, type ItemStats } from '@/domain/items/affixes';
import { equippedItems } from '@/domain/items/inventory';
import { SKILL_TREES } from '@/data/classes';
import type { SkillNode } from '@/domain/skills/skill';

/** Passive and modifier nodes feed straight into derived stats, scaled by rank. */
export function skillPassiveBonuses(player: Player): ItemStats {
  const tree = SKILL_TREES[player.classId];
  let out: ItemStats = {};
  for (const node of tree.nodes) {
    const rank = player.skillRanks[node.id] ?? 0;
    if (rank < 1 || !node.passiveStats) continue;
    const perRank = node.perRank?.stats;
    for (const [key, value] of Object.entries(node.passiveStats)) {
      const base = value ?? 0;
      const extra = (perRank?.[key as keyof ItemStats] ?? 0) * (rank - 1);
      out = addStats(out, { [key]: base + extra });
    }
  }
  return out;
}

export function playerStats(state: GameState): DerivedStats {
  return computeDerivedStats({
    level: state.player.level,
    attributes: state.player.attributes,
    equipment: equippedItems(state.player, state.items),
    bonuses: skillPassiveBonuses(state.player) as FlatBonuses,
  });
}

/** Clamps current HP/mana into the recomputed maxima after gear or level changes. */
export function refreshResources(state: GameState): DerivedStats {
  const stats = playerStats(state);
  state.player.resources.hp = Math.min(state.player.resources.hp, stats.maxHp);
  state.player.resources.mana = Math.min(state.player.resources.mana, stats.maxMana);
  if (state.player.resources.hp <= 0) state.player.resources.hp = 1;
  return stats;
}

export function restorePlayer(state: GameState, ratio = 1): void {
  const stats = playerStats(state);
  state.player.resources.hp = Math.min(stats.maxHp, Math.round(stats.maxHp * ratio));
  state.player.resources.mana = Math.min(stats.maxMana, Math.round(stats.maxMana * ratio));
}

export function unlockedSkills(state: GameState): { node: SkillNode; rank: number }[] {
  const tree = SKILL_TREES[state.player.classId];
  return tree.nodes
    .filter((node) => (state.player.skillRanks[node.id] ?? 0) > 0 && node.kind !== 'passive')
    .map((node) => ({ node, rank: state.player.skillRanks[node.id] ?? 0 }));
}

export function skillById(state: GameState, skillId: string): SkillNode | null {
  return SKILL_TREES[state.player.classId].nodes.find((node) => node.id === skillId) ?? null;
}
