import type { SkillId } from '@/core/ids/ids';
import type { ItemStats } from '@/domain/items/affixes';

export type SkillKind = 'active' | 'passive' | 'modifier' | 'ultimate';

export type SkillTargeting = 'enemy' | 'allEnemies' | 'self';

export type StatusKind =
  | 'poison' | 'burn' | 'bleed' | 'stun' | 'slow' | 'weaken'
  | 'regen' | 'haste' | 'fortify' | 'focus' | 'thorns' | 'shield';

export const STATUS_LABELS: Record<StatusKind, string> = {
  poison: 'Veneno', burn: 'Queimadura', bleed: 'Sangramento', stun: 'Atordoado',
  slow: 'Lentidão', weaken: 'Enfraquecido', regen: 'Regeneração', haste: 'Celeridade',
  fortify: 'Fortificado', focus: 'Concentração', thorns: 'Espinhos', shield: 'Escudo',
};

export const HARMFUL_STATUSES: ReadonlySet<StatusKind> = new Set<StatusKind>([
  'poison', 'burn', 'bleed', 'stun', 'slow', 'weaken',
]);

export interface SkillEffect {
  /** Multiplier applied to the scaling stat. */
  power?: number;
  scaling?: 'physicalAttack' | 'magicAttack';
  heal?: number;
  shield?: number;
  status?: { kind: StatusKind; magnitude: number; turns: number; chance?: number };
  hits?: number;
}

export interface SkillNode {
  id: SkillId;
  name: string;
  branch: string;
  kind: SkillKind;
  description: string;
  maxRank: number;
  requiredLevel: number;
  requires: readonly { skillId: SkillId; rank: number }[];
  manaCost: number;
  cooldown: number;
  targeting: SkillTargeting;
  effect: SkillEffect;
  /** Passives and modifiers feed straight into derived stats. */
  passiveStats?: ItemStats;
  /** Per-rank increments. */
  perRank?: { power?: number; manaCost?: number; heal?: number; magnitude?: number; stats?: ItemStats };
  iconKey: string;
}

export interface SkillTree {
  classId: string;
  branches: readonly { id: string; name: string; description: string }[];
  nodes: readonly SkillNode[];
}

export function skillManaCost(node: SkillNode, rank: number): number {
  return Math.max(0, Math.round(node.manaCost + (node.perRank?.manaCost ?? 0) * Math.max(0, rank - 1)));
}

export function skillPower(node: SkillNode, rank: number): number {
  return (node.effect.power ?? 0) + (node.perRank?.power ?? 0) * Math.max(0, rank - 1);
}

export function skillHeal(node: SkillNode, rank: number): number {
  return (node.effect.heal ?? 0) + (node.perRank?.heal ?? 0) * Math.max(0, rank - 1);
}

export function skillStatusMagnitude(node: SkillNode, rank: number): number {
  return (node.effect.status?.magnitude ?? 0) + (node.perRank?.magnitude ?? 0) * Math.max(0, rank - 1);
}

export function canUnlock(
  node: SkillNode,
  ranks: Readonly<Record<SkillId, number>>,
  level: number,
  skillPoints: number,
): { ok: boolean; reason?: string } {
  const current = ranks[node.id] ?? 0;
  if (current >= node.maxRank) return { ok: false, reason: 'Rank máximo atingido.' };
  if (level < node.requiredLevel) return { ok: false, reason: `Requer nível ${node.requiredLevel}.` };
  if (skillPoints < 1) return { ok: false, reason: 'Sem pontos de habilidade.' };
  for (const req of node.requires) {
    if ((ranks[req.skillId] ?? 0) < req.rank) return { ok: false, reason: 'Pré-requisito não atendido.' };
  }
  return { ok: true };
}
