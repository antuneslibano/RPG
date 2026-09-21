import type { ItemBase, MaterialGrade, QualityGrade, SpecialEffect } from '@/domain/items/item';
import type { AffixTemplate } from '@/domain/items/affixes';

/** 36 base items across every slot and category. */
export const ITEM_BASES: readonly ItemBase[] = [
  // --- Weapons: physical ---
  { baseId: 'base_shortsword', name: 'Espada Curta', category: 'weapon', slot: 'mainHand', tier: 1, baseValue: 26, damageType: 'physical', baseStats: { physicalAttack: 7, speed: 2 }, tags: ['blade', 'onehand'], classHint: ['warrior', 'rogue'] },
  { baseId: 'base_longsword', name: 'Espada', category: 'weapon', slot: 'mainHand', tier: 2, baseValue: 58, damageType: 'physical', baseStats: { physicalAttack: 13 }, tags: ['blade', 'onehand'], classHint: ['warrior'] },
  { baseId: 'base_greataxe', name: 'Machado Pesado', category: 'weapon', slot: 'mainHand', tier: 3, baseValue: 92, damageType: 'physical', baseStats: { physicalAttack: 21, speed: -3, critMultiplier: 12 }, tags: ['axe', 'twohand'], classHint: ['warrior'] },
  { baseId: 'base_dagger', name: 'Adaga', category: 'weapon', slot: 'mainHand', tier: 1, baseValue: 22, damageType: 'physical', baseStats: { physicalAttack: 5, critChance: 6, speed: 3 }, tags: ['blade', 'light'], classHint: ['rogue'] },
  { baseId: 'base_spear', name: 'Lança', category: 'weapon', slot: 'mainHand', tier: 2, baseValue: 54, damageType: 'physical', baseStats: { physicalAttack: 12, dodgeChance: 2 }, tags: ['polearm'], classHint: ['warrior', 'hunter'] },
  { baseId: 'base_bow', name: 'Arco', category: 'weapon', slot: 'mainHand', tier: 2, baseValue: 61, damageType: 'physical', baseStats: { physicalAttack: 11, critChance: 4 }, tags: ['ranged'], classHint: ['hunter', 'rogue'] },
  { baseId: 'base_warhammer', name: 'Martelo de Guerra', category: 'weapon', slot: 'mainHand', tier: 3, baseValue: 88, damageType: 'physical', baseStats: { physicalAttack: 19, defense: 3, speed: -2 }, tags: ['blunt', 'twohand'], classHint: ['warrior', 'cleric'] },
  // --- Weapons: magic ---
  { baseId: 'base_staff', name: 'Cajado', category: 'weapon', slot: 'mainHand', tier: 2, baseValue: 56, damageType: 'magic', baseStats: { magicAttack: 13, maxMana: 12 }, tags: ['staff'], classHint: ['mage', 'druid'] },
  { baseId: 'base_totem', name: 'Totem Rúnico', category: 'weapon', slot: 'mainHand', tier: 1, baseValue: 30, damageType: 'magic', baseStats: { magicAttack: 8, manaRegen: 1.5, wisdom: 1 }, tags: ['totem', 'nature'], classHint: ['druid'] },
  { baseId: 'base_grimoire', name: 'Grimório', category: 'weapon', slot: 'mainHand', tier: 3, baseValue: 95, damageType: 'magic', baseStats: { magicAttack: 20, intelligence: 2, maxMana: 18 }, tags: ['book'], classHint: ['mage'] },
  { baseId: 'base_censer', name: 'Turíbulo', category: 'weapon', slot: 'mainHand', tier: 2, baseValue: 60, damageType: 'magic', baseStats: { magicAttack: 11, hpRegen: 2, wisdom: 2 }, tags: ['holy'], classHint: ['cleric'] },
  // --- Off hand ---
  { baseId: 'base_buckler', name: 'Broquel', category: 'armor', slot: 'offHand', tier: 1, baseValue: 24, baseStats: { defense: 5, dodgeChance: 2 }, tags: ['shield', 'light'] },
  { baseId: 'base_kiteshield', name: 'Escudo Longo', category: 'armor', slot: 'offHand', tier: 3, baseValue: 84, baseStats: { defense: 16, maxHp: 22, speed: -2 }, tags: ['shield', 'heavy'] },
  { baseId: 'base_focus', name: 'Foco Arcano', category: 'accessory', slot: 'offHand', tier: 2, baseValue: 58, baseStats: { magicAttack: 7, maxMana: 20, manaRegen: 1 }, tags: ['arcane'] },
  // --- Head / chest / hands / feet ---
  { baseId: 'base_leather_cap', name: 'Capuz de Couro', category: 'armor', slot: 'helmet', tier: 1, baseValue: 18, baseStats: { defense: 4, dodgeChance: 1 }, tags: ['light'] },
  { baseId: 'base_iron_helm', name: 'Elmo de Ferro', category: 'armor', slot: 'helmet', tier: 2, baseValue: 46, baseStats: { defense: 10, maxHp: 14 }, tags: ['heavy'] },
  { baseId: 'base_hood', name: 'Capuz Élfico', category: 'armor', slot: 'helmet', tier: 2, baseValue: 44, baseStats: { magicResist: 7, wisdom: 1 }, tags: ['cloth'] },
  { baseId: 'base_leather_vest', name: 'Gibão de Couro', category: 'armor', slot: 'chest', tier: 1, baseValue: 30, baseStats: { defense: 8, maxHp: 16 }, tags: ['light'] },
  { baseId: 'base_chainmail', name: 'Cota de Malha', category: 'armor', slot: 'chest', tier: 2, baseValue: 74, baseStats: { defense: 17, maxHp: 30, speed: -1 }, tags: ['heavy'] },
  { baseId: 'base_robe', name: 'Manto de Linho', category: 'armor', slot: 'chest', tier: 1, baseValue: 28, baseStats: { magicResist: 8, maxMana: 14 }, tags: ['cloth'] },
  { baseId: 'base_gloves', name: 'Luvas de Couro', category: 'armor', slot: 'gloves', tier: 1, baseValue: 16, baseStats: { defense: 3, critChance: 2 }, tags: ['light'] },
  { baseId: 'base_gauntlets', name: 'Manoplas', category: 'armor', slot: 'gloves', tier: 2, baseValue: 42, baseStats: { defense: 8, physicalAttack: 3 }, tags: ['heavy'] },
  { baseId: 'base_boots', name: 'Botas de Viagem', category: 'armor', slot: 'boots', tier: 1, baseValue: 17, baseStats: { defense: 3, speed: 3 }, tags: ['light'] },
  { baseId: 'base_greaves', name: 'Grevas de Aço', category: 'armor', slot: 'boots', tier: 2, baseValue: 44, baseStats: { defense: 9, maxHp: 12, speed: -1 }, tags: ['heavy'] },
  // --- Belt / cloak ---
  { baseId: 'base_belt', name: 'Cinto de Couro', category: 'armor', slot: 'belt', tier: 1, baseValue: 15, baseStats: { maxHp: 12, defense: 2 }, tags: ['light'] },
  { baseId: 'base_sash', name: 'Faixa Ritual', category: 'armor', slot: 'belt', tier: 2, baseValue: 40, baseStats: { maxMana: 16, manaRegen: 1.2 }, tags: ['cloth'] },
  { baseId: 'base_cloak', name: 'Capa de Viajante', category: 'armor', slot: 'cloak', tier: 1, baseValue: 22, baseStats: { magicResist: 5, dodgeChance: 2 }, tags: ['cloth'] },
  { baseId: 'base_pelt_cloak', name: 'Manto de Peles', category: 'armor', slot: 'cloak', tier: 2, baseValue: 50, baseStats: { maxHp: 20, magicResist: 8 }, tags: ['fur'] },
  // --- Accessories ---
  { baseId: 'base_amulet', name: 'Amuleto', category: 'accessory', slot: 'amulet', tier: 1, baseValue: 34, baseStats: { magicResist: 4, wisdom: 1 }, tags: ['jewel'] },
  { baseId: 'base_pendant', name: 'Pingente Rúnico', category: 'accessory', slot: 'amulet', tier: 3, baseValue: 96, baseStats: { magicAttack: 6, intelligence: 2, maxMana: 15 }, tags: ['jewel', 'rune'] },
  { baseId: 'base_bracelet', name: 'Bracelete', category: 'accessory', slot: 'bracelet', tier: 1, baseValue: 28, baseStats: { critChance: 2, dexterity: 1 }, tags: ['jewel'] },
  { baseId: 'base_ring', name: 'Anel', category: 'accessory', slot: 'ring', tier: 1, baseValue: 32, baseStats: { luck: 1, critChance: 1 }, tags: ['jewel'] },
  { baseId: 'base_signet', name: 'Anel-Selo', category: 'accessory', slot: 'ring', tier: 3, baseValue: 110, baseStats: { physicalAttack: 4, magicAttack: 4, luck: 2 }, tags: ['jewel', 'noble'] },
  { baseId: 'base_idol', name: 'Ídolo Antigo', category: 'accessory', slot: 'artifact', tier: 3, baseValue: 130, baseStats: { maxHp: 25, maxMana: 20, wisdom: 2 }, tags: ['relic'] },
  { baseId: 'base_seed_relic', name: 'Semente Primordial', category: 'accessory', slot: 'artifact', tier: 2, baseValue: 88, baseStats: { hpRegen: 3, manaRegen: 2 }, tags: ['relic', 'nature'] },
  // --- Consumables & materials ---
  { baseId: 'base_potion_minor', name: 'Poção Menor de Cura', category: 'consumable', slot: null, tier: 1, baseValue: 12, baseStats: {}, tags: ['potion'], stackable: true, consumableEffect: { kind: 'heal', amount: 60 }, description: 'Restaura 60 de vida.' },
  { baseId: 'base_potion_mana', name: 'Elixir de Mana', category: 'consumable', slot: null, tier: 1, baseValue: 14, baseStats: {}, tags: ['potion'], stackable: true, consumableEffect: { kind: 'mana', amount: 45 }, description: 'Restaura 45 de mana.' },
  { baseId: 'base_antidote', name: 'Antídoto', category: 'consumable', slot: null, tier: 1, baseValue: 10, baseStats: {}, tags: ['potion'], stackable: true, consumableEffect: { kind: 'cleanse', amount: 1 }, description: 'Remove venenos e maldições leves.' },
  { baseId: 'base_herb', name: 'Erva Silvestre', category: 'material', slot: null, tier: 1, baseValue: 4, baseStats: {}, tags: ['herb'], stackable: true, description: 'Componente comum de alquimia.' },
  { baseId: 'base_pelt', name: 'Pele Curtida', category: 'material', slot: null, tier: 1, baseValue: 6, baseStats: {}, tags: ['leather'], stackable: true, description: 'Usada por peleteiros e ferreiros.' },
  { baseId: 'base_ore', name: 'Minério Bruto', category: 'material', slot: null, tier: 2, baseValue: 9, baseStats: {}, tags: ['metal'], stackable: true, description: 'Precisa ser fundido para ter uso.' },
  { baseId: 'base_essence', name: 'Essência Espiritual', category: 'material', slot: null, tier: 3, baseValue: 22, baseStats: {}, tags: ['arcane'], stackable: true, description: 'Resíduo deixado por criaturas espectrais.' },
];

export const MATERIALS: readonly MaterialGrade[] = [
  { id: 'mat_linen', name: 'de Linho', tier: 1, multiplier: 0.9, tags: ['cloth'] },
  { id: 'mat_leather', name: 'de Couro', tier: 1, multiplier: 1.0, tags: ['light', 'leather'] },
  { id: 'mat_iron', name: 'de Ferro', tier: 1, multiplier: 1.08, tags: ['metal'] },
  { id: 'mat_oak', name: 'de Carvalho', tier: 1, multiplier: 1.05, tags: ['wood', 'nature'] },
  { id: 'mat_steel', name: 'de Aço', tier: 2, multiplier: 1.28, tags: ['metal'] },
  { id: 'mat_silver', name: 'de Prata', tier: 2, multiplier: 1.34, tags: ['metal', 'holy'] },
  { id: 'mat_ironwood', name: 'de Madeira-de-ferro', tier: 2, multiplier: 1.3, tags: ['wood', 'nature'] },
  { id: 'mat_blacksteel', name: 'de Aço Negro', tier: 3, multiplier: 1.58, tags: ['metal', 'rare'] },
  { id: 'mat_moonsilver', name: 'de Prata Lunar', tier: 3, multiplier: 1.62, tags: ['metal', 'arcane'] },
  { id: 'mat_heartwood', name: 'de Cerne Ancião', tier: 3, multiplier: 1.6, tags: ['wood', 'nature', 'rare'] },
  { id: 'mat_runesteel', name: 'de Aço Rúnico', tier: 4, multiplier: 1.95, tags: ['metal', 'rune'] },
  { id: 'mat_voidstone', name: 'de Pedra do Vazio', tier: 4, multiplier: 2.1, tags: ['arcane', 'corrupt'] },
];

export const QUALITIES: readonly QualityGrade[] = [
  { id: 'q_crude', name: 'Tosca', multiplier: 0.82, weight: 18 },
  { id: 'q_plain', name: '', multiplier: 1, weight: 40 },
  { id: 'q_fine', name: 'Fina', multiplier: 1.16, weight: 24 },
  { id: 'q_refined', name: 'Refinada', multiplier: 1.34, weight: 12 },
  { id: 'q_masterwork', name: 'Magistral', multiplier: 1.58, weight: 5 },
  { id: 'q_ancient', name: 'Ancestral', multiplier: 1.85, weight: 1 },
];

export const AFFIX_TEMPLATES: readonly AffixTemplate[] = [
  // Prefixes
  { id: 'pre_sharp', label: 'Afiada', stat: 'physicalAttack', min: 2, max: 9, kind: 'prefix', categories: ['weapon'], weight: 30 },
  { id: 'pre_burning', label: 'Ardente', stat: 'magicAttack', min: 2, max: 9, kind: 'prefix', categories: ['weapon', 'accessory'], weight: 26 },
  { id: 'pre_sturdy', label: 'Robusta', stat: 'defense', min: 2, max: 8, kind: 'prefix', categories: ['armor'], weight: 30 },
  { id: 'pre_warded', label: 'Protegida', stat: 'magicResist', min: 2, max: 8, kind: 'prefix', categories: ['armor', 'accessory'], weight: 24 },
  { id: 'pre_vital', label: 'Vigorosa', stat: 'maxHp', min: 8, max: 34, kind: 'prefix', weight: 26 },
  { id: 'pre_arcane', label: 'Arcana', stat: 'maxMana', min: 6, max: 26, kind: 'prefix', weight: 22 },
  { id: 'pre_swift', label: 'Célere', stat: 'speed', min: 1, max: 5, kind: 'prefix', weight: 18 },
  { id: 'pre_cruel', label: 'Cruel', stat: 'critChance', min: 1, max: 6, kind: 'prefix', weight: 16 },
  { id: 'pre_feral', label: 'Selvagem', stat: 'strength', min: 1, max: 4, kind: 'prefix', weight: 14 },
  { id: 'pre_lucid', label: 'Lúcida', stat: 'intelligence', min: 1, max: 4, kind: 'prefix', weight: 14 },
  // Suffixes
  { id: 'suf_hunter', label: 'do Caçador', stat: 'critChance', min: 2, max: 7, kind: 'suffix', weight: 22 },
  { id: 'suf_bear', label: 'do Urso', stat: 'maxHp', min: 10, max: 40, kind: 'suffix', weight: 24 },
  { id: 'suf_fox', label: 'da Raposa', stat: 'dodgeChance', min: 1, max: 6, kind: 'suffix', weight: 20 },
  { id: 'suf_sage', label: 'do Sábio', stat: 'wisdom', min: 1, max: 4, kind: 'suffix', weight: 18 },
  { id: 'suf_wolf', label: 'do Lobo', stat: 'agility', min: 1, max: 4, kind: 'suffix', weight: 20 },
  { id: 'suf_mountain', label: 'da Montanha', stat: 'vitality', min: 1, max: 4, kind: 'suffix', weight: 20 },
  { id: 'suf_river', label: 'do Rio', stat: 'manaRegen', min: 0.5, max: 3, kind: 'suffix', weight: 16 },
  { id: 'suf_grove', label: 'do Bosque', stat: 'hpRegen', min: 0.5, max: 3, kind: 'suffix', weight: 16 },
  { id: 'suf_executioner', label: 'do Carrasco', stat: 'critMultiplier', min: 5, max: 22, kind: 'suffix', categories: ['weapon'], weight: 10 },
  { id: 'suf_thief', label: 'do Larápio', stat: 'luck', min: 1, max: 4, kind: 'suffix', weight: 12 },
];

export const SPECIAL_EFFECTS: readonly SpecialEffect[] = [
  { id: 'sp_beastbane', label: 'Flagelo das Feras', description: '+20% de dano contra feras.', trigger: 'onHit', magnitude: 20, vsFamily: 'beast' },
  { id: 'sp_undeadbane', label: 'Luz Consagrada', description: '+25% de dano contra mortos-vivos.', trigger: 'onHit', magnitude: 25, vsFamily: 'undead' },
  { id: 'sp_leech', label: 'Sanguessuga', description: 'Cura 8% do dano causado.', trigger: 'onHit', magnitude: 8 },
  { id: 'sp_thorns', label: 'Espinhos', description: 'Reflete 12% do dano recebido.', trigger: 'onDamaged', magnitude: 12 },
  { id: 'sp_momentum', label: 'Ímpeto', description: 'Ao abater, recupera 10% da mana.', trigger: 'onKill', magnitude: 10 },
  { id: 'sp_shatter', label: 'Estilhaçar', description: 'Críticos reduzem a defesa do alvo.', trigger: 'onCrit', magnitude: 15 },
];

export const ITEM_BASE_BY_ID: Record<string, ItemBase> = Object.fromEntries(
  ITEM_BASES.map((base) => [base.baseId, base]),
);
