import type { EstablishmentKind } from '@/domain/world/world';

export interface NpcArchetype {
  id: string;
  name: string;
  /** Broad social role — drives dialogue tone and quest motivations. */
  disposition: 'helper' | 'authority' | 'outcast' | 'trader' | 'scholar' | 'zealot' | 'brute';
  questTypes: readonly string[];
}

export const NPC_ARCHETYPES: readonly NpcArchetype[] = [
  { id: 'arch_artisan', name: 'Artesão', disposition: 'helper', questTypes: ['gather', 'rescue', 'personal'] },
  { id: 'arch_guard', name: 'Guarda', disposition: 'authority', questTypes: ['hunt', 'defense', 'assassination'] },
  { id: 'arch_merchant', name: 'Comerciante', disposition: 'trader', questTypes: ['escort', 'negotiation', 'gather'] },
  { id: 'arch_scholar', name: 'Erudito', disposition: 'scholar', questTypes: ['investigation', 'exploration', 'mystery'] },
  { id: 'arch_priest', name: 'Clérigo', disposition: 'zealot', questTypes: ['investigation', 'dungeon', 'defense'] },
  { id: 'arch_druid', name: 'Druida', disposition: 'outcast', questTypes: ['hunt', 'exploration', 'faction'] },
  { id: 'arch_outlaw', name: 'Fora-da-lei', disposition: 'outcast', questTypes: ['assassination', 'gather', 'faction'] },
  { id: 'arch_farmer', name: 'Camponês', disposition: 'helper', questTypes: ['hunt', 'rescue', 'gather'] },
  { id: 'arch_noble', name: 'Nobre', disposition: 'authority', questTypes: ['negotiation', 'faction', 'assassination'] },
  { id: 'arch_hunter', name: 'Caçador', disposition: 'helper', questTypes: ['hunt', 'exploration', 'escort'] },
  { id: 'arch_healer', name: 'Curandeiro', disposition: 'helper', questTypes: ['gather', 'rescue', 'mystery'] },
  { id: 'arch_smith', name: 'Ferreiro', disposition: 'trader', questTypes: ['gather', 'personal', 'dungeon'] },
];

export interface Occupation {
  id: string;
  name: string;
  archetypeId: string;
  establishment: EstablishmentKind | null;
  sellsCategories: readonly string[];
}

export const OCCUPATIONS: readonly Occupation[] = [
  { id: 'occ_blacksmith', name: 'Ferreiro', archetypeId: 'arch_smith', establishment: 'blacksmith', sellsCategories: ['weapon', 'armor'] },
  { id: 'occ_apprentice', name: 'Aprendiz de ferreiro', archetypeId: 'arch_artisan', establishment: 'blacksmith', sellsCategories: [] },
  { id: 'occ_alchemist', name: 'Alquimista', archetypeId: 'arch_healer', establishment: 'alchemist', sellsCategories: ['consumable', 'material'] },
  { id: 'occ_innkeeper', name: 'Taverneiro', archetypeId: 'arch_merchant', establishment: 'tavern', sellsCategories: ['consumable'] },
  { id: 'occ_merchant', name: 'Mercador', archetypeId: 'arch_merchant', establishment: 'market', sellsCategories: ['consumable', 'material', 'accessory'] },
  { id: 'occ_captain', name: 'Capitã da Guarda', archetypeId: 'arch_guard', establishment: 'keep', sellsCategories: [] },
  { id: 'occ_guard', name: 'Guarda', archetypeId: 'arch_guard', establishment: null, sellsCategories: [] },
  { id: 'occ_priest', name: 'Sacerdote', archetypeId: 'arch_priest', establishment: 'temple', sellsCategories: ['consumable'] },
  { id: 'occ_librarian', name: 'Bibliotecário', archetypeId: 'arch_scholar', establishment: 'library', sellsCategories: [] },
  { id: 'occ_guildmaster', name: 'Mestre da Guilda', archetypeId: 'arch_noble', establishment: 'guild', sellsCategories: [] },
  { id: 'occ_stablehand', name: 'Estribeiro', archetypeId: 'arch_farmer', establishment: 'stable', sellsCategories: [] },
  { id: 'occ_fence', name: 'Receptador', archetypeId: 'arch_outlaw', establishment: 'blackMarket', sellsCategories: ['accessory', 'consumable'] },
  { id: 'occ_farmer', name: 'Lavrador', archetypeId: 'arch_farmer', establishment: null, sellsCategories: [] },
  { id: 'occ_hunter', name: 'Caçadora', archetypeId: 'arch_hunter', establishment: null, sellsCategories: ['material'] },
  { id: 'occ_druid', name: 'Druida do Bosque', archetypeId: 'arch_druid', establishment: null, sellsCategories: ['material'] },
  { id: 'occ_herbalist', name: 'Herborista', archetypeId: 'arch_healer', establishment: 'market', sellsCategories: ['material', 'consumable'] },
  { id: 'occ_miller', name: 'Moleiro', archetypeId: 'arch_farmer', establishment: null, sellsCategories: [] },
  { id: 'occ_scribe', name: 'Escriba', archetypeId: 'arch_scholar', establishment: 'library', sellsCategories: [] },
  { id: 'occ_mayor', name: 'Prefeito', archetypeId: 'arch_noble', establishment: 'keep', sellsCategories: [] },
  { id: 'occ_beggar', name: 'Mendigo', archetypeId: 'arch_outlaw', establishment: null, sellsCategories: [] },
];

export const OCCUPATION_BY_ID: Record<string, Occupation> = Object.fromEntries(OCCUPATIONS.map((o) => [o.id, o]));
export const ARCHETYPE_BY_ID: Record<string, NpcArchetype> = Object.fromEntries(NPC_ARCHETYPES.map((a) => [a.id, a]));
