import { generateWorld } from '@/procgen/world';
import { generateDungeon } from '@/procgen/dungeon';
import { generateEncounter, generateBossEncounter } from '@/procgen/encounter';
import { SeededRandom } from '@/core/rng/random';

describe('geração de mundo', () => {
  const bundle = generateWorld({ seedLabel: 'verdalia-0001' });

  it('é determinística para a mesma semente', () => {
    const other = generateWorld({ seedLabel: 'verdalia-0001' });
    expect(Object.keys(other.locations)).toEqual(Object.keys(bundle.locations));
    expect(Object.values(other.regions).map((r) => r.name)).toEqual(Object.values(bundle.regions).map((r) => r.name));
    expect(Object.values(other.npcs).map((n) => n.name)).toEqual(Object.values(bundle.npcs).map((n) => n.name));
  });

  it('gera mundos diferentes para sementes diferentes', () => {
    const other = generateWorld({ seedLabel: 'verdalia-0002' });
    const names = Object.values(bundle.regions).map((r) => r.name);
    const otherNames = Object.values(other.regions).map((r) => r.name);
    expect(otherNames).not.toEqual(names);
  });

  it('entrega o conteúdo mínimo do vertical slice', () => {
    expect(bundle.world.kingdomIds).toHaveLength(1);
    expect(Object.keys(bundle.regions)).toHaveLength(3);
    const kinds = Object.values(bundle.locations).map((location) => location.kind);
    expect(kinds.filter((kind) => kind === 'city')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'village').length).toBeGreaterThanOrEqual(2);
    expect(kinds.filter((kind) => kind === 'wilderness').length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(bundle.npcs).length).toBeGreaterThanOrEqual(20);
    expect(Object.keys(bundle.factions).length).toBeGreaterThanOrEqual(4);
  });

  it('começa na capital, já descoberta', () => {
    const start = bundle.locations[bundle.startingLocationId]!;
    expect(start.kind).toBe('city');
    expect(bundle.locationStates[start.id]!.discovered).toBe(true);
  });

  it('todas as conexões entre locais são bidirecionais e válidas', () => {
    for (const location of Object.values(bundle.locations)) {
      for (const neighbourId of location.connectedLocationIds) {
        const neighbour = bundle.locations[neighbourId];
        expect(neighbour).toBeDefined();
        expect(neighbour!.connectedLocationIds).toContain(location.id);
      }
      expect(location.connectedLocationIds).not.toContain(location.id);
    }
  });

  it('cada NPC mora num local existente e aparece na lista dele', () => {
    for (const npc of Object.values(bundle.npcs)) {
      const home = bundle.locations[npc.homeLocationId];
      expect(home).toBeDefined();
      expect(home!.npcIds).toContain(npc.id);
    }
  });

  it('todo estabelecimento tem dono válido', () => {
    for (const location of Object.values(bundle.locations)) {
      for (const establishment of location.establishments) {
        expect(establishment.ownerNpcId).not.toBeNull();
        expect(bundle.npcs[establishment.ownerNpcId!]).toBeDefined();
      }
    }
  });

  it('IDs seguem o padrão prefixado', () => {
    expect(Object.keys(bundle.locations).every((id) => id.startsWith('location_'))).toBe(true);
    expect(Object.keys(bundle.npcs).every((id) => id.startsWith('npc_'))).toBe(true);
    expect(Object.keys(bundle.factions).every((id) => id.startsWith('faction_'))).toBe(true);
  });
});

describe('geração de masmorra', () => {
  const dungeon = generateDungeon(new SeededRandom('dungeon-1'), {
    regionId: 'region_a', locationId: 'location_a', biome: 'caves',
    levelRange: [5, 9], narrativeContext: 'Um selo antigo rachou.', discoveredDay: 3,
  });

  it('é determinística e tem entrada, chefe e contexto narrativo', () => {
    const other = generateDungeon(new SeededRandom('dungeon-1'), {
      regionId: 'region_a', locationId: 'location_a', biome: 'caves',
      levelRange: [5, 9], narrativeContext: 'Um selo antigo rachou.', discoveredDay: 3,
    });
    expect(Object.keys(other.rooms)).toHaveLength(Object.keys(dungeon.rooms).length);
    expect(dungeon.rooms[dungeon.entranceRoomId]!.kind).toBe('entrance');
    expect(dungeon.rooms[dungeon.bossRoomId]!.kind).toBe('boss');
    expect(dungeon.narrativeContext).toContain('selo');
  });

  it('o grafo é conexo a partir da entrada e as saídas são bidirecionais', () => {
    const seen = new Set<string>();
    const queue = [dungeon.entranceRoomId];
    while (queue.length > 0) {
      const id = queue.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const exit of dungeon.rooms[id]!.exits) {
        expect(dungeon.rooms[exit]).toBeDefined();
        expect(dungeon.rooms[exit]!.exits).toContain(id);
        queue.push(exit);
      }
    }
    expect(seen.size).toBe(Object.keys(dungeon.rooms).length);
  });

  it('inclui miniboss e usa o bioma para escolher o tipo', () => {
    const kinds = Object.values(dungeon.rooms).map((room) => room.kind);
    expect(kinds).toContain('miniboss');
    expect(['cave', 'mine', 'catacomb']).toContain(dungeon.kind);
  });

  it('respeita o número de andares pedido', () => {
    const fixed = generateDungeon(new SeededRandom('dungeon-floors'), {
      regionId: 'r', locationId: 'l', biome: 'ruins', levelRange: [1, 4],
      narrativeContext: 'teste', discoveredDay: 1, floors: 3,
    });
    expect(fixed.floors).toBe(3);
    expect(Math.max(...Object.values(fixed.rooms).map((room) => room.floor))).toBe(3);
  });
});

describe('geração de encontros', () => {
  it('escala pelo nível do jogador e respeita o bioma', () => {
    const rng = new SeededRandom('enc-1');
    for (let i = 0; i < 40; i++) {
      const encounter = generateEncounter(rng, {
        biome: 'forest', playerLevel: 6, regionLevelRange: [4, 9], dangerLevel: 30,
      });
      expect(encounter.creatures.length).toBeGreaterThanOrEqual(1);
      expect(encounter.creatures.length).toBeLessThanOrEqual(3);
      for (const creature of encounter.creatures) {
        expect(creature.level).toBeGreaterThanOrEqual(4);
        expect(creature.level).toBeLessThanOrEqual(8);
        expect(creature.maxHp).toBeGreaterThan(0);
        expect(creature.attack).toBeGreaterThan(0);
      }
    }
  });

  it('variantes mudam o nome e a recompensa', () => {
    const rng = new SeededRandom('enc-variant');
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      for (const creature of generateEncounter(rng, {
        biome: 'forest', playerLevel: 12, regionLevelRange: [10, 14], dangerLevel: 60,
      }).creatures) {
        seen.add(creature.name);
      }
    }
    expect(seen.size).toBeGreaterThan(6);
  });

  it('chefes têm fases e recompensa ampliada', () => {
    const boss = generateBossEncounter(new SeededRandom('boss-1'), 'boss_warden', 9);
    const creature = boss.creatures[0]!;
    expect(boss.isBossFight).toBe(true);
    expect(creature.isBoss).toBe(true);
    expect(creature.phases.length).toBeGreaterThan(0);
    expect(creature.xpReward).toBeGreaterThan(100);
  });
});
