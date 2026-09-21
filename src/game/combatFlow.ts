import { SeededRandom } from '@/core/rng/random';
import type { EventBus } from '@/core/events/eventBus';
import type { GameState } from '@/domain/world/gameState';
import type { CombatState, Combatant } from '@/domain/combat/combat';
import { startCombat } from '@/domain/combat/combatEngine';
import type { CombatDeps } from '@/domain/combat/combatEngine';
import type { CreatureInstance } from '@/domain/combat/creature';
import { generateBossEncounter, generateEncounter, type Encounter } from '@/procgen/encounter';
import { CREATURE_BASE_BY_ID } from '@/data/creatures';
import { playerStats, refreshResources, skillById } from '@/game/playerService';
import { grantXp } from '@/domain/player/progression';
import { generateItem } from '@/procgen/loot';
import { addItem, removeItem } from '@/domain/items/inventory';
import { recordWorldEvent } from '@/narrative/eventService';
import { progressObjectives } from '@/game/questFlow';

export function combatDeps(state: GameState): CombatDeps {
  return {
    getSkill: (skillId) => skillById(state, skillId),
    getAbility: (abilityId) => {
      for (const base of Object.values(CREATURE_BASE_BY_ID)) {
        const ability = base.abilities.find((entry) => entry.id === abilityId);
        if (ability) return ability;
      }
      return null;
    },
    getConsumable: (itemId) => state.items[itemId]?.consumableEffect ?? null,
    onItemConsumed: (itemId) => {
      removeItem(state.player, state.items, itemId, 1);
    },
  };
}

function heroCombatant(state: GameState): Combatant {
  const stats = playerStats(state);
  return {
    id: 'hero',
    side: 'hero',
    name: state.player.name,
    level: state.player.level,
    hp: Math.max(1, state.player.resources.hp),
    maxHp: stats.maxHp,
    mana: state.player.resources.mana,
    maxMana: stats.maxMana,
    physicalAttack: stats.physicalAttack,
    magicAttack: stats.magicAttack,
    defense: stats.defense,
    magicResist: stats.magicResist,
    critChance: stats.critChance,
    critMultiplier: stats.critMultiplier,
    dodgeChance: stats.dodgeChance,
    speed: stats.speed,
    damageType: state.player.classId === 'mage' || state.player.classId === 'druid' || state.player.classId === 'cleric' ? 'magic' : 'physical',
    statuses: [],
    cooldowns: {},
    abilityIds: [],
    skillRanks: { ...state.player.skillRanks },
    family: null,
    isBoss: false,
    phases: [],
    phasesTriggered: 0,
    artKey: state.player.portraitKey,
    defending: false,
    shield: 0,
  };
}

function enemyCombatant(creature: CreatureInstance): Combatant {
  return {
    id: creature.instanceId,
    side: 'enemy',
    name: creature.name,
    level: creature.level,
    hp: creature.maxHp,
    maxHp: creature.maxHp,
    mana: 0,
    maxMana: 0,
    physicalAttack: creature.attack,
    magicAttack: creature.attack,
    defense: creature.defense,
    magicResist: creature.magicResist,
    critChance: creature.critChance,
    critMultiplier: 1.6,
    dodgeChance: 3,
    speed: creature.speed,
    damageType: creature.damageType,
    statuses: [],
    cooldowns: {},
    abilityIds: creature.abilities.map((ability) => ability.id),
    skillRanks: {},
    family: creature.family,
    isBoss: creature.isBoss,
    phases: creature.phases,
    phasesTriggered: 0,
    artKey: creature.artKey,
    defending: false,
    shield: 0,
  };
}

function buildCombatState(state: GameState, encounter: Encounter, dungeonId: string | null): CombatState {
  const combatants: Record<string, Combatant> = {};
  const hero = heroCombatant(state);
  combatants[hero.id] = hero;
  for (const creature of encounter.creatures) {
    const combatant = enemyCombatant(creature);
    combatants[combatant.id] = combatant;
  }
  return {
    id: encounter.id,
    seed: `${state.world.seed}:${encounter.id}`,
    rngState: 0,
    round: 1,
    turnIndex: 0,
    order: Object.keys(combatants),
    combatants,
    log: [],
    outcome: 'ongoing',
    rewards: null,
    locationId: state.player.currentLocationId,
    dungeonId,
    fleeAttempts: 0,
    encounterName: encounter.name,
  };
}

/** Stores the rolled creatures so rewards/bestiary can reference them later. */
const encounterCache = new Map<string, CreatureInstance[]>();

export function startRandomEncounter(state: GameState, bus?: EventBus): CombatState | null {
  const location = state.locations[state.player.currentLocationId];
  const region = location ? state.regions[location.regionId] : undefined;
  const locationState = state.locationStates[state.player.currentLocationId];
  if (!location || !region || !locationState) return null;

  const rng = new SeededRandom(`${state.world.seed}:encounter:${state.world.gameDay}:${state.events.length}`, 'encounter');
  const encounter = generateEncounter(rng, {
    biome: region.biome,
    playerLevel: state.player.level,
    regionLevelRange: region.levelRange,
    dangerLevel: locationState.danger,
    recentBaseIds: Object.keys(state.bestiary).slice(-3),
  });

  encounterCache.set(encounter.id, encounter.creatures);
  const combat = buildCombatState(state, encounter, null);
  state.combat = startCombat(combat);
  bus?.emit('COMBAT_STARTED', { encounterId: encounter.id, locationId: location.id });
  return state.combat;
}

export function startBossEncounter(state: GameState, bossBaseId: string, level: number, dungeonId: string, bus?: EventBus): CombatState {
  const rng = new SeededRandom(`${state.world.seed}:boss:${dungeonId}:${bossBaseId}`, 'encounter');
  const encounter = generateBossEncounter(rng, bossBaseId, level);
  encounterCache.set(encounter.id, encounter.creatures);
  const combat = buildCombatState(state, encounter, dungeonId);
  state.combat = startCombat(combat);
  bus?.emit('COMBAT_STARTED', { encounterId: encounter.id, locationId: state.player.currentLocationId });
  return state.combat;
}

export function startCreatureEncounter(state: GameState, creatures: CreatureInstance[], name: string, dungeonId: string | null, bus?: EventBus): CombatState {
  const encounter: Encounter = { id: `enc_${name}_${state.events.length}`, name, creatures, isBossFight: false };
  encounterCache.set(encounter.id, creatures);
  const combat = buildCombatState(state, encounter, dungeonId);
  state.combat = startCombat(combat);
  bus?.emit('COMBAT_STARTED', { encounterId: encounter.id, locationId: state.player.currentLocationId });
  return state.combat;
}

export interface CombatResolution {
  outcome: CombatState['outcome'];
  xp: number;
  gold: number;
  itemIds: string[];
  levelsGained: number;
  bossDefeated: string | null;
}

/** Applies the aftermath of a finished fight to the world. */
export function resolveCombat(state: GameState, bus?: EventBus): CombatResolution | null {
  const combat = state.combat;
  if (!combat || combat.outcome === 'ongoing') return null;

  const hero = combat.combatants.hero;
  if (hero) {
    state.player.resources.hp = Math.max(1, hero.hp);
    state.player.resources.mana = hero.mana;
  }

  const creatures = encounterCache.get(combat.id) ?? [];
  const resolution: CombatResolution = {
    outcome: combat.outcome,
    xp: 0, gold: 0, itemIds: [], levelsGained: 0, bossDefeated: null,
  };

  if (combat.outcome !== 'victory') {
    if (combat.outcome === 'defeat') {
      state.player.resources.hp = 1;
      recordWorldEvent(state, {
        type: 'discovery',
        cause: 'derrota em combate',
        consequences: ['você acordou depois, mais pobre e mais devagar'],
        importance: 34,
        summary: `Você foi derrotado por ${combat.encounterName} e perdeu parte das moedas.`,
        tags: ['combat', 'defeat'],
      }, bus);
      state.player.gold = Math.round(state.player.gold * 0.85);
    }
    bus?.emit('COMBAT_ENDED', { encounterId: combat.id, victory: false, xp: 0, gold: 0 });
    state.combat = null;
    encounterCache.delete(combat.id);
    return resolution;
  }

  const rng = new SeededRandom(`${state.world.seed}:rewards:${combat.id}`, 'loot');
  let xp = 0;
  let gold = 0;

  for (const creature of creatures) {
    xp += creature.xpReward;
    gold += creature.goldReward;
    state.player.stats.enemiesDefeated += 1;

    const entry = state.bestiary[creature.baseId] ?? {
      baseId: creature.baseId,
      variantsSeen: [],
      killCount: 0,
      firstSeenDay: state.world.gameDay,
      highestLevelSeen: creature.level,
    };
    entry.killCount += 1;
    entry.highestLevelSeen = Math.max(entry.highestLevelSeen, creature.level);
    if (creature.variantId && !entry.variantsSeen.includes(creature.variantId)) entry.variantsSeen.push(creature.variantId);
    state.bestiary[creature.baseId] = entry;

    bus?.emit('CREATURE_KILLED', { creatureBaseId: creature.baseId, variant: creature.variantId ?? 'base', level: creature.level });
    progressObjectives(state, { kind: 'kill', targetRef: creature.baseId }, bus);

    if (creature.isBoss) {
      resolution.bossDefeated = creature.baseId;
      if (combat.dungeonId) bus?.emit('BOSS_DEFEATED', { dungeonId: combat.dungeonId, bossBaseId: creature.baseId });
    }
  }

  const topLevel = creatures.reduce((max, creature) => Math.max(max, creature.level), 1);
  const dropCount = resolution.bossDefeated ? 3 : rng.int(0, 2);
  for (let i = 0; i < dropCount; i++) {
    const item = generateItem(rng, {
      itemLevel: topLevel,
      luck: state.player.attributes.luck,
      ...(resolution.bossDefeated ? { minRarity: 'rare' as const } : {}),
      classHint: state.player.classId,
    });
    resolution.itemIds.push(addItem(state.player, state.items, item));
    bus?.emit('ITEM_ACQUIRED', { itemId: item.id, source: 'combat' });
  }

  const levelUp = grantXp(state.player, xp);
  state.player.gold += gold;
  refreshResources(state);

  resolution.xp = xp;
  resolution.gold = gold;
  resolution.levelsGained = levelUp.levelsGained;

  if (levelUp.levelsGained > 0) {
    bus?.emit('PLAYER_LEVEL_UP', {
      level: levelUp.newLevel,
      attributePoints: levelUp.attributePointsGained,
      skillPoints: levelUp.skillPointsGained,
    });
  }

  if (resolution.bossDefeated) {
    recordWorldEvent(state, {
      type: 'bossSlain',
      cause: 'incursão em masmorra',
      consequences: ['a ameaça recuou na região'],
      importance: 78,
      summary: `Você derrotou ${combat.encounterName}.`,
      tags: ['combat', 'boss'],
      memory: { memoryType: 'witnessed', emotionalWeight: 18, trustImpact: 6, fearImpact: 12, respectImpact: 24, permanent: true },
    }, bus);
  }

  bus?.emit('COMBAT_ENDED', { encounterId: combat.id, victory: true, xp, gold });
  state.combat = null;
  encounterCache.delete(combat.id);
  return resolution;
}
