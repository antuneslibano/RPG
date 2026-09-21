import type { Attributes } from '@/domain/player/attributes';
import type { SkillTree } from '@/domain/skills/skill';

export type ClassId = 'warrior' | 'rogue' | 'mage' | 'druid' | 'hunter' | 'cleric';

export interface HeroClass {
  id: ClassId;
  name: string;
  tagline: string;
  identity: string;
  strengths: readonly string[];
  weaknesses: readonly string[];
  baseAttributes: Attributes;
  startingItems: readonly { baseId: string; quantity: number; equip?: boolean }[];
  /** Fully implemented and balanced for the vertical slice. */
  playable: boolean;
  primaryStat: 'physicalAttack' | 'magicAttack';
  portraitKey: string;
}

export const HERO_CLASSES: readonly HeroClass[] = [
  {
    id: 'druid',
    name: 'Druida',
    tagline: 'A floresta responde a quem a escuta.',
    identity: 'Conjurador de natureza que alterna entre dano contínuo, cura e formas bestiais.',
    strengths: ['Sustentação em lutas longas', 'Controle por venenos e raízes', 'Recursos próprios de cura'],
    weaknesses: ['Dano inicial baixo', 'Armadura leve'],
    baseAttributes: { strength: 4, vitality: 7, intelligence: 6, wisdom: 9, dexterity: 4, agility: 5, luck: 4 },
    startingItems: [
      { baseId: 'base_totem', quantity: 1, equip: true },
      { baseId: 'base_robe', quantity: 1, equip: true },
      { baseId: 'base_boots', quantity: 1, equip: true },
      { baseId: 'base_potion_minor', quantity: 3 },
      { baseId: 'base_herb', quantity: 4 },
    ],
    playable: true,
    primaryStat: 'magicAttack',
    portraitKey: 'art.portrait.druid',
  },
  {
    id: 'warrior',
    name: 'Guerreiro',
    tagline: 'Aço, disciplina e uma parede que não cede.',
    identity: 'Linha de frente com alta vida e mitigação, punindo inimigos que insistem.',
    strengths: ['Maior vida do jogo', 'Defesa alta', 'Confiável sem equipamento raro'],
    weaknesses: ['Pouca mobilidade', 'Dano mágico inexistente'],
    baseAttributes: { strength: 9, vitality: 9, intelligence: 3, wisdom: 4, dexterity: 5, agility: 4, luck: 4 },
    startingItems: [
      { baseId: 'base_longsword', quantity: 1, equip: true },
      { baseId: 'base_buckler', quantity: 1, equip: true },
      { baseId: 'base_leather_vest', quantity: 1, equip: true },
      { baseId: 'base_potion_minor', quantity: 3 },
    ],
    playable: false,
    primaryStat: 'physicalAttack',
    portraitKey: 'art.portrait.warrior',
  },
  {
    id: 'rogue',
    name: 'Ladino',
    tagline: 'Uma única abertura basta.',
    identity: 'Dano explosivo por crítico, evasão e venenos aplicados na sombra.',
    strengths: ['Crítico altíssimo', 'Esquiva', 'Fuga garantida'],
    weaknesses: ['Frágil', 'Depende de acertar primeiro'],
    baseAttributes: { strength: 5, vitality: 5, intelligence: 4, wisdom: 4, dexterity: 9, agility: 8, luck: 6 },
    startingItems: [
      { baseId: 'base_dagger', quantity: 1, equip: true },
      { baseId: 'base_leather_cap', quantity: 1, equip: true },
      { baseId: 'base_leather_vest', quantity: 1, equip: true },
      { baseId: 'base_potion_minor', quantity: 2 },
    ],
    playable: false,
    primaryStat: 'physicalAttack',
    portraitKey: 'art.portrait.rogue',
  },
  {
    id: 'mage',
    name: 'Mago',
    tagline: 'O mundo é uma equação e você tem o giz.',
    identity: 'Dano mágico em área, controle e escalonamento agressivo com Inteligência.',
    strengths: ['Maior dano em área', 'Controle de turno'],
    weaknesses: ['Vida baixa', 'Dependente de mana'],
    baseAttributes: { strength: 3, vitality: 4, intelligence: 10, wisdom: 7, dexterity: 5, agility: 5, luck: 5 },
    startingItems: [
      { baseId: 'base_staff', quantity: 1, equip: true },
      { baseId: 'base_robe', quantity: 1, equip: true },
      { baseId: 'base_potion_mana', quantity: 3 },
    ],
    playable: false,
    primaryStat: 'magicAttack',
    portraitKey: 'art.portrait.mage',
  },
  {
    id: 'hunter',
    name: 'Caçador',
    tagline: 'Conhece a presa antes de encontrá-la.',
    identity: 'Dano físico à distância, armadilhas e bônus contra famílias específicas.',
    strengths: ['Consistência', 'Vantagem contra feras', 'Boa velocidade'],
    weaknesses: ['Fraco em espaços fechados', 'Pouca cura'],
    baseAttributes: { strength: 6, vitality: 6, intelligence: 4, wisdom: 5, dexterity: 8, agility: 7, luck: 5 },
    startingItems: [
      { baseId: 'base_bow', quantity: 1, equip: true },
      { baseId: 'base_leather_vest', quantity: 1, equip: true },
      { baseId: 'base_boots', quantity: 1, equip: true },
      { baseId: 'base_potion_minor', quantity: 2 },
    ],
    playable: false,
    primaryStat: 'physicalAttack',
    portraitKey: 'art.portrait.hunter',
  },
  {
    id: 'cleric',
    name: 'Clérigo',
    tagline: 'A fé sustenta o que o corpo não aguenta.',
    identity: 'Cura, proteção e dano sagrado devastador contra mortos-vivos.',
    strengths: ['Melhor cura', 'Anti-morto-vivo', 'Resistência mágica'],
    weaknesses: ['Dano baixo contra vivos', 'Turnos lentos'],
    baseAttributes: { strength: 5, vitality: 7, intelligence: 5, wisdom: 9, dexterity: 4, agility: 4, luck: 5 },
    startingItems: [
      { baseId: 'base_censer', quantity: 1, equip: true },
      { baseId: 'base_robe', quantity: 1, equip: true },
      { baseId: 'base_amulet', quantity: 1, equip: true },
      { baseId: 'base_potion_minor', quantity: 3 },
    ],
    playable: false,
    primaryStat: 'magicAttack',
    portraitKey: 'art.portrait.cleric',
  },
];

export const CLASS_BY_ID: Record<ClassId, HeroClass> = Object.fromEntries(
  HERO_CLASSES.map((c) => [c.id, c]),
) as Record<ClassId, HeroClass>;

export interface Origin {
  id: string;
  name: string;
  description: string;
  bonus: Partial<Attributes>;
  /** Seeds a starting relationship or rumor hook in the world. */
  narrativeHook: string;
}

export const ORIGINS: readonly Origin[] = [
  { id: 'origin_village', name: 'Filho da Vila', description: 'Cresceu entre colheitas e invernos duros.', bonus: { vitality: 2, luck: 1 }, narrativeHook: 'Alguém de uma vila próxima ainda lembra do seu nome.' },
  { id: 'origin_grove', name: 'Criado no Bosque', description: 'Aprendeu a ler o vento antes de ler palavras.', bonus: { wisdom: 2, agility: 1 }, narrativeHook: 'Os druidas o reconhecem como um dos seus.' },
  { id: 'origin_street', name: 'Das Ruas', description: 'Sobreviveu onde a guarda não entra.', bonus: { dexterity: 2, luck: 1 }, narrativeHook: 'Há quem lhe deva favores no mercado negro.' },
  { id: 'origin_temple', name: 'Órfão do Templo', description: 'Criado por clérigos que esperavam mais de você.', bonus: { wisdom: 1, intelligence: 2 }, narrativeHook: 'O templo ainda espera o seu retorno.' },
  { id: 'origin_exile', name: 'Exilado', description: 'Foi expulso de um lugar que não pode nomear.', bonus: { strength: 2, vitality: 1 }, narrativeHook: 'Alguém em Verdália sabe por que você foi exilado.' },
  { id: 'origin_scholar', name: 'Aprendiz Fracassado', description: 'A biblioteca fechou as portas antes de você terminar.', bonus: { intelligence: 2, wisdom: 1 }, narrativeHook: 'Um bibliotecário guarda um livro que era seu.' },
];

export const ORIGIN_BY_ID: Record<string, Origin> = Object.fromEntries(ORIGINS.map((o) => [o.id, o]));

/** Placeholder trees for the classes that are structured but not balanced yet. */
function stubTree(classId: ClassId, branches: readonly [string, string, string]): SkillTree {
  return {
    classId,
    branches: branches.map((name, i) => ({ id: `${classId}_b${i + 1}`, name, description: 'Ramo em desenvolvimento.' })),
    nodes: [],
  };
}

export const DRUID_TREE: SkillTree = {
  classId: 'druid',
  branches: [
    { id: 'nature', name: 'Natureza', description: 'Dano contínuo, venenos e controle por raízes.' },
    { id: 'shape', name: 'Transformação', description: 'Formas bestiais: agressão, velocidade e resistência.' },
    { id: 'spirit', name: 'Espíritos', description: 'Cura, proteção e os antigos que respondem ao chamado.' },
  ],
  nodes: [
    // --- Natureza ---
    {
      id: 'skill_thorn_lash', name: 'Chicote de Espinhos', branch: 'nature', kind: 'active',
      description: 'Golpeia um inimigo com cipós e aplica Sangramento.',
      maxRank: 5, requiredLevel: 1, requires: [], manaCost: 8, cooldown: 0, targeting: 'enemy',
      effect: { power: 1.15, scaling: 'magicAttack', status: { kind: 'bleed', magnitude: 4, turns: 2, chance: 0.6 } },
      perRank: { power: 0.18, manaCost: 1, magnitude: 2 }, iconKey: 'icon.skill.thorn',
    },
    {
      id: 'skill_venom_bloom', name: 'Floração Venenosa', branch: 'nature', kind: 'active',
      description: 'Esporos atingem todos os inimigos e os envenenam.',
      maxRank: 4, requiredLevel: 4, requires: [{ skillId: 'skill_thorn_lash', rank: 2 }],
      manaCost: 18, cooldown: 2, targeting: 'allEnemies',
      effect: { power: 0.72, scaling: 'magicAttack', status: { kind: 'poison', magnitude: 6, turns: 3, chance: 0.85 } },
      perRank: { power: 0.12, manaCost: 2, magnitude: 3 }, iconKey: 'icon.skill.spore',
    },
    {
      id: 'skill_entangle', name: 'Enraizar', branch: 'nature', kind: 'active',
      description: 'Raízes prendem o alvo, atordoando-o.',
      maxRank: 3, requiredLevel: 6, requires: [{ skillId: 'skill_thorn_lash', rank: 3 }],
      manaCost: 16, cooldown: 4, targeting: 'enemy',
      effect: { power: 0.4, scaling: 'magicAttack', status: { kind: 'stun', magnitude: 1, turns: 1, chance: 0.7 } },
      perRank: { power: 0.1, manaCost: 2 }, iconKey: 'icon.skill.root',
    },
    {
      id: 'skill_verdant_mind', name: 'Mente Verdejante', branch: 'nature', kind: 'passive',
      description: 'A comunhão com a floresta amplia seu poder mágico.',
      maxRank: 5, requiredLevel: 2, requires: [], manaCost: 0, cooldown: 0, targeting: 'self',
      effect: {}, passiveStats: { magicAttack: 3, maxMana: 8 },
      perRank: { stats: { magicAttack: 3, maxMana: 8 } }, iconKey: 'icon.skill.mind',
    },
    {
      id: 'skill_toxic_mastery', name: 'Domínio Tóxico', branch: 'nature', kind: 'modifier',
      description: 'Venenos e sangramentos duram um turno a mais.',
      maxRank: 2, requiredLevel: 8, requires: [{ skillId: 'skill_venom_bloom', rank: 2 }],
      manaCost: 0, cooldown: 0, targeting: 'self', effect: { status: { kind: 'poison', magnitude: 0, turns: 1 } },
      iconKey: 'icon.skill.toxic',
    },
    // --- Transformação ---
    {
      id: 'skill_claw_form', name: 'Forma de Garras', branch: 'shape', kind: 'active',
      description: 'Assume forma bestial e desfere dois golpes físicos.',
      maxRank: 5, requiredLevel: 3, requires: [], manaCost: 12, cooldown: 1, targeting: 'enemy',
      effect: { power: 0.62, scaling: 'physicalAttack', hits: 2 },
      perRank: { power: 0.1, manaCost: 1 }, iconKey: 'icon.skill.claw',
    },
    {
      id: 'skill_bear_hide', name: 'Pele de Urso', branch: 'shape', kind: 'active',
      description: 'Fortifica o corpo, reduzindo o dano recebido.',
      maxRank: 4, requiredLevel: 5, requires: [{ skillId: 'skill_claw_form', rank: 2 }],
      manaCost: 14, cooldown: 3, targeting: 'self',
      effect: { status: { kind: 'fortify', magnitude: 25, turns: 3 } },
      perRank: { manaCost: 1, magnitude: 8 }, iconKey: 'icon.skill.bear',
    },
    {
      id: 'skill_wild_gait', name: 'Passo Selvagem', branch: 'shape', kind: 'passive',
      description: 'Movimentos animais aumentam velocidade e esquiva.',
      maxRank: 4, requiredLevel: 4, requires: [], manaCost: 0, cooldown: 0, targeting: 'self',
      effect: {}, passiveStats: { speed: 2, dodgeChance: 1.5 },
      perRank: { stats: { speed: 2, dodgeChance: 1.5 } }, iconKey: 'icon.skill.paw',
    },
    {
      id: 'skill_primal_fury', name: 'Fúria Primordial', branch: 'shape', kind: 'ultimate',
      description: 'A besta assume o controle: golpe devastador e Celeridade.',
      maxRank: 1, requiredLevel: 10, requires: [{ skillId: 'skill_claw_form', rank: 4 }, { skillId: 'skill_bear_hide', rank: 2 }],
      manaCost: 38, cooldown: 6, targeting: 'enemy',
      effect: { power: 2.8, scaling: 'physicalAttack', status: { kind: 'haste', magnitude: 6, turns: 3 } },
      iconKey: 'icon.skill.fury',
    },
    // --- Espíritos ---
    {
      id: 'skill_renewal', name: 'Renovação', branch: 'spirit', kind: 'active',
      description: 'Cura imediata e regeneração contínua.',
      maxRank: 5, requiredLevel: 2, requires: [], manaCost: 14, cooldown: 2, targeting: 'self',
      effect: { heal: 38, status: { kind: 'regen', magnitude: 8, turns: 3 } },
      perRank: { heal: 16, manaCost: 2, magnitude: 3 }, iconKey: 'icon.skill.renewal',
    },
    {
      id: 'skill_spirit_ward', name: 'Guarda Espiritual', branch: 'spirit', kind: 'active',
      description: 'Ergue um escudo que absorve dano.',
      maxRank: 4, requiredLevel: 5, requires: [{ skillId: 'skill_renewal', rank: 2 }],
      manaCost: 16, cooldown: 3, targeting: 'self',
      effect: { shield: 45, status: { kind: 'shield', magnitude: 45, turns: 3 } },
      perRank: { manaCost: 2, magnitude: 18 }, iconKey: 'icon.skill.ward',
    },
    {
      id: 'skill_ancestral_bond', name: 'Vínculo Ancestral', branch: 'spirit', kind: 'passive',
      description: 'Os antigos sustentam seu corpo e sua mente.',
      maxRank: 5, requiredLevel: 3, requires: [], manaCost: 0, cooldown: 0, targeting: 'self',
      effect: {}, passiveStats: { maxHp: 18, hpRegen: 0.8, manaRegen: 0.5 },
      perRank: { stats: { maxHp: 18, hpRegen: 0.8, manaRegen: 0.5 } }, iconKey: 'icon.skill.bond',
    },
    {
      id: 'skill_elder_call', name: 'Chamado dos Anciões', branch: 'spirit', kind: 'ultimate',
      description: 'Espíritos antigos ferem todos os inimigos e restauram sua vida.',
      maxRank: 1, requiredLevel: 12, requires: [{ skillId: 'skill_spirit_ward', rank: 2 }, { skillId: 'skill_ancestral_bond', rank: 3 }],
      manaCost: 44, cooldown: 7, targeting: 'allEnemies',
      effect: { power: 1.7, scaling: 'magicAttack', heal: 60 },
      iconKey: 'icon.skill.elder',
    },
  ],
};

export const SKILL_TREES: Record<ClassId, SkillTree> = {
  druid: DRUID_TREE,
  warrior: stubTree('warrior', ['Armas', 'Baluarte', 'Comando']),
  rogue: stubTree('rogue', ['Sombras', 'Venenos', 'Precisão']),
  mage: stubTree('mage', ['Fogo', 'Gelo', 'Arcano']),
  hunter: stubTree('hunter', ['Tiro', 'Armadilhas', 'Companheiro']),
  cleric: stubTree('cleric', ['Luz', 'Proteção', 'Julgamento']),
};

export function skillNodeById(classId: ClassId, skillId: string) {
  return SKILL_TREES[classId].nodes.find((node) => node.id === skillId) ?? null;
}
