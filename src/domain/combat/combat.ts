import type { ItemId, LocationId, SkillId } from '@/core/ids/ids';
import type { StatusKind } from '@/domain/skills/skill';

export type CombatSide = 'hero' | 'enemy';

export interface StatusEffect {
  id: string;
  kind: StatusKind;
  magnitude: number;
  remainingTurns: number;
  sourceId: string;
}

export interface Combatant {
  id: string;
  side: CombatSide;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  physicalAttack: number;
  magicAttack: number;
  defense: number;
  magicResist: number;
  critChance: number;
  critMultiplier: number;
  dodgeChance: number;
  speed: number;
  damageType: 'physical' | 'magic';
  statuses: StatusEffect[];
  /** Remaining cooldown per skill/ability id. */
  cooldowns: Record<string, number>;
  abilityIds: string[];
  skillRanks: Record<SkillId, number>;
  family: string | null;
  isBoss: boolean;
  phases: readonly { atHpRatio: number; announce: string; attackBonus: number }[];
  phasesTriggered: number;
  artKey: string;
  defending: boolean;
  shield: number;
}

export type CombatAction =
  | { kind: 'attack'; targetId: string }
  | { kind: 'skill'; skillId: SkillId; targetId: string }
  | { kind: 'item'; itemId: ItemId }
  | { kind: 'defend' }
  | { kind: 'flee' };

export type CombatOutcome = 'ongoing' | 'victory' | 'defeat' | 'fled';

export interface CombatLogEntry {
  id: string;
  round: number;
  actorId: string;
  text: string;
  tone: 'neutral' | 'damage' | 'heal' | 'crit' | 'status' | 'system' | 'dodge';
  amount?: number;
}

export interface CombatRewards {
  xp: number;
  gold: number;
  itemIds: ItemId[];
  creatureKills: { baseId: string; variantId: string | null; level: number }[];
}

export interface CombatState {
  id: string;
  seed: string;
  rngState: number;
  round: number;
  /** Index into `order`. */
  turnIndex: number;
  order: string[];
  combatants: Record<string, Combatant>;
  log: CombatLogEntry[];
  outcome: CombatOutcome;
  rewards: CombatRewards | null;
  locationId: LocationId;
  /** Set when this fight belongs to a dungeon room. */
  dungeonId: string | null;
  fleeAttempts: number;
  encounterName: string;
}

export function livingOf(state: CombatState, side: CombatSide): Combatant[] {
  return state.order
    .map((id) => state.combatants[id])
    .filter((c): c is Combatant => !!c && c.side === side && c.hp > 0);
}

export function currentActor(state: CombatState): Combatant | null {
  const id = state.order[state.turnIndex % Math.max(1, state.order.length)];
  return id ? state.combatants[id] ?? null : null;
}

export function isPlayerTurn(state: CombatState): boolean {
  const actor = currentActor(state);
  return !!actor && actor.side === 'hero' && actor.hp > 0 && state.outcome === 'ongoing';
}
