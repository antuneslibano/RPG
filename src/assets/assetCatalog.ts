import { SeededRandom, fnv1a } from '@/core/rng/random';

/**
 * Every visual is addressed by a logical key. Nothing in the UI references a
 * file path, so swapping placeholders for final art is a change in this file
 * alone.
 */
export interface ArtDescriptor {
  key: string;
  /** Two-stop gradient approximated by layered views. */
  colors: [string, string, string];
  /** Deterministic glyph drawn over the gradient. */
  glyph: string;
  /** Deterministic silhouette blocks for a "painterly" placeholder. */
  shapes: { x: number; y: number; w: number; h: number; opacity: number }[];
  label: string;
}

export type ArtKind = 'location' | 'region' | 'portrait' | 'creature' | 'item' | 'dungeon' | 'kingdom' | 'skill' | 'generic';

const PALETTES: Record<ArtKind, [string, string, string][]> = {
  location: [['#1B3B2A', '#2F6B45', '#7FB069'], ['#23303F', '#3B5570', '#7FA6C9'], ['#3A2A1C', '#6B4A2C', '#C9A227']],
  region: [['#14241B', '#26503A', '#5E8C61'], ['#241A2B', '#4A2F5C', '#9A6FB0'], ['#2B2416', '#5E5130', '#C2A15A']],
  portrait: [['#20222B', '#3A3F52', '#8D93A8'], ['#2B1F1C', '#513A31', '#B08968'], ['#1C2630', '#33495C', '#82A7C4']],
  creature: [['#2A1A1A', '#5C2E2E', '#B05353'], ['#1A2A22', '#2E5C46', '#53B084'], ['#241C2E', '#463159', '#8E6BB0']],
  item: [['#2A2317', '#5C4B2E', '#C9A227'], ['#1B2733', '#33485C', '#7FA6C9'], ['#241A24', '#4A2F4A', '#B06BA8']],
  dungeon: [['#141418', '#2B2B33', '#5A5A68'], ['#181F18', '#2C3A2C', '#5C7A5C'], ['#1F1418', '#3A2229', '#7A4A56']],
  kingdom: [['#16241F', '#2C4A3C', '#C9A227'], ['#1C2030', '#333C5C', '#C9A227']],
  skill: [['#1A2620', '#2F4A3A', '#7FB069'], ['#201A2A', '#3D2F52', '#9A7FC9'], ['#2A2218', '#524330', '#C9A227']],
  generic: [['#17171C', '#2A2A33', '#6A6A78']],
};

const GLYPHS: Record<ArtKind, string[]> = {
  location: ['▲', '⌂', '☗', '⛫'],
  region: ['❧', '⛰', '≈', '✦'],
  portrait: ['☗', '✧', '❖', '✜'],
  creature: ['✸', '❈', '☠', '✹'],
  item: ['⚒', '✦', '❖', '⌘'],
  dungeon: ['⛬', '☖', '✖', '⌬'],
  kingdom: ['♛', '⛫'],
  skill: ['✿', '✹', '❂', '✤'],
  generic: ['◈'],
};

function kindOf(key: string): ArtKind {
  if (key.includes('.location.')) return 'location';
  if (key.includes('.region.')) return 'region';
  if (key.includes('.portrait')) return 'portrait';
  if (key.includes('.creature.')) return 'creature';
  if (key.includes('.item.')) return 'item';
  if (key.includes('.dungeon.')) return 'dungeon';
  if (key.includes('.kingdom.')) return 'kingdom';
  if (key.includes('.skill.')) return 'skill';
  return 'generic';
}

const cache = new Map<string, ArtDescriptor>();

/**
 * Resolves a logical art key into a descriptor. Today it synthesises a
 * deterministic placeholder; when final assets exist this is where the
 * lookup table goes, and no caller changes.
 */
export function resolveArt(key: string, label = ''): ArtDescriptor {
  const cacheKey = `${key}|${label}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const kind = kindOf(key);
  const rng = new SeededRandom(fnv1a(key), 'art');
  const palettes = PALETTES[kind];
  const colors = rng.pick(palettes);
  const glyph = rng.pick(GLYPHS[kind]);

  const shapeCount = kind === 'item' || kind === 'skill' ? 3 : 6;
  const shapes = Array.from({ length: shapeCount }, () => ({
    x: rng.int(-10, 80),
    y: rng.int(25, 80),
    w: rng.int(18, 60),
    h: rng.int(12, 55),
    opacity: Math.round(rng.float(0.1, 0.42) * 100) / 100,
  }));

  const descriptor: ArtDescriptor = { key, colors, glyph, shapes, label };
  cache.set(cacheKey, descriptor);
  return descriptor;
}

/** Namespaced providers keep call sites honest about what they are asking for. */
export const CharacterPortraitProvider = {
  forClass: (classId: string): string => `art.portrait.${classId}`,
  forNpc: (occupationId: string): string => `art.portrait.npc.${occupationId}`,
};

export const LocationArtProvider = {
  forLocation: (artKey: string): string => artKey,
  forRegion: (biome: string): string => `art.region.${biome}`,
  forKingdom: (): string => 'art.kingdom.default',
};

export const ItemIconProvider = {
  forItem: (baseId: string): string => `icon.item.${baseId}`,
  forSlot: (slot: string): string => `icon.slot.${slot}`,
};

export const CreatureArtProvider = {
  forCreature: (baseId: string): string => `art.creature.${baseId}`,
};

export const SkillIconProvider = {
  forSkill: (iconKey: string): string => iconKey,
};
