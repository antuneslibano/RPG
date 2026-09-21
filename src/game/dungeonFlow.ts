import { SeededRandom } from '@/core/rng/random';
import type { EventBus } from '@/core/events/eventBus';
import type { DungeonId, RoomId } from '@/core/ids/ids';
import type { GameState } from '@/domain/world/gameState';
import type { Dungeon, DungeonRoom } from '@/domain/world/dungeon';
import { generateDungeon } from '@/procgen/dungeon';
import { buildCreature } from '@/procgen/encounter';
import { CREATURE_BASES } from '@/data/creatures';
import { startBossEncounter, startCreatureEncounter } from '@/game/combatFlow';
import { generateItem } from '@/procgen/loot';
import { addItem } from '@/domain/items/inventory';
import { recordWorldEvent } from '@/narrative/eventService';
import { progressObjectives } from '@/game/questFlow';
import { playerStats, restorePlayer } from '@/game/playerService';

/** Creates a dungeon tied to the current location's story, if none exists yet. */
export function ensureDungeonAt(state: GameState, bus?: EventBus): Dungeon | null {
  const location = state.locations[state.player.currentLocationId];
  const region = location ? state.regions[location.regionId] : undefined;
  if (!location || !region) return null;

  const existing = location.dungeonIds.map((id) => state.dungeons[id]).find((dungeon) => dungeon && !dungeon.cleared);
  if (existing) return existing;

  const locationState = state.locationStates[location.id];
  const problem = locationState?.activeProblems.find((entry) => !entry.resolved);
  const context = problem
    ? `${problem.summary} A passagem se abriu logo depois disso.`
    : `Algo que aconteceu em ${region.name} abriu caminho para baixo.`;

  const rng = new SeededRandom(`${state.world.seed}:dungeon:${location.id}:${state.world.gameDay}`, 'dungeon');
  const dungeon = generateDungeon(rng, {
    regionId: region.id,
    locationId: location.id,
    biome: region.biome,
    levelRange: region.levelRange,
    narrativeContext: context,
    sourceEventId: problem?.sourceEventId ?? null,
    discoveredDay: state.world.gameDay,
  });
  state.dungeons[dungeon.id] = dungeon;
  location.dungeonIds.push(dungeon.id);

  recordWorldEvent(state, {
    type: 'dungeonAppeared',
    locationId: location.id,
    cause: context,
    consequences: ['uma nova incursão solo é possível'],
    importance: 48,
    summary: `${dungeon.name} foi encontrada perto de ${location.name}.`,
    tags: ['dungeon'],
  }, bus);

  return dungeon;
}

export function enterDungeon(state: GameState, dungeonId: DungeonId, bus?: EventBus): DungeonRoom | null {
  const dungeon = state.dungeons[dungeonId];
  if (!dungeon) return null;
  state.activeDungeonId = dungeonId;
  dungeon.currentRoomId = dungeon.entranceRoomId;
  const entrance = dungeon.rooms[dungeon.entranceRoomId];
  if (entrance) entrance.visited = true;
  bus?.emit('DUNGEON_ENTERED', { dungeonId });
  return entrance ?? null;
}

export function leaveDungeon(state: GameState): void {
  state.activeDungeonId = null;
}

export interface RoomResolution {
  room: DungeonRoom;
  kind: DungeonRoom['kind'];
  /** Set when the room opened a fight; the UI must go to the combat screen. */
  combatStarted: boolean;
  trapDamage: number;
  lootItemIds: string[];
  message: string;
}

/** Moves into a connected room and resolves whatever is in it. Solo only. */
export function enterRoom(state: GameState, roomId: RoomId, bus?: EventBus): RoomResolution | null {
  const dungeon = state.activeDungeonId ? state.dungeons[state.activeDungeonId] : null;
  const room = dungeon?.rooms[roomId];
  if (!dungeon || !room) return null;

  const current = dungeon.currentRoomId ? dungeon.rooms[dungeon.currentRoomId] : null;
  if (current && current.id !== room.id && !current.exits.includes(room.id)) return null;

  dungeon.currentRoomId = room.id;
  const firstVisit = !room.visited;
  room.visited = true;

  const resolution: RoomResolution = {
    room, kind: room.kind, combatStarted: false, trapDamage: 0, lootItemIds: [], message: room.description,
  };

  const rng = new SeededRandom(`${state.world.seed}:room:${room.id}`, 'dungeon');
  const level = Math.round((dungeon.levelRange[0] + dungeon.levelRange[1]) / 2);

  switch (room.kind) {
    case 'combat':
    case 'miniboss': {
      if (room.cleared) break;
      const pool = CREATURE_BASES.filter((base) => base.levelRange[0] <= level + 2);
      const count = room.kind === 'miniboss' ? 1 : rng.int(1, 3);
      const creatures = Array.from({ length: count }, () => {
        const base = rng.pick(pool.length > 0 ? pool : CREATURE_BASES);
        const creature = buildCreature(rng, base, level + (room.kind === 'miniboss' ? 2 : 0), null);
        if (room.kind === 'miniboss') {
          creature.maxHp = Math.round(creature.maxHp * 2.2);
          creature.attack = Math.round(creature.attack * 1.3);
          creature.name = `${creature.name}, o Vigia`;
          creature.xpReward = Math.round(creature.xpReward * 2.5);
        }
        return creature;
      });
      room.encounterCreatureIds = creatures.map((creature) => creature.instanceId);
      startCreatureEncounter(state, creatures, room.kind === 'miniboss' ? creatures[0]!.name : `${room.name}`, dungeon.id, bus);
      resolution.combatStarted = true;
      resolution.message = room.kind === 'miniboss' ? 'Algo grande bloqueia a passagem.' : room.description;
      break;
    }
    case 'boss': {
      if (room.cleared) break;
      startBossEncounter(state, dungeon.bossBaseId, dungeon.levelRange[1], dungeon.id, bus);
      resolution.combatStarted = true;
      resolution.message = 'A câmara final se abre.';
      break;
    }
    case 'trap': {
      if (room.cleared) break;
      const stats = playerStats(state);
      const dodged = rng.next() * 100 < stats.dodgeChance;
      if (!dodged) {
        const damage = Math.max(1, Math.round(room.trapDamage * rng.float(0.7, 1.2)));
        state.player.resources.hp = Math.max(1, state.player.resources.hp - damage);
        resolution.trapDamage = damage;
        resolution.message = `Uma armadilha dispara: ${damage} de dano.`;
        bus?.emit('PLAYER_DAMAGED', { amount: damage, remainingHp: state.player.resources.hp });
      } else {
        resolution.message = 'Você percebe a armadilha a tempo e desvia.';
      }
      room.cleared = true;
      break;
    }
    case 'treasure':
    case 'secret': {
      if (room.treasureRolled) break;
      const drops = room.kind === 'secret' ? 2 : 1;
      for (let i = 0; i < drops; i++) {
        const item = generateItem(rng, {
          itemLevel: level + (room.kind === 'secret' ? 2 : 0),
          luck: state.player.attributes.luck,
          ...(room.kind === 'secret' ? { minRarity: 'rare' as const } : {}),
          classHint: state.player.classId,
        });
        resolution.lootItemIds.push(addItem(state.player, state.items, item));
        bus?.emit('ITEM_ACQUIRED', { itemId: item.id, source: 'dungeon' });
      }
      const gold = rng.int(8, 18) * level;
      state.player.gold += gold;
      room.treasureRolled = true;
      room.cleared = true;
      resolution.message = `Você encontra ${gold} moedas e algo mais.`;
      break;
    }
    case 'rest': {
      restorePlayer(state, 0.6);
      room.cleared = true;
      resolution.message = 'Um lugar seguro. Você recupera o fôlego.';
      break;
    }
    case 'event': {
      room.cleared = true;
      resolution.message = room.eventText ?? room.description;
      if (firstVisit) {
        recordWorldEvent(state, {
          type: 'discovery',
          cause: `exploração de ${dungeon.name}`,
          consequences: [],
          importance: 26,
          summary: `Em ${dungeon.name}: ${resolution.message}`,
          tags: ['dungeon', 'event'],
        }, bus);
      }
      break;
    }
    default:
      room.cleared = true;
      break;
  }

  return resolution;
}

/** Called after a dungeon fight is won, to mark the room and possibly finish. */
export function markRoomCleared(state: GameState, bus?: EventBus): { dungeonCleared: boolean } {
  const dungeon = state.activeDungeonId ? state.dungeons[state.activeDungeonId] : null;
  const room = dungeon?.currentRoomId ? dungeon.rooms[dungeon.currentRoomId] : null;
  if (!dungeon || !room) return { dungeonCleared: false };

  room.cleared = true;
  if (room.id !== dungeon.bossRoomId) return { dungeonCleared: false };

  dungeon.cleared = true;
  state.player.stats.dungeonsCleared += 1;
  progressObjectives(state, { kind: 'clearDungeon', targetRef: dungeon.locationId }, bus);

  const locationState = state.locationStates[dungeon.locationId];
  if (locationState) {
    locationState.danger = Math.max(0, locationState.danger - 18);
    const related = locationState.activeProblems.find((problem) => !problem.resolved && problem.sourceEventId === dungeon.sourceEventId);
    if (related) related.resolved = true;
  }

  recordWorldEvent(state, {
    type: 'dungeonCleared',
    locationId: dungeon.locationId,
    cause: dungeon.narrativeContext,
    consequences: ['a região respira aliviada'],
    importance: 72,
    summary: `Você limpou ${dungeon.name}.`,
    tags: ['dungeon'],
    memory: { memoryType: 'witnessed', emotionalWeight: 20, trustImpact: 10, fearImpact: 6, respectImpact: 26, permanent: true },
  }, bus);

  bus?.emit('DUNGEON_CLEARED', { dungeonId: dungeon.id, floors: dungeon.floors });
  return { dungeonCleared: true };
}

export function availableExits(state: GameState): DungeonRoom[] {
  const dungeon = state.activeDungeonId ? state.dungeons[state.activeDungeonId] : null;
  const room = dungeon?.currentRoomId ? dungeon.rooms[dungeon.currentRoomId] : null;
  if (!dungeon || !room) return [];
  return room.exits
    .map((id) => dungeon.rooms[id])
    .filter((entry): entry is DungeonRoom => !!entry)
    // Secret rooms only reveal themselves once found.
    .filter((entry) => !entry.secret || entry.visited || room.kind === 'secret');
}
