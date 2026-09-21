import { RngStreams, type SeededRandom } from '@/core/rng/random';
import { makeId } from '@/core/ids/ids';
import type { FactionId, KingdomId, LocationId, RegionId } from '@/core/ids/ids';
import type {
  Biome, Establishment, EstablishmentKind, GameLocation, Kingdom, LocationState, Region, World,
} from '@/domain/world/world';
import type { Faction, FactionState } from '@/domain/faction/faction';
import type { NPC } from '@/domain/npc/npc';
import { ATMOSPHERES, WEATHER } from '@/data/names';
import { generateKingdomName, generatePlaceName } from '@/procgen/names';
import { generateNpc, linkFamilies } from '@/procgen/npc';

export interface WorldBundle {
  world: World;
  kingdoms: Record<KingdomId, Kingdom>;
  regions: Record<RegionId, Region>;
  locations: Record<LocationId, GameLocation>;
  locationStates: Record<LocationId, LocationState>;
  factions: Record<FactionId, Faction>;
  factionStates: Record<FactionId, FactionState>;
  npcs: Record<string, NPC>;
  startingLocationId: LocationId;
}

const CITY_ESTABLISHMENTS: readonly EstablishmentKind[] = [
  'tavern', 'blacksmith', 'alchemist', 'market', 'temple', 'guild', 'inn', 'library', 'keep', 'stable', 'arena', 'blackMarket',
];
const VILLAGE_ESTABLISHMENTS: readonly EstablishmentKind[] = ['tavern', 'blacksmith', 'market', 'temple', 'stable'];

const FACTION_BLUEPRINTS = [
  { kind: 'guard' as const, name: 'Guarda de {kingdom}', description: 'Mantém a ordem nas estradas e nos portões.', colorKey: 'faction.guard' },
  { kind: 'merchant' as const, name: 'Liga Mercante', description: 'Controla preços, rotas e caravanas.', colorKey: 'faction.merchant' },
  { kind: 'druid' as const, name: 'Círculo do Bosque', description: 'Protege os limites antigos da floresta.', colorKey: 'faction.druid' },
  { kind: 'thief' as const, name: 'Mãos Silenciosas', description: 'Opera onde a guarda não entra.', colorKey: 'faction.thief' },
  { kind: 'temple' as const, name: 'Ordem da Chama Velada', description: 'Zela pelos mortos e teme o que os acorda.', colorKey: 'faction.temple' },
];

const REGION_BLUEPRINTS: readonly { biome: Biome; suffix: string; resources: string[]; families: string[] }[] = [
  { biome: 'forest', suffix: 'Mata', resources: ['madeira', 'ervas', 'peles'], families: ['beast', 'spirit', 'humanoid'] },
  { biome: 'swamp', suffix: 'Charco', resources: ['ervas raras', 'turfa'], families: ['beast', 'aberration', 'undead', 'elemental'] },
  { biome: 'mountains', suffix: 'Serra', resources: ['minério', 'pedra'], families: ['construct', 'humanoid', 'beast'] },
  { biome: 'ancientForest', suffix: 'Bosque Ancião', resources: ['cerne', 'essência'], families: ['spirit', 'beast', 'humanoid'] },
  { biome: 'ruins', suffix: 'Ruínas', resources: ['relíquias', 'pedra'], families: ['undead', 'construct', 'spirit'] },
  { biome: 'plains', suffix: 'Campos', resources: ['grãos', 'gado'], families: ['beast', 'humanoid'] },
];

function makeEstablishments(rng: SeededRandom, kinds: readonly EstablishmentKind[], placeName: string): Establishment[] {
  return kinds.map((kind) => ({
    id: `est_${kind}_${rng.hex(6)}`,
    kind,
    name: establishmentName(rng, kind, placeName),
    ownerNpcId: null,
    stockItemIds: [],
    stockRefreshedDay: -1,
    priceModifier: Math.round(rng.float(0.9, 1.15) * 100) / 100,
  }));
}

function establishmentName(rng: SeededRandom, kind: EstablishmentKind, placeName: string): string {
  const flavour = rng.pick(['do Corvo', 'da Raiz', 'do Viajante', 'da Brasa', 'do Elmo', 'da Lua Baixa', 'do Sino']);
  switch (kind) {
    case 'tavern': return `Taverna ${flavour}`;
    case 'inn': return `Hospedaria ${flavour}`;
    case 'blacksmith': return `Forja ${flavour}`;
    case 'alchemist': return `Botica ${flavour}`;
    case 'market': return `Mercado de ${placeName}`;
    case 'temple': return `Templo ${flavour}`;
    case 'guild': return `Guilda de ${placeName}`;
    case 'library': return `Biblioteca de ${placeName}`;
    case 'keep': return `Castelo de ${placeName}`;
    case 'stable': return `Estábulo ${flavour}`;
    case 'arena': return `Arena de ${placeName}`;
    case 'blackMarket': return 'Beco Sem Nome';
    default: return placeName;
  }
}

function emptyLocationState(locationId: LocationId, rng: SeededRandom, population: number): LocationState {
  return {
    locationId,
    prosperity: rng.int(45, 70),
    danger: rng.int(8, 30),
    population,
    factionControl: null,
    discovered: false,
    destroyed: false,
    activeProblems: [],
    historicalEventIds: [],
    pendingConsequences: [],
    lastVisitedDay: -1,
  };
}

export interface WorldGenOptions {
  seedLabel: string;
  regionCount?: number;
  villageCount?: number;
  npcTarget?: number;
}

/**
 * Builds the vertical-slice world: one kingdom, three regions, one capital city,
 * two villages, wilderness areas and 20+ persistent NPCs.
 */
export function generateWorld(options: WorldGenOptions): WorldBundle {
  const seedLabel = options.seedLabel;
  const streams = new RngStreams(seedLabel);
  const worldRng = streams.get('world');
  const npcRng = streams.get('npc');

  const regionCount = options.regionCount ?? 3;
  const villageCount = options.villageCount ?? 2;
  const npcTarget = options.npcTarget ?? 24;

  const kingdomId = makeId('kingdom', worldRng);
  const kingdomName = generateKingdomName(worldRng);

  const factions: Record<FactionId, Faction> = {};
  const factionStates: Record<FactionId, FactionState> = {};
  for (const blueprint of FACTION_BLUEPRINTS) {
    const id = makeId('faction', worldRng);
    factions[id] = {
      id,
      name: blueprint.name.replace('{kingdom}', kingdomName),
      kind: blueprint.kind,
      description: blueprint.description,
      leaderNpcId: null,
      colorKey: blueprint.colorKey,
    };
    factionStates[id] = {
      factionId: id,
      reputationWithPlayer: 0,
      resources: worldRng.int(40, 90),
      influence: worldRng.int(25, 75),
      enemyIds: [],
      allyIds: [],
      territoryIds: [],
      importantEventIds: [],
    };
  }
  const factionIds = Object.keys(factions);
  // Guard and thieves are natural enemies; druids distrust the merchants.
  const guardId = factionIds.find((id) => factions[id]?.kind === 'guard');
  const thiefId = factionIds.find((id) => factions[id]?.kind === 'thief');
  const druidId = factionIds.find((id) => factions[id]?.kind === 'druid');
  const merchantId = factionIds.find((id) => factions[id]?.kind === 'merchant');
  if (guardId && thiefId) {
    factionStates[guardId]!.enemyIds.push(thiefId);
    factionStates[thiefId]!.enemyIds.push(guardId);
  }
  if (druidId && merchantId) {
    factionStates[druidId]!.enemyIds.push(merchantId);
    factionStates[merchantId]!.enemyIds.push(druidId);
  }

  const regions: Record<RegionId, Region> = {};
  const locations: Record<LocationId, GameLocation> = {};
  const locationStates: Record<LocationId, LocationState> = {};

  const blueprints = worldRng.sample(REGION_BLUEPRINTS, regionCount);
  const regionIds: RegionId[] = [];
  let capitalLocationId: LocationId | null = null;

  blueprints.forEach((blueprint, index) => {
    const regionId = makeId('region', worldRng);
    regionIds.push(regionId);
    const regionName = `${generatePlaceName(worldRng)} ${blueprint.suffix}`;
    const low = 1 + index * 4;
    const high = low + 6;

    const regionLocationIds: LocationId[] = [];

    // The first region holds the capital; each region gets a village plus wilds.
    if (index === 0) {
      const cityId = makeId('location', worldRng);
      capitalLocationId = cityId;
      const cityName = generatePlaceName(worldRng);
      locations[cityId] = {
        id: cityId,
        regionId,
        kingdomId,
        kind: 'city',
        name: cityName,
        description: `A cidade-reino de ${cityName}, onde toda jornada começa. Muralhas altas, mercado ruidoso e portões que raramente fecham.`,
        levelRange: [1, high],
        establishments: makeEstablishments(worldRng, CITY_ESTABLISHMENTS, cityName),
        npcIds: [],
        dungeonIds: [],
        artKey: 'art.location.city',
        connectedLocationIds: [],
      };
      locationStates[cityId] = emptyLocationState(cityId, worldRng, worldRng.int(2200, 4200));
      locationStates[cityId]!.discovered = true;
      locationStates[cityId]!.factionControl = guardId ?? null;
      regionLocationIds.push(cityId);
    }

    const villagesHere = index === 0 ? villageCount - 1 : villageCount > 1 ? 1 : 0;
    for (let v = 0; v < Math.max(0, villagesHere); v++) {
      const villageId = makeId('location', worldRng);
      const villageName = generatePlaceName(worldRng);
      locations[villageId] = {
        id: villageId,
        regionId,
        kingdomId,
        kind: 'village',
        name: villageName,
        description: `${villageName} vive do que a terra dá e do que a estrada traz. Todos se conhecem — e lembram.`,
        levelRange: [low, high - 2],
        establishments: makeEstablishments(worldRng, VILLAGE_ESTABLISHMENTS, villageName),
        npcIds: [],
        dungeonIds: [],
        artKey: 'art.location.village',
        connectedLocationIds: [],
      };
      locationStates[villageId] = emptyLocationState(villageId, worldRng, worldRng.int(90, 380));
      regionLocationIds.push(villageId);
    }

    const wildCount = worldRng.int(2, 3);
    for (let w = 0; w < wildCount; w++) {
      const wildId = makeId('location', worldRng);
      const wildName = `${generatePlaceName(worldRng)} ${worldRng.pick(['Selvagem', 'Perdida', 'Antiga', 'Calada'])}`;
      locations[wildId] = {
        id: wildId,
        regionId,
        kingdomId,
        kind: 'wilderness',
        name: wildName,
        description: `Terreno aberto de ${blueprint.biome === 'swamp' ? 'lama e juncos' : 'mato alto e trilhas irregulares'}. Encontros são frequentes.`,
        levelRange: [low, high],
        establishments: [],
        npcIds: [],
        dungeonIds: [],
        artKey: `art.location.wild.${blueprint.biome}`,
        connectedLocationIds: [],
      };
      locationStates[wildId] = emptyLocationState(wildId, worldRng, 0);
      locationStates[wildId]!.danger = worldRng.int(25, 55) + index * 8;
      regionLocationIds.push(wildId);
    }

    regions[regionId] = {
      id: regionId,
      kingdomId,
      name: regionName,
      biome: blueprint.biome,
      levelRange: [low, high],
      locationIds: regionLocationIds,
      dangerLevel: worldRng.int(20, 45) + index * 12,
      resources: [...blueprint.resources],
      creatureFamilies: [...blueprint.families],
      factionIds: worldRng.sample(factionIds, worldRng.int(1, 2)),
      weather: worldRng.pick(WEATHER),
      atmosphere: worldRng.pick(ATMOSPHERES),
      lore: `${regionName} guarda histórias que ninguém escreveu. ${worldRng.pick([
        'Os mais velhos evitam falar do que havia aqui antes.',
        'Dizem que a estrada foi traçada para contornar algo.',
        'A cada geração alguém desaparece e ninguém procura direito.',
      ])}`,
      discovered: index === 0,
      artKey: `art.region.${blueprint.biome}`,
      mapPosition: { x: 20 + index * 30, y: 30 + (index % 2) * 28 },
    };
  });

  // Connect locations: the capital is the hub, wilds chain outward.
  const allLocationIds = Object.keys(locations);
  const cityId = capitalLocationId ?? allLocationIds[0]!;
  for (const regionId of regionIds) {
    const ids = regions[regionId]!.locationIds;
    ids.forEach((id, index) => {
      const location = locations[id]!;
      const neighbours = new Set<LocationId>(location.connectedLocationIds);
      if (id !== cityId) neighbours.add(cityId);
      const previous = ids[index - 1];
      const next = ids[index + 1];
      if (previous) neighbours.add(previous);
      if (next) neighbours.add(next);
      location.connectedLocationIds = [...neighbours].filter((neighbour) => neighbour !== id);
    });
  }
  for (const id of allLocationIds) {
    for (const neighbour of locations[id]!.connectedLocationIds) {
      const other = locations[neighbour];
      if (other && !other.connectedLocationIds.includes(id)) other.connectedLocationIds.push(id);
    }
  }

  // NPCs: settlements get their establishment owners first, then extra residents.
  const npcs: Record<string, NPC> = {};
  const settlements = allLocationIds.filter((id) => locations[id]!.kind !== 'wilderness');
  const createdNpcs: NPC[] = [];

  for (const locationId of settlements) {
    const location = locations[locationId]!;
    for (const establishment of location.establishments) {
      const occupationId = occupationForEstablishment(establishment.kind);
      const npc = generateNpc(npcRng, {
        homeLocationId: locationId,
        importance: location.kind === 'city' ? 'notable' : 'notable',
        ...(occupationId ? { occupationId } : {}),
        factionId: factionForEstablishment(establishment.kind, { guardId, thiefId, druidId, merchantId }),
      });
      establishment.ownerNpcId = npc.id;
      npcs[npc.id] = npc;
      location.npcIds.push(npc.id);
      createdNpcs.push(npc);
    }
  }

  while (createdNpcs.length < npcTarget) {
    const locationId = npcRng.pick(settlements);
    const npc = generateNpc(npcRng, { homeLocationId: locationId });
    npcs[npc.id] = npc;
    locations[locationId]!.npcIds.push(npc.id);
    createdNpcs.push(npc);
  }

  linkFamilies(npcRng, createdNpcs);

  // The ruler is the most important NPC of the capital.
  const rulerCandidate = createdNpcs.find((npc) => npc.homeLocationId === cityId && npc.occupationId === 'occ_mayor')
    ?? createdNpcs.find((npc) => npc.homeLocationId === cityId);
  if (rulerCandidate) rulerCandidate.importance = 'major';

  for (const factionId of factionIds) {
    const member = createdNpcs.find((npc) => npc.factionId === factionId);
    if (member) {
      factions[factionId]!.leaderNpcId = member.id;
      member.importance = 'major';
    }
    factionStates[factionId]!.territoryIds = [cityId];
  }

  const kingdoms: Record<KingdomId, Kingdom> = {
    [kingdomId]: {
      id: kingdomId,
      name: kingdomName,
      motto: worldRng.pick([
        'O que se planta, se colhe.',
        'A muralha guarda; a raiz sustenta.',
        'Nenhuma dívida se perde.',
      ]),
      rulerNpcId: rulerCandidate?.id ?? null,
      capitalLocationId: cityId,
      regionIds,
      factionIds,
      levelRange: [1, 13],
      artKey: 'art.kingdom.default',
      lore: `${kingdomName} é um reino verdejante de muralhas antigas, cercado por bosque, serra e charco.`,
    },
  };

  const world: World = {
    seed: seedLabel,
    seedLabel,
    createdAt: Date.now(),
    gameDay: 1,
    gameYear: 1,
    kingdomIds: [kingdomId],
    recentFingerprints: [],
    rngStates: streams.snapshot(),
  };

  return {
    world, kingdoms, regions, locations, locationStates, factions, factionStates, npcs,
    startingLocationId: cityId,
  };
}

function occupationForEstablishment(kind: EstablishmentKind): string | undefined {
  const map: Partial<Record<EstablishmentKind, string>> = {
    blacksmith: 'occ_blacksmith',
    alchemist: 'occ_alchemist',
    tavern: 'occ_innkeeper',
    market: 'occ_merchant',
    temple: 'occ_priest',
    library: 'occ_librarian',
    guild: 'occ_guildmaster',
    keep: 'occ_mayor',
    stable: 'occ_stablehand',
    blackMarket: 'occ_fence',
    inn: 'occ_innkeeper',
    arena: 'occ_captain',
  };
  return map[kind];
}

function factionForEstablishment(
  kind: EstablishmentKind,
  ids: { guardId?: string; thiefId?: string; druidId?: string; merchantId?: string },
): string | null {
  if (kind === 'keep' || kind === 'arena') return ids.guardId ?? null;
  if (kind === 'market' || kind === 'blacksmith') return ids.merchantId ?? null;
  if (kind === 'blackMarket') return ids.thiefId ?? null;
  return null;
}
