import type { SeededRandom } from '@/core/rng/random';
import { makeId } from '@/core/ids/ids';
import type { LocationId, RegionId, RoomId } from '@/core/ids/ids';
import { clamp } from '@/core/util/math';
import type { Biome } from '@/domain/world/world';
import type { Dungeon, DungeonKind, DungeonRoom, RoomKind } from '@/domain/world/dungeon';
import { DUNGEON_KIND_LABELS } from '@/domain/world/dungeon';
import { BOSS_BASES } from '@/data/creatures';
import { generateDungeonName } from '@/procgen/names';

const BIOME_KINDS: Record<Biome, readonly DungeonKind[]> = {
  forest: ['cave', 'ruin', 'cursedForest'],
  ancientForest: ['cursedForest', 'temple', 'ruin'],
  plains: ['ruin', 'crypt', 'fortress'],
  mountains: ['mine', 'cave', 'fortress'],
  snow: ['cave', 'fortress', 'tower'],
  desert: ['ruin', 'tower', 'catacomb'],
  swamp: ['sewer', 'crypt', 'cave'],
  coast: ['cave', 'ruin', 'sewer'],
  ruins: ['ruin', 'catacomb', 'tower'],
  corrupted: ['temple', 'crypt', 'catacomb'],
  caves: ['cave', 'mine', 'catacomb'],
};

const ROOM_FLAVOUR: Record<RoomKind, readonly string[]> = {
  entrance: ['A entrada ainda tem marcas de quem passou por aqui antes.'],
  corridor: ['Um corredor estreito, com ar parado.', 'A passagem desce mais do que deveria.'],
  combat: ['Algo se move no fundo da sala.', 'Há ossos recentes espalhados pelo chão.'],
  treasure: ['Um baú lacrado no canto, coberto de poeira.', 'Alguém escondeu algo aqui e não voltou.'],
  trap: ['O chão range de um jeito errado.', 'Fios quase invisíveis cruzam a passagem.'],
  event: ['Uma inscrição pela metade cobre a parede.', 'Um altar improvisado, ainda com oferendas.'],
  rest: ['Uma fogueira apagada e um espaço seguro.', 'Aqui dá para respirar.'],
  secret: ['A parede soa oca deste lado.', 'Uma fresta que ninguém notaria com pressa.'],
  miniboss: ['A sala foi esvaziada de propósito. Algo grande usa este espaço.'],
  boss: ['O teto se abre em altura. Este é o fim do caminho.'],
};

export interface DungeonGenOptions {
  regionId: RegionId;
  locationId: LocationId;
  biome: Biome;
  levelRange: [number, number];
  /** The world reason this dungeon exists. */
  narrativeContext: string;
  sourceEventId?: string | null;
  discoveredDay: number;
  floors?: number;
}

/**
 * Builds a room graph per floor: entrance -> branching corridors -> themed rooms
 * -> miniboss -> boss. Layout is a walk with side branches, not a blind grid.
 */
export function generateDungeon(rng: SeededRandom, options: DungeonGenOptions): Dungeon {
  const kinds = BIOME_KINDS[options.biome] ?? ['cave'];
  const kind = rng.pick(kinds);
  const floors = options.floors ?? rng.int(3, 5);
  const id = makeId('dungeon', rng);

  const rooms: Record<RoomId, DungeonRoom> = {};
  const makeRoom = (floor: number, roomKind: RoomKind, secret = false): DungeonRoom => {
    const roomId = makeId('room', rng);
    const room: DungeonRoom = {
      id: roomId,
      floor,
      kind: roomKind,
      name: roomKind === 'boss' ? 'Câmara Final' : `${DUNGEON_KIND_LABELS[kind]} · ${roomLabel(roomKind)} ${floor}`,
      description: rng.pick(ROOM_FLAVOUR[roomKind]),
      exits: [],
      cleared: roomKind === 'entrance' || roomKind === 'corridor' || roomKind === 'rest',
      visited: false,
      encounterCreatureIds: [],
      trapDamage: roomKind === 'trap' ? Math.round(6 * options.levelRange[0] + rng.int(4, 14)) : 0,
      treasureRolled: false,
      secret,
      eventText: roomKind === 'event' ? eventText(rng, options.narrativeContext) : null,
    };
    rooms[roomId] = room;
    return room;
  };

  const connect = (a: DungeonRoom, b: DungeonRoom): void => {
    if (!a.exits.includes(b.id)) a.exits.push(b.id);
    if (!b.exits.includes(a.id)) b.exits.push(a.id);
  };

  const entrance = makeRoom(1, 'entrance');
  let previousFloorExit = entrance;
  let bossRoom: DungeonRoom | null = null;

  for (let floor = 1; floor <= floors; floor++) {
    const isLast = floor === floors;
    const spine = rng.int(3, 5);
    let cursor = previousFloorExit;

    for (let step = 0; step < spine; step++) {
      const weights: { value: RoomKind; weight: number }[] = [
        { value: 'combat', weight: 46 },
        { value: 'corridor', weight: 18 },
        { value: 'treasure', weight: 14 },
        { value: 'trap', weight: 12 },
        { value: 'event', weight: 10 },
        { value: 'rest', weight: floor > 1 ? 8 : 2 },
      ];
      const room = makeRoom(floor, rng.weighted(weights));
      connect(cursor, room);

      // Side branch: a dead end that may hide a secret.
      if (rng.bool(0.32)) {
        const branchKind: RoomKind = rng.bool(0.4) ? 'secret' : rng.bool(0.5) ? 'treasure' : 'combat';
        const branch = makeRoom(floor, branchKind, branchKind === 'secret');
        connect(room, branch);
      }
      cursor = room;
    }

    if (floor === Math.ceil(floors / 2)) {
      const miniboss = makeRoom(floor, 'miniboss');
      connect(cursor, miniboss);
      cursor = miniboss;
    }

    if (isLast) {
      bossRoom = makeRoom(floor, 'boss');
      connect(cursor, bossRoom);
    } else {
      const stair = makeRoom(floor, 'corridor');
      stair.name = `Escadaria ao andar ${floor + 1}`;
      stair.description = 'Degraus gastos descem para o andar seguinte.';
      connect(cursor, stair);
      previousFloorExit = stair;
    }
  }

  const boss = bossRoom ?? makeRoom(floors, 'boss');
  const bossPool = BOSS_BASES.filter((candidate) => candidate.levelRange[0] <= options.levelRange[1] + 2);
  const bossBase = bossPool.length > 0 ? rng.pick(bossPool) : BOSS_BASES[0]!;

  return {
    id,
    name: generateDungeonName(rng),
    kind,
    regionId: options.regionId,
    locationId: options.locationId,
    levelRange: [clamp(options.levelRange[0], 1, 60), clamp(options.levelRange[1], 1, 60)],
    floors,
    rooms,
    entranceRoomId: entrance.id,
    bossRoomId: boss.id,
    bossBaseId: bossBase.baseId,
    narrativeContext: options.narrativeContext,
    sourceEventId: options.sourceEventId ?? null,
    cleared: false,
    discoveredDay: options.discoveredDay,
    artKey: `art.dungeon.${kind}`,
    currentRoomId: null,
  };
}

function roomLabel(kind: RoomKind): string {
  switch (kind) {
    case 'combat': return 'Salão';
    case 'treasure': return 'Depósito';
    case 'trap': return 'Passagem';
    case 'event': return 'Câmara';
    case 'rest': return 'Abrigo';
    case 'secret': return 'Nicho';
    case 'miniboss': return 'Arena';
    default: return 'Corredor';
  }
}

function eventText(rng: SeededRandom, narrativeContext: string): string {
  return rng.pick([
    `Uma inscrição recente menciona o mesmo que se fala lá fora: ${narrativeContext.toLowerCase()}`,
    'Alguém acampou aqui há poucos dias. As cinzas ainda estão mornas.',
    'Há um diário de bolso, quase ilegível, com uma data recente.',
    'Marcas de arrasto seguem para o fundo do corredor.',
  ]);
}
