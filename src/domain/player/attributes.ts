export const ATTRIBUTE_KEYS = [
  'strength',
  'vitality',
  'intelligence',
  'wisdom',
  'dexterity',
  'agility',
  'luck',
] as const;

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

export type Attributes = Record<AttributeKey, number>;

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  strength: 'Força',
  vitality: 'Vitalidade',
  intelligence: 'Inteligência',
  wisdom: 'Sabedoria',
  dexterity: 'Destreza',
  agility: 'Agilidade',
  luck: 'Sorte',
};

export const ATTRIBUTE_SHORT: Record<AttributeKey, string> = {
  strength: 'FOR',
  vitality: 'VIT',
  intelligence: 'INT',
  wisdom: 'SAB',
  dexterity: 'DES',
  agility: 'AGI',
  luck: 'SOR',
};

export const ATTRIBUTE_DESCRIPTIONS: Record<AttributeKey, string> = {
  strength: 'Dano físico e capacidade de carga.',
  vitality: 'Vida máxima e resistência física.',
  intelligence: 'Dano mágico e mana máxima.',
  wisdom: 'Resistência mágica e regeneração de mana.',
  dexterity: 'Chance de crítico e precisão.',
  agility: 'Velocidade de turno e esquiva.',
  luck: 'Qualidade do loot e crítico residual.',
};

export function emptyAttributes(): Attributes {
  return { strength: 0, vitality: 0, intelligence: 0, wisdom: 0, dexterity: 0, agility: 0, luck: 0 };
}

export function addAttributes(a: Attributes, b: Partial<Attributes>): Attributes {
  const out = { ...a };
  for (const key of ATTRIBUTE_KEYS) out[key] += b[key] ?? 0;
  return out;
}

export function totalAttributePoints(attributes: Attributes): number {
  return ATTRIBUTE_KEYS.reduce((sum, key) => sum + attributes[key], 0);
}
