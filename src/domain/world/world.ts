import type { DungeonId, EventId, FactionId, KingdomId, LocationId, NpcId, RegionId } from '@/core/ids/ids';

export const BIOMES = [
  'forest', 'ancientForest', 'plains', 'mountains', 'snow', 'desert',
  'swamp', 'coast', 'ruins', 'corrupted', 'caves',
] as const;
export type Biome = (typeof BIOMES)[number];

export const BIOME_LABELS: Record<Biome, string> = {
  forest: 'Floresta', ancientForest: 'Floresta Ancestral', plains: 'Planícies',
  mountains: 'Montanhas', snow: 'Neve', desert: 'Deserto', swamp: 'Pântano',
  coast: 'Costa', ruins: 'Ruínas', corrupted: 'Terras Corrompidas', caves: 'Cavernas',
};

export type LocationKind = 'city' | 'village' | 'wilderness' | 'dungeon' | 'poi';

export const LOCATION_KIND_LABELS: Record<LocationKind, string> = {
  city: 'Cidade', village: 'Vila', wilderness: 'Região Selvagem', dungeon: 'Masmorra', poi: 'Ponto de Interesse',
};

export type EstablishmentKind =
  | 'tavern' | 'blacksmith' | 'alchemist' | 'market' | 'temple' | 'guild'
  | 'inn' | 'library' | 'keep' | 'stable' | 'arena' | 'blackMarket';

export const ESTABLISHMENT_LABELS: Record<EstablishmentKind, string> = {
  tavern: 'Taverna', blacksmith: 'Ferreiro', alchemist: 'Alquimista', market: 'Mercado',
  temple: 'Templo', guild: 'Guilda', inn: 'Hospedaria', library: 'Biblioteca',
  keep: 'Castelo', stable: 'Estábulo', arena: 'Arena', blackMarket: 'Mercado Negro',
};

export interface Establishment {
  id: string;
  kind: EstablishmentKind;
  name: string;
  ownerNpcId: NpcId | null;
  /** Procedural stock, refreshed on a day cadence. */
  stockItemIds: string[];
  stockRefreshedDay: number;
  priceModifier: number;
}

export interface World {
  seed: string;
  seedLabel: string;
  createdAt: number;
  gameDay: number;
  gameYear: number;
  kingdomIds: KingdomId[];
  /** Semantic fingerprints of recently generated content (anti-repetition). */
  recentFingerprints: string[];
  rngStates: Record<string, number>;
}

export interface Kingdom {
  id: KingdomId;
  name: string;
  motto: string;
  rulerNpcId: NpcId | null;
  capitalLocationId: LocationId;
  regionIds: RegionId[];
  factionIds: FactionId[];
  levelRange: [number, number];
  artKey: string;
  lore: string;
}

export interface Region {
  id: RegionId;
  kingdomId: KingdomId;
  name: string;
  biome: Biome;
  levelRange: [number, number];
  locationIds: LocationId[];
  dangerLevel: number;
  resources: string[];
  creatureFamilies: string[];
  factionIds: FactionId[];
  weather: string;
  atmosphere: string;
  lore: string;
  discovered: boolean;
  artKey: string;
  /** Grid position for the illustrated map. */
  mapPosition: { x: number; y: number };
}

export interface GameLocation {
  id: LocationId;
  regionId: RegionId;
  kingdomId: KingdomId;
  kind: LocationKind;
  name: string;
  description: string;
  levelRange: [number, number];
  establishments: Establishment[];
  npcIds: NpcId[];
  dungeonIds: DungeonId[];
  artKey: string;
  /** A location can only be travelled to from its neighbours. */
  connectedLocationIds: LocationId[];
}

export interface LocationState {
  locationId: LocationId;
  prosperity: number;
  danger: number;
  population: number;
  factionControl: FactionId | null;
  discovered: boolean;
  destroyed: boolean;
  activeProblems: ActiveProblem[];
  historicalEventIds: EventId[];
  /** Consequences accumulated while the player was away (simulation LOD). */
  pendingConsequences: PendingConsequence[];
  lastVisitedDay: number;
}

export interface ActiveProblem {
  id: string;
  kind: 'raiders' | 'famine' | 'plague' | 'beast' | 'undead' | 'corruption' | 'missing' | 'feud';
  severity: number;
  startedDay: number;
  /** When ignored past this day the problem escalates. */
  escalatesDay: number;
  sourceEventId: EventId | null;
  summary: string;
  resolved: boolean;
}

export interface PendingConsequence {
  id: string;
  kind: 'prosperity' | 'danger' | 'population' | 'destroy' | 'npcMoved' | 'npcDied' | 'priceShift';
  amount: number;
  targetId?: string;
  summary: string;
  createdDay: number;
}

export function regionLevelLabel(region: Region): string {
  return `Nível ${region.levelRange[0]}–${region.levelRange[1]}`;
}
