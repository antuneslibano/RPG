import type { CreatureBase, CreatureVariant } from '@/domain/combat/creature';

/** 24 creature bases; variants multiply these into 100+ distinct encounters. */
export const CREATURE_BASES: readonly CreatureBase[] = [
  { baseId: 'cre_wolf', name: 'Lobo', family: 'beast', levelRange: [1, 8], biomes: ['forest', 'plains', 'snow', 'ancientForest'], hpMultiplier: 0.9, attackMultiplier: 1.05, defenseMultiplier: 0.85, speedBonus: 3, damageType: 'physical', artKey: 'art.creature.wolf', lore: 'Caçam em alcateia e lembram de quem as feriu.', lootTableIds: ['loot_beast'], abilities: [{ id: 'ab_bite', name: 'Dilacerar', description: 'Mordida que causa sangramento.', power: 1.2, cooldown: 2, targeting: 'enemy', status: { kind: 'bleed', magnitude: 4, turns: 2, chance: 0.5 } }] },
  { baseId: 'cre_boar', name: 'Javali', family: 'beast', levelRange: [2, 10], biomes: ['forest', 'plains', 'swamp'], hpMultiplier: 1.2, attackMultiplier: 1.0, defenseMultiplier: 1.05, speedBonus: -1, damageType: 'physical', artKey: 'art.creature.boar', lore: 'Territorial e teimoso; não recua.', lootTableIds: ['loot_beast'], abilities: [{ id: 'ab_charge', name: 'Investida', description: 'Avanço brutal.', power: 1.5, cooldown: 3, targeting: 'enemy' }] },
  { baseId: 'cre_spider', name: 'Aranha Venenosa', family: 'beast', levelRange: [3, 11], biomes: ['caves', 'swamp', 'ruins', 'ancientForest'], hpMultiplier: 0.8, attackMultiplier: 0.95, defenseMultiplier: 0.8, speedBonus: 4, damageType: 'physical', artKey: 'art.creature.spider', lore: 'Tece em silêncio e espera.', lootTableIds: ['loot_beast'], abilities: [{ id: 'ab_venom', name: 'Presas Tóxicas', description: 'Aplica veneno forte.', power: 0.8, cooldown: 2, targeting: 'enemy', status: { kind: 'poison', magnitude: 7, turns: 3, chance: 0.75 } }] },
  { baseId: 'cre_bear', name: 'Urso', family: 'beast', levelRange: [6, 16], biomes: ['forest', 'mountains', 'snow'], hpMultiplier: 1.5, attackMultiplier: 1.2, defenseMultiplier: 1.1, speedBonus: -2, damageType: 'physical', artKey: 'art.creature.bear', lore: 'Um golpe basta para encerrar uma caçada.', lootTableIds: ['loot_beast'], abilities: [{ id: 'ab_maul', name: 'Esmagar', description: 'Golpe de garras devastador.', power: 1.7, cooldown: 3, targeting: 'enemy' }] },
  { baseId: 'cre_harpy', name: 'Harpia', family: 'beast', levelRange: [8, 18], biomes: ['mountains', 'ruins', 'coast'], hpMultiplier: 0.85, attackMultiplier: 1.1, defenseMultiplier: 0.75, speedBonus: 6, damageType: 'physical', artKey: 'art.creature.harpy', lore: 'O grito vem antes das garras.', lootTableIds: ['loot_beast'], abilities: [{ id: 'ab_screech', name: 'Grito Agudo', description: 'Pode atordoar.', power: 0.7, cooldown: 4, targeting: 'enemy', status: { kind: 'stun', magnitude: 1, turns: 1, chance: 0.35 } }] },
  { baseId: 'cre_skeleton', name: 'Esqueleto', family: 'undead', levelRange: [2, 12], biomes: ['ruins', 'caves', 'corrupted'], hpMultiplier: 0.9, attackMultiplier: 1.0, defenseMultiplier: 1.15, speedBonus: 0, damageType: 'physical', artKey: 'art.creature.skeleton', lore: 'Move-se por vontade que não é sua.', lootTableIds: ['loot_undead'], abilities: [{ id: 'ab_rattle', name: 'Golpe Ósseo', description: 'Ataque seco e preciso.', power: 1.25, cooldown: 2, targeting: 'enemy' }] },
  { baseId: 'cre_ghoul', name: 'Carniçal', family: 'undead', levelRange: [5, 15], biomes: ['ruins', 'swamp', 'corrupted'], hpMultiplier: 1.1, attackMultiplier: 1.05, defenseMultiplier: 0.95, speedBonus: 2, damageType: 'physical', artKey: 'art.creature.ghoul', lore: 'Segue o cheiro de quem ainda respira.', lootTableIds: ['loot_undead'], abilities: [{ id: 'ab_rot', name: 'Garra Pútrida', description: 'Fere e enfraquece.', power: 1.1, cooldown: 3, targeting: 'enemy', status: { kind: 'weaken', magnitude: 15, turns: 2, chance: 0.6 } }] },
  { baseId: 'cre_wight', name: 'Espectro Sepulcral', family: 'undead', levelRange: [9, 20], biomes: ['ruins', 'corrupted', 'caves'], hpMultiplier: 1.0, attackMultiplier: 1.25, defenseMultiplier: 0.9, speedBonus: 1, damageType: 'magic', artKey: 'art.creature.wight', lore: 'Guarda um nome que ninguém mais pronuncia.', lootTableIds: ['loot_undead', 'loot_arcane'], abilities: [{ id: 'ab_drain', name: 'Drenar Vida', description: 'Fere e se cura.', power: 1.2, cooldown: 3, targeting: 'enemy', heal: 18 }] },
  { baseId: 'cre_bandit', name: 'Bandido', family: 'humanoid', levelRange: [1, 12], biomes: ['plains', 'forest', 'ruins', 'coast'], hpMultiplier: 1.0, attackMultiplier: 1.0, defenseMultiplier: 1.0, speedBonus: 1, damageType: 'physical', artKey: 'art.creature.bandit', lore: 'Tem família em algum lugar — e ela vai saber.', lootTableIds: ['loot_humanoid'], abilities: [{ id: 'ab_cheap', name: 'Golpe Sujo', description: 'Ataque com chance de atordoar.', power: 1.15, cooldown: 3, targeting: 'enemy', status: { kind: 'stun', magnitude: 1, turns: 1, chance: 0.25 } }] },
  { baseId: 'cre_plague_priest', name: 'Sacerdote da Peste', family: 'humanoid', levelRange: [4, 14], biomes: ['swamp', 'ruins', 'corrupted'], hpMultiplier: 0.95, attackMultiplier: 1.15, defenseMultiplier: 0.85, speedBonus: 0, damageType: 'magic', artKey: 'art.creature.plague', lore: 'Prega que a doença é misericórdia.', lootTableIds: ['loot_humanoid', 'loot_arcane'], abilities: [{ id: 'ab_miasma', name: 'Miasma', description: 'Veneno persistente.', power: 0.85, cooldown: 2, targeting: 'enemy', status: { kind: 'poison', magnitude: 9, turns: 4, chance: 0.8 } }] },
  { baseId: 'cre_wild_elf', name: 'Elfo Selvagem', family: 'humanoid', levelRange: [8, 18], biomes: ['ancientForest', 'forest'], hpMultiplier: 0.95, attackMultiplier: 1.2, defenseMultiplier: 0.9, speedBonus: 4, damageType: 'physical', artKey: 'art.creature.elf', lore: 'Defende um limite que você não vê.', lootTableIds: ['loot_humanoid'], abilities: [{ id: 'ab_volley', name: 'Rajada de Flechas', description: 'Dois disparos rápidos.', power: 0.8, cooldown: 3, targeting: 'enemy' }] },
  { baseId: 'cre_goblin', name: 'Goblin da Mata', family: 'humanoid', levelRange: [3, 13], biomes: ['forest', 'caves', 'swamp'], hpMultiplier: 0.75, attackMultiplier: 0.9, defenseMultiplier: 0.85, speedBonus: 3, damageType: 'physical', artKey: 'art.creature.goblin', lore: 'Nunca aparece sozinho.', lootTableIds: ['loot_humanoid'], abilities: [{ id: 'ab_swarm', name: 'Enxame', description: 'Vários golpes fracos.', power: 0.55, cooldown: 1, targeting: 'enemy' }] },
  { baseId: 'cre_imp', name: 'Diabrete', family: 'demon', levelRange: [6, 16], biomes: ['corrupted', 'ruins', 'caves'], hpMultiplier: 0.8, attackMultiplier: 1.2, defenseMultiplier: 0.8, speedBonus: 5, damageType: 'magic', artKey: 'art.creature.imp', lore: 'Ri antes de queimar.', lootTableIds: ['loot_demon', 'loot_arcane'], abilities: [{ id: 'ab_ember', name: 'Brasa', description: 'Fogo que continua queimando.', power: 1.0, cooldown: 2, targeting: 'enemy', status: { kind: 'burn', magnitude: 8, turns: 3, chance: 0.7 } }] },
  { baseId: 'cre_hellhound', name: 'Cão Infernal', family: 'demon', levelRange: [10, 22], biomes: ['corrupted', 'caves'], hpMultiplier: 1.2, attackMultiplier: 1.3, defenseMultiplier: 1.0, speedBonus: 4, damageType: 'magic', artKey: 'art.creature.hellhound', lore: 'Onde pisa, a grama não volta.', lootTableIds: ['loot_demon'], abilities: [{ id: 'ab_pyre', name: 'Baforada', description: 'Chamas concentradas.', power: 1.6, cooldown: 3, targeting: 'enemy', status: { kind: 'burn', magnitude: 12, turns: 2, chance: 0.8 } }] },
  { baseId: 'cre_rune_golem', name: 'Gólem Rúnico', family: 'construct', levelRange: [7, 17], biomes: ['ruins', 'mountains', 'ancientForest'], hpMultiplier: 1.7, attackMultiplier: 1.0, defenseMultiplier: 1.5, speedBonus: -4, damageType: 'physical', artKey: 'art.creature.golem', lore: 'Ainda cumpre uma ordem dada há séculos.', lootTableIds: ['loot_construct', 'loot_arcane'], abilities: [{ id: 'ab_slam', name: 'Impacto Rúnico', description: 'Golpe pesado que reduz velocidade.', power: 1.5, cooldown: 3, targeting: 'enemy', status: { kind: 'slow', magnitude: 4, turns: 2, chance: 0.6 } }] },
  { baseId: 'cre_animated_armor', name: 'Armadura Animada', family: 'construct', levelRange: [5, 15], biomes: ['ruins', 'caves'], hpMultiplier: 1.35, attackMultiplier: 0.95, defenseMultiplier: 1.4, speedBonus: -3, damageType: 'physical', artKey: 'art.creature.armor', lore: 'Vazia, e ainda assim atenta.', lootTableIds: ['loot_construct'], abilities: [{ id: 'ab_guard', name: 'Postura de Guarda', description: 'Aumenta a própria defesa.', power: 0, cooldown: 4, targeting: 'self', status: { kind: 'fortify', magnitude: 30, turns: 2, chance: 1 } }] },
  { baseId: 'cre_wisp', name: 'Fogo-fátuo', family: 'spirit', levelRange: [1, 9], biomes: ['swamp', 'forest', 'ancientForest'], hpMultiplier: 0.6, attackMultiplier: 1.1, defenseMultiplier: 0.6, speedBonus: 6, damageType: 'magic', artKey: 'art.creature.wisp', lore: 'Leva viajantes para onde não deveriam ir.', lootTableIds: ['loot_arcane'], abilities: [{ id: 'ab_flicker', name: 'Cintilar', description: 'Ataque mágico evasivo.', power: 1.1, cooldown: 2, targeting: 'enemy' }] },
  { baseId: 'cre_leaf_spirit', name: 'Espírito da Folha', family: 'spirit', levelRange: [1, 10], biomes: ['forest', 'ancientForest'], hpMultiplier: 0.8, attackMultiplier: 0.85, defenseMultiplier: 0.9, speedBonus: 2, damageType: 'magic', artKey: 'art.creature.leafspirit', lore: 'Guarda árvores mais velhas que o reino.', lootTableIds: ['loot_arcane'], abilities: [{ id: 'ab_mend', name: 'Seiva', description: 'Cura a si mesmo.', power: 0, cooldown: 4, targeting: 'self', heal: 22 }] },
  { baseId: 'cre_pixie', name: 'Pixie da Fonte', family: 'spirit', levelRange: [2, 8], biomes: ['forest', 'coast', 'ancientForest'], hpMultiplier: 0.65, attackMultiplier: 0.9, defenseMultiplier: 0.7, speedBonus: 7, damageType: 'magic', artKey: 'art.creature.pixie', lore: 'Troca favores por segredos.', lootTableIds: ['loot_arcane'], abilities: [{ id: 'ab_hex', name: 'Pequena Maldição', description: 'Enfraquece o alvo.', power: 0.6, cooldown: 3, targeting: 'enemy', status: { kind: 'weaken', magnitude: 18, turns: 3, chance: 0.7 } }] },
  { baseId: 'cre_mud_elemental', name: 'Elemental de Lodo', family: 'elemental', levelRange: [4, 14], biomes: ['swamp', 'coast'], hpMultiplier: 1.4, attackMultiplier: 0.95, defenseMultiplier: 1.2, speedBonus: -3, damageType: 'physical', artKey: 'art.creature.mud', lore: 'O pântano aprendeu a se mover.', lootTableIds: ['loot_elemental'], abilities: [{ id: 'ab_engulf', name: 'Engolfar', description: 'Prende e retarda.', power: 1.0, cooldown: 3, targeting: 'enemy', status: { kind: 'slow', magnitude: 5, turns: 3, chance: 0.7 } }] },
  { baseId: 'cre_frost_elemental', name: 'Elemental de Gelo', family: 'elemental', levelRange: [9, 20], biomes: ['snow', 'mountains', 'caves'], hpMultiplier: 1.25, attackMultiplier: 1.2, defenseMultiplier: 1.1, speedBonus: -1, damageType: 'magic', artKey: 'art.creature.frost', lore: 'O frio não vem do inverno.', lootTableIds: ['loot_elemental', 'loot_arcane'], abilities: [{ id: 'ab_freeze', name: 'Lasca Congelante', description: 'Dano mágico com lentidão.', power: 1.35, cooldown: 3, targeting: 'enemy', status: { kind: 'slow', magnitude: 6, turns: 2, chance: 0.8 } }] },
  { baseId: 'cre_mushroom', name: 'Cogumilo', family: 'aberration', levelRange: [4, 12], biomes: ['caves', 'swamp', 'ancientForest'], hpMultiplier: 1.15, attackMultiplier: 0.9, defenseMultiplier: 1.0, speedBonus: -2, damageType: 'magic', artKey: 'art.creature.mushroom', lore: 'Cresce onde alguém foi enterrado sem nome.', lootTableIds: ['loot_beast'], abilities: [{ id: 'ab_spores', name: 'Esporos', description: 'Veneno em nuvem.', power: 0.75, cooldown: 2, targeting: 'enemy', status: { kind: 'poison', magnitude: 6, turns: 3, chance: 0.75 } }] },
  { baseId: 'cre_serpent', name: 'Serpente', family: 'beast', levelRange: [1, 7], biomes: ['swamp', 'plains', 'coast', 'forest'], hpMultiplier: 0.7, attackMultiplier: 0.95, defenseMultiplier: 0.7, speedBonus: 4, damageType: 'physical', artKey: 'art.creature.serpent', lore: 'Rápida demais para quem hesita.', lootTableIds: ['loot_beast'], abilities: [{ id: 'ab_strike', name: 'Bote', description: 'Ataque veloz e venenoso.', power: 0.95, cooldown: 2, targeting: 'enemy', status: { kind: 'poison', magnitude: 5, turns: 2, chance: 0.55 } }] },
  { baseId: 'cre_dwarf_raider', name: 'Anão Batedor', family: 'humanoid', levelRange: [2, 11], biomes: ['mountains', 'caves', 'ruins'], hpMultiplier: 1.15, attackMultiplier: 1.0, defenseMultiplier: 1.2, speedBonus: -1, damageType: 'physical', artKey: 'art.creature.dwarf', lore: 'Mineirou até encontrar algo que não devia.', lootTableIds: ['loot_humanoid', 'loot_construct'], abilities: [{ id: 'ab_pick', name: 'Picareta Pesada', description: 'Ignora parte da defesa.', power: 1.3, cooldown: 3, targeting: 'enemy' }] },
];

/** The three vertical-slice bosses, each with its own mechanic. */
export const BOSS_BASES: readonly CreatureBase[] = [
  {
    baseId: 'boss_warden', name: 'Guardião do Posto', family: 'construct', levelRange: [7, 12],
    biomes: ['ruins'], hpMultiplier: 4.2, attackMultiplier: 1.35, defenseMultiplier: 1.6, speedBonus: -2,
    damageType: 'physical', artKey: 'art.creature.boss_warden', isBoss: true,
    lore: 'Foi erguido para proteger o posto. Ninguém lhe disse que o posto caiu.',
    lootTableIds: ['loot_construct', 'loot_boss'],
    abilities: [
      { id: 'ab_warden_slam', name: 'Punho de Pedra', description: 'Golpe pesado com lentidão.', power: 1.55, cooldown: 3, targeting: 'enemy', status: { kind: 'slow', magnitude: 5, turns: 2, chance: 0.7 } },
      { id: 'ab_warden_repair', name: 'Protocolo de Reparo', description: 'Restaura estrutura quando ferido.', power: 0, cooldown: 5, targeting: 'self', heal: 90, belowHpRatio: 0.5 },
    ],
    phases: [{ atHpRatio: 0.5, announce: 'As runas do Guardião acendem — ele acelera.', attackBonus: 0.3 }],
  },
  {
    baseId: 'boss_defiler', name: 'Profanador do Santuário', family: 'undead', levelRange: [9, 15],
    biomes: ['corrupted'], hpMultiplier: 3.6, attackMultiplier: 1.55, defenseMultiplier: 1.1, speedBonus: 2,
    damageType: 'magic', artKey: 'art.creature.boss_defiler', isBoss: true,
    lore: 'Profanou o santuário para responder a uma pergunta que ninguém fez.',
    lootTableIds: ['loot_undead', 'loot_arcane', 'loot_boss'],
    abilities: [
      { id: 'ab_defiler_wave', name: 'Onda Profana', description: 'Dano mágico com enfraquecimento.', power: 1.4, cooldown: 2, targeting: 'enemy', status: { kind: 'weaken', magnitude: 22, turns: 3, chance: 0.75 } },
      { id: 'ab_defiler_drain', name: 'Colher Almas', description: 'Drena vida do alvo.', power: 1.25, cooldown: 4, targeting: 'enemy', heal: 70, belowHpRatio: 0.6 },
    ],
    phases: [{ atHpRatio: 0.35, announce: 'O Profanador abandona a forma contida.', attackBonus: 0.45 }],
  },
  {
    baseId: 'boss_bonemother', name: 'Mãe dos Ossos', family: 'aberration', levelRange: [11, 18],
    biomes: ['caves'], hpMultiplier: 4.8, attackMultiplier: 1.3, defenseMultiplier: 1.25, speedBonus: 0,
    damageType: 'physical', artKey: 'art.creature.boss_bonemother', isBoss: true,
    lore: 'A gruta não é o covil dela. A gruta é ela.',
    lootTableIds: ['loot_beast', 'loot_boss'],
    abilities: [
      { id: 'ab_bone_lash', name: 'Chicote de Ossos', description: 'Três golpes em sequência.', power: 0.72, cooldown: 2, targeting: 'enemy' },
      { id: 'ab_bone_cocoon', name: 'Casulo de Ossos', description: 'Fortifica-se e regenera.', power: 0, cooldown: 6, targeting: 'self', heal: 110, status: { kind: 'fortify', magnitude: 40, turns: 2, chance: 1 }, belowHpRatio: 0.45 },
    ],
    phases: [
      { atHpRatio: 0.7, announce: 'O chão estala: a Mãe dos Ossos desperta por completo.', attackBonus: 0.2 },
      { atHpRatio: 0.3, announce: 'Ossos recobrem cada parede da gruta.', attackBonus: 0.5 },
    ],
  },
];

export const CREATURE_VARIANTS: readonly CreatureVariant[] = [
  { id: 'var_none', name: '', position: 'suffix', hpMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, speedBonus: 0, xpMultiplier: 1, minLevel: 1, weight: 100 },
  { id: 'var_grey', name: 'Cinzento', position: 'suffix', hpMultiplier: 1.08, attackMultiplier: 1.05, defenseMultiplier: 1.05, speedBonus: 0, xpMultiplier: 1.15, minLevel: 2, weight: 34 },
  { id: 'var_young', name: 'Jovem', position: 'suffix', hpMultiplier: 0.78, attackMultiplier: 0.85, defenseMultiplier: 0.85, speedBonus: 2, xpMultiplier: 0.8, minLevel: 1, weight: 26 },
  { id: 'var_alpha', name: 'Alfa', position: 'suffix', hpMultiplier: 1.45, attackMultiplier: 1.28, defenseMultiplier: 1.15, speedBonus: 2, xpMultiplier: 1.7, minLevel: 4, weight: 14 },
  { id: 'var_corrupted', name: 'Corrompido', position: 'suffix', hpMultiplier: 1.25, attackMultiplier: 1.35, defenseMultiplier: 0.95, speedBonus: 1, xpMultiplier: 1.6, minLevel: 6, biomes: ['corrupted', 'ruins', 'swamp'], weight: 12 },
  { id: 'var_spectral', name: 'Espectral', position: 'suffix', hpMultiplier: 0.9, attackMultiplier: 1.4, defenseMultiplier: 0.8, speedBonus: 5, xpMultiplier: 1.75, minLevel: 8, biomes: ['ruins', 'corrupted', 'caves'], weight: 8 },
  { id: 'var_ancient', name: 'Ancião', position: 'suffix', hpMultiplier: 1.6, attackMultiplier: 1.3, defenseMultiplier: 1.35, speedBonus: -1, xpMultiplier: 2.1, minLevel: 10, weight: 6 },
  { id: 'var_starving', name: 'Faminto', position: 'suffix', hpMultiplier: 0.85, attackMultiplier: 1.2, defenseMultiplier: 0.8, speedBonus: 3, xpMultiplier: 1.1, minLevel: 2, weight: 18 },
  { id: 'var_scarred', name: 'Marcado', position: 'suffix', hpMultiplier: 1.2, attackMultiplier: 1.12, defenseMultiplier: 1.2, speedBonus: 0, xpMultiplier: 1.35, minLevel: 5, weight: 16 },
];

export const CREATURE_BASE_BY_ID: Record<string, CreatureBase> = Object.fromEntries(
  [...CREATURE_BASES, ...BOSS_BASES].map((base) => [base.baseId, base]),
);

export const VARIANT_BY_ID: Record<string, CreatureVariant> = Object.fromEntries(
  CREATURE_VARIANTS.map((variant) => [variant.id, variant]),
);
