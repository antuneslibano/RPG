import { SeededRandom } from '@/core/rng/random';
import { clamp } from '@/core/util/math';
import { BALANCE, mitigate } from '@/domain/player/balance';
import { HARMFUL_STATUSES, STATUS_LABELS, type SkillNode, type StatusKind, skillHeal, skillManaCost, skillPower, skillStatusMagnitude } from '@/domain/skills/skill';
import type { CreatureAbility } from '@/domain/combat/creature';
import type { CombatAction, CombatLogEntry, CombatState, Combatant } from '@/domain/combat/combat';
import { currentActor, livingOf } from '@/domain/combat/combat';
import type { ConsumableEffect } from '@/domain/items/item';

export interface CombatDeps {
  /** Resolves a hero skill id to its node (class tree lookup). */
  getSkill: (skillId: string) => SkillNode | null;
  /** Resolves a creature ability id. */
  getAbility: (abilityId: string) => CreatureAbility | null;
  /** Consumable use during combat. */
  getConsumable: (itemId: string) => ConsumableEffect | null;
  onItemConsumed?: (itemId: string) => void;
}

let logCounter = 0;
function log(state: CombatState, actorId: string, text: string, tone: CombatLogEntry['tone'], amount?: number): void {
  logCounter += 1;
  state.log.push({ id: `log_${state.round}_${logCounter}`, round: state.round, actorId, text, tone, amount });
  if (state.log.length > 200) state.log.shift();
}

function rngOf(state: CombatState): SeededRandom {
  const rng = new SeededRandom(state.seed, 'combat');
  rng.setState(state.rngState);
  return rng;
}

function commitRng(state: CombatState, rng: SeededRandom): void {
  state.rngState = rng.getState();
}

function statusMagnitude(combatant: Combatant, kind: StatusKind): number {
  return combatant.statuses.filter((s) => s.kind === kind).reduce((sum, s) => sum + s.magnitude, 0);
}

function effectiveAttack(combatant: Combatant, type: 'physical' | 'magic'): number {
  const base = type === 'physical' ? combatant.physicalAttack : combatant.magicAttack;
  const weaken = statusMagnitude(combatant, 'weaken');
  const focus = statusMagnitude(combatant, 'focus');
  return Math.max(1, base * (1 - weaken / 100) * (1 + focus / 100));
}

function effectiveDefense(combatant: Combatant, type: 'physical' | 'magic'): number {
  const base = type === 'physical' ? combatant.defense : combatant.magicResist;
  const fortify = statusMagnitude(combatant, 'fortify');
  const guard = combatant.defending ? 45 : 0;
  return Math.max(0, base * (1 + (fortify + guard) / 100));
}

function effectiveSpeed(combatant: Combatant): number {
  return Math.max(1, combatant.speed + statusMagnitude(combatant, 'haste') - statusMagnitude(combatant, 'slow'));
}

export function applyStatus(target: Combatant, kind: StatusKind, magnitude: number, turns: number, sourceId: string): void {
  const existing = target.statuses.find((s) => s.kind === kind && s.sourceId === sourceId);
  if (existing) {
    existing.magnitude = Math.max(existing.magnitude, magnitude);
    existing.remainingTurns = Math.max(existing.remainingTurns, turns);
    return;
  }
  target.statuses.push({ id: `st_${kind}_${sourceId}_${target.statuses.length}`, kind, magnitude, remainingTurns: turns, sourceId });
}

function dealDamage(state: CombatState, attacker: Combatant, target: Combatant, raw: number, type: 'physical' | 'magic', rng: SeededRandom, label: string): number {
  if (rng.next() * 100 < target.dodgeChance) {
    log(state, attacker.id, `${target.name} esquivou de ${label}.`, 'dodge');
    return 0;
  }
  const crit = rng.next() * 100 < attacker.critChance;
  const multiplier = crit ? attacker.critMultiplier : 1;
  let damage = mitigate(raw * multiplier, effectiveDefense(target, type));

  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, damage);
    target.shield -= absorbed;
    damage -= absorbed;
    if (absorbed > 0) log(state, target.id, `Escudo absorveu ${absorbed} de dano.`, 'status', absorbed);
  }

  target.hp = Math.max(0, target.hp - damage);
  log(state, attacker.id, `${attacker.name} usa ${label} em ${target.name}: ${damage}${crit ? ' (CRÍTICO)' : ''}.`, crit ? 'crit' : 'damage', damage);

  const thorns = statusMagnitude(target, 'thorns');
  if (thorns > 0 && damage > 0) {
    const reflected = Math.max(1, Math.round((damage * thorns) / 100));
    attacker.hp = Math.max(0, attacker.hp - reflected);
    log(state, target.id, `Espinhos refletem ${reflected} de dano.`, 'damage', reflected);
  }
  if (target.isBoss && target.hp > 0) checkBossPhase(state, target);
  if (target.hp === 0) log(state, target.id, `${target.name} foi derrotado.`, 'system');
  return damage;
}

function heal(state: CombatState, target: Combatant, amount: number, reason: string): void {
  const healed = Math.min(target.maxHp - target.hp, Math.max(0, Math.round(amount)));
  target.hp += healed;
  if (healed > 0) log(state, target.id, `${target.name} recupera ${healed} de vida (${reason}).`, 'heal', healed);
}

/** Ticks DOTs/HOTs and expires statuses at the start of a combatant's turn. */
function tickStatuses(state: CombatState, combatant: Combatant): void {
  for (const status of [...combatant.statuses]) {
    switch (status.kind) {
      case 'poison':
      case 'burn':
      case 'bleed': {
        const damage = Math.max(1, Math.round(status.magnitude));
        combatant.hp = Math.max(0, combatant.hp - damage);
        log(state, combatant.id, `${combatant.name} sofre ${damage} de ${STATUS_LABELS[status.kind]}.`, 'damage', damage);
        break;
      }
      case 'regen':
        heal(state, combatant, status.magnitude, STATUS_LABELS.regen);
        break;
      default:
        break;
    }
    status.remainingTurns -= 1;
  }
  combatant.statuses = combatant.statuses.filter((status) => status.remainingTurns > 0);
  if (combatant.shield > 0 && !combatant.statuses.some((s) => s.kind === 'shield')) combatant.shield = 0;
  for (const key of Object.keys(combatant.cooldowns)) {
    const next = (combatant.cooldowns[key] ?? 0) - 1;
    if (next <= 0) delete combatant.cooldowns[key];
    else combatant.cooldowns[key] = next;
  }
}

/** Announces and applies every boss phase whose HP threshold has been crossed. */
function checkBossPhase(state: CombatState, combatant: Combatant): void {
  const ratio = combatant.hp / Math.max(1, combatant.maxHp);
  while (combatant.phasesTriggered < combatant.phases.length) {
    const phase = combatant.phases[combatant.phasesTriggered];
    if (!phase || ratio > phase.atHpRatio) break;
    combatant.phasesTriggered += 1;
    combatant.physicalAttack = Math.round(combatant.physicalAttack * (1 + phase.attackBonus));
    combatant.magicAttack = Math.round(combatant.magicAttack * (1 + phase.attackBonus));
    log(state, combatant.id, phase.announce, 'system');
  }
}

function resolveOutcome(state: CombatState): void {
  if (livingOf(state, 'hero').length === 0) state.outcome = 'defeat';
  else if (livingOf(state, 'enemy').length === 0) state.outcome = 'victory';
}

function advanceTurn(state: CombatState): void {
  if (state.outcome !== 'ongoing') return;
  const living = state.order.filter((id) => (state.combatants[id]?.hp ?? 0) > 0);
  if (living.length === 0) return;
  for (let i = 0; i < state.order.length + 1; i++) {
    state.turnIndex += 1;
    if (state.turnIndex >= state.order.length) {
      state.turnIndex = 0;
      state.round += 1;
      reorderBySpeed(state);
    }
    const actor = currentActor(state);
    if (actor && actor.hp > 0) return;
  }
}

function reorderBySpeed(state: CombatState): void {
  state.order = [...state.order].sort((a, b) => {
    const ca = state.combatants[a];
    const cb = state.combatants[b];
    if (!ca || !cb) return 0;
    return effectiveSpeed(cb) - effectiveSpeed(ca) || ca.name.localeCompare(cb.name);
  });
}

export function startCombat(state: CombatState): CombatState {
  reorderBySpeed(state);
  state.turnIndex = 0;
  log(state, 'system', `${state.encounterName} — o combate começa.`, 'system');
  return runUntilPlayerTurn(state, null);
}

/** Runs enemy turns until it is the hero's turn again (or the fight ends). */
export function runUntilPlayerTurn(state: CombatState, deps: CombatDeps | null): CombatState {
  let guard = 0;
  while (state.outcome === 'ongoing' && guard < 60) {
    guard += 1;
    const actor = currentActor(state);
    if (!actor) break;
    if (actor.side === 'hero') {
      if (actor.hp <= 0) {
        advanceTurn(state);
        continue;
      }
      startOfTurn(state, actor);
      resolveOutcome(state);
      if (state.outcome !== 'ongoing') break;
      if (actor.statuses.some((s) => s.kind === 'stun')) {
        log(state, actor.id, `${actor.name} está atordoado e perde o turno.`, 'status');
        advanceTurn(state);
        continue;
      }
      return state;
    }
    takeEnemyTurn(state, actor, deps);
    resolveOutcome(state);
    if (state.outcome !== 'ongoing') advanceTurnSafe(state);
    else advanceTurn(state);
  }
  return state;
}

function advanceTurnSafe(state: CombatState): void {
  if (state.outcome === 'ongoing') advanceTurn(state);
}

function startOfTurn(state: CombatState, actor: Combatant): void {
  actor.defending = false;
  tickStatuses(state, actor);
}

function takeEnemyTurn(state: CombatState, actor: Combatant, deps: CombatDeps | null): void {
  startOfTurn(state, actor);
  if (actor.hp <= 0) return;
  if (actor.statuses.some((s) => s.kind === 'stun')) {
    log(state, actor.id, `${actor.name} está atordoado.`, 'status');
    return;
  }

  const rng = rngOf(state);
  const heroes = livingOf(state, 'hero');
  const target = heroes[0];
  if (!target) {
    commitRng(state, rng);
    return;
  }

  // Boss phase transitions are announced once, when the threshold is crossed.
  if (actor.isBoss) checkBossPhase(state, actor);

  const abilities = actor.abilityIds
    .map((id) => deps?.getAbility(id) ?? null)
    .filter((ability): ability is CreatureAbility => !!ability)
    .filter((ability) => !actor.cooldowns[ability.id])
    .filter((ability) => ability.belowHpRatio === undefined || actor.hp / actor.maxHp <= ability.belowHpRatio);

  const ability = abilities.length > 0 && rng.bool(0.55) ? rng.pick(abilities) : null;

  if (!ability) {
    dealDamage(state, actor, target, effectiveAttack(actor, actor.damageType), actor.damageType, rng, 'Ataque');
    commitRng(state, rng);
    return;
  }

  actor.cooldowns[ability.id] = ability.cooldown;
  if (ability.targeting === 'self') {
    if (ability.heal) heal(state, actor, ability.heal, ability.name);
    if (ability.status) applyStatus(actor, ability.status.kind, ability.status.magnitude, ability.status.turns, actor.id);
    log(state, actor.id, `${actor.name} usa ${ability.name}.`, 'status');
    commitRng(state, rng);
    return;
  }

  if (ability.power > 0) {
    dealDamage(state, actor, target, effectiveAttack(actor, actor.damageType) * ability.power, actor.damageType, rng, ability.name);
  }
  if (ability.heal) heal(state, actor, ability.heal, ability.name);
  if (ability.status && rng.next() < ability.status.chance) {
    applyStatus(target, ability.status.kind, ability.status.magnitude, ability.status.turns, actor.id);
    log(state, actor.id, `${target.name} recebe ${STATUS_LABELS[ability.status.kind]}.`, 'status');
  }
  commitRng(state, rng);
}

export interface ActionResult {
  state: CombatState;
  ok: boolean;
  reason?: string;
}

export function performAction(state: CombatState, action: CombatAction, deps: CombatDeps): ActionResult {
  const actor = currentActor(state);
  if (!actor || actor.side !== 'hero' || state.outcome !== 'ongoing') {
    return { state, ok: false, reason: 'Não é o seu turno.' };
  }
  const rng = rngOf(state);

  switch (action.kind) {
    case 'attack': {
      const target = state.combatants[action.targetId];
      if (!target || target.hp <= 0) return { state, ok: false, reason: 'Alvo inválido.' };
      dealDamage(state, actor, target, effectiveAttack(actor, actor.damageType), actor.damageType, rng, 'Ataque');
      break;
    }
    case 'skill': {
      const node = deps.getSkill(action.skillId);
      if (!node) return { state, ok: false, reason: 'Habilidade desconhecida.' };
      const rank = actor.skillRanks[node.id] ?? 0;
      if (rank < 1) return { state, ok: false, reason: 'Habilidade não desbloqueada.' };
      if (actor.cooldowns[node.id]) return { state, ok: false, reason: 'Habilidade em recarga.' };
      const cost = skillManaCost(node, rank);
      if (actor.mana < cost) return { state, ok: false, reason: 'Mana insuficiente.' };

      actor.mana -= cost;
      if (node.cooldown > 0) actor.cooldowns[node.id] = node.cooldown + 1;

      const scaling = node.effect.scaling ?? 'magicAttack';
      const power = skillPower(node, rank);
      const targets =
        node.targeting === 'allEnemies' ? livingOf(state, 'enemy')
        : node.targeting === 'self' ? [actor]
        : [state.combatants[action.targetId]].filter((c): c is Combatant => !!c && c.hp > 0);

      if (targets.length === 0) return { state, ok: false, reason: 'Alvo inválido.' };

      for (const target of targets) {
        if (power > 0 && node.targeting !== 'self') {
          const hits = node.effect.hits ?? 1;
          for (let i = 0; i < hits; i++) {
            dealDamage(state, actor, target, effectiveAttack(actor, scaling === 'physicalAttack' ? 'physical' : 'magic') * power, scaling === 'physicalAttack' ? 'physical' : 'magic', rng, node.name);
          }
        }
        if (node.effect.status) {
          const chance = node.effect.status.chance ?? 1;
          const statusTarget = HARMFUL_STATUSES.has(node.effect.status.kind) ? target : actor;
          if (rng.next() < chance) {
            applyStatus(statusTarget, node.effect.status.kind, skillStatusMagnitude(node, rank), node.effect.status.turns, actor.id);
            log(state, actor.id, `${statusTarget.name}: ${STATUS_LABELS[node.effect.status.kind]}.`, 'status');
          }
        }
      }
      const healAmount = skillHeal(node, rank);
      if (healAmount > 0) heal(state, actor, healAmount, node.name);
      if (node.effect.shield) {
        actor.shield += node.effect.shield;
        applyStatus(actor, 'shield', node.effect.shield, node.effect.status?.turns ?? 3, actor.id);
        log(state, actor.id, `${actor.name} ergue um escudo de ${node.effect.shield}.`, 'status');
      }
      break;
    }
    case 'item': {
      const effect = deps.getConsumable(action.itemId);
      if (!effect) return { state, ok: false, reason: 'Item não utilizável.' };
      if (effect.kind === 'heal') heal(state, actor, effect.amount, 'poção');
      if (effect.kind === 'mana') {
        const restored = Math.min(actor.maxMana - actor.mana, effect.amount);
        actor.mana += restored;
        log(state, actor.id, `${actor.name} recupera ${restored} de mana.`, 'heal', restored);
      }
      if (effect.kind === 'cleanse') {
        actor.statuses = actor.statuses.filter((status) => !HARMFUL_STATUSES.has(status.kind));
        log(state, actor.id, `${actor.name} se purifica.`, 'status');
      }
      deps.onItemConsumed?.(action.itemId);
      break;
    }
    case 'defend': {
      actor.defending = true;
      const restored = Math.min(actor.maxMana - actor.mana, Math.round(actor.maxMana * 0.08) + 2);
      actor.mana += restored;
      log(state, actor.id, `${actor.name} assume postura defensiva.`, 'status');
      break;
    }
    case 'flee': {
      state.fleeAttempts += 1;
      const enemies = livingOf(state, 'enemy');
      const bossPresent = enemies.some((enemy) => enemy.isBoss);
      const chance = bossPresent ? 0 : clamp(0.42 + actor.speed / 200 + state.fleeAttempts * 0.12, 0, 0.92);
      if (rng.next() < chance) {
        state.outcome = 'fled';
        log(state, actor.id, 'Você escapa do combate.', 'system');
        commitRng(state, rng);
        return { state, ok: true };
      }
      log(state, actor.id, bossPresent ? 'Não há para onde fugir.' : 'A fuga falhou.', 'system');
      break;
    }
  }

  commitRng(state, rng);
  resolveOutcome(state);
  if (state.outcome === 'ongoing') {
    advanceTurn(state);
    runUntilPlayerTurn(state, deps);
    resolveOutcome(state);
  }
  return { state, ok: true };
}

/** XP/gold from the enemies defeated; item drops are rolled by the loot generator. */
export function computeBaseRewards(levels: readonly number[]): { xp: number; gold: number } {
  let xp = 0;
  let gold = 0;
  for (const level of levels) {
    xp += Math.round(BALANCE.enemy.xpBase + BALANCE.enemy.xpPerLevel * level);
    gold += Math.round(BALANCE.enemy.goldBase + BALANCE.enemy.goldPerLevel * level);
  }
  return { xp, gold };
}
