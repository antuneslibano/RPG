import { clamp, safeInt } from '@/core/util/math';
import { BALANCE, xpForNextLevel } from '@/domain/player/balance';
import type { Player } from '@/domain/player/player';
import { ATTRIBUTE_KEYS, type AttributeKey } from '@/domain/player/attributes';
import type { SkillNode } from '@/domain/skills/skill';
import { canUnlock } from '@/domain/skills/skill';

export interface LevelUpResult {
  levelsGained: number;
  newLevel: number;
  attributePointsGained: number;
  skillPointsGained: number;
}

/**
 * Applies XP and resolves every level threshold crossed. Mutates the player
 * (callers own the copy) and reports what happened so the UI can celebrate it.
 */
export function grantXp(player: Player, amount: number): LevelUpResult {
  const gain = Math.max(0, safeInt(amount));
  player.xp += gain;

  let levelsGained = 0;
  while (player.level < BALANCE.maxLevel) {
    const needed = xpForNextLevel(player.level);
    if (!Number.isFinite(needed) || player.xp < needed) break;
    player.xp -= needed;
    player.level += 1;
    levelsGained += 1;
  }
  if (player.level >= BALANCE.maxLevel) player.xp = 0;

  const attributePointsGained = levelsGained * BALANCE.pointsPerLevel.attribute;
  const skillPointsGained = levelsGained * BALANCE.pointsPerLevel.skill;
  player.attributePoints += attributePointsGained;
  player.skillPoints += skillPointsGained;

  return { levelsGained, newLevel: player.level, attributePointsGained, skillPointsGained };
}

export function xpProgress(player: Player): { current: number; needed: number; ratio: number } {
  const needed = xpForNextLevel(player.level);
  if (!Number.isFinite(needed)) return { current: 0, needed: 0, ratio: 1 };
  return { current: player.xp, needed, ratio: clamp(player.xp / needed, 0, 1) };
}

export function spendAttributePoint(player: Player, attribute: AttributeKey): boolean {
  if (player.attributePoints < 1) return false;
  if (!ATTRIBUTE_KEYS.includes(attribute)) return false;
  player.attributePoints -= 1;
  player.attributes[attribute] += 1;
  return true;
}

export function spendSkillPoint(player: Player, node: SkillNode): { ok: boolean; reason?: string; rank: number } {
  const check = canUnlock(node, player.skillRanks, player.level, player.skillPoints);
  if (!check.ok) return { ok: false, reason: check.reason, rank: player.skillRanks[node.id] ?? 0 };
  player.skillPoints -= 1;
  const rank = (player.skillRanks[node.id] ?? 0) + 1;
  player.skillRanks[node.id] = rank;
  return { ok: true, rank };
}
