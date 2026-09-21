/**
 * Deterministic RNG. Nothing in the project may call Math.random():
 * reproducible bugs, seed sharing and save consistency all depend on this.
 */

/** xmur3 string hash -> 32-bit seed. */
export function hashSeed(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** FNV-1a — used for semantic fingerprints as well as seeding. */
export function fnv1a(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class SeededRandom {
  private state: number;
  readonly label: string;

  constructor(seed: number | string, label = 'rng') {
    this.state = (typeof seed === 'string' ? hashSeed(seed) : seed >>> 0) || 0x9e3779b9;
    this.label = label;
  }

  /** mulberry32 — small, fast, good enough for game content. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(this.next() * (max - min + 1));
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  bool(chance = 0.5): boolean {
    return this.next() < chance;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error(`SeededRandom.pick: empty array (${this.label})`);
    return items[this.int(0, items.length - 1)] as T;
  }

  /** Picks `count` distinct items (or fewer if the pool is smaller). */
  sample<T>(items: readonly T[], count: number): T[] {
    return this.shuffle(items).slice(0, Math.max(0, Math.min(count, items.length)));
  }

  /** Fisher-Yates on a copy; never mutates the input. */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  }

  /** Weighted pick. Entries with weight <= 0 are ignored. */
  weighted<T>(entries: readonly { value: T; weight: number }[]): T {
    const usable = entries.filter((e) => e.weight > 0);
    if (usable.length === 0) throw new Error(`SeededRandom.weighted: no positive weights (${this.label})`);
    const total = usable.reduce((sum, e) => sum + e.weight, 0);
    let roll = this.next() * total;
    for (const entry of usable) {
      roll -= entry.weight;
      if (roll <= 0) return entry.value;
    }
    return (usable[usable.length - 1] as { value: T }).value;
  }

  /** Bell-ish distribution: average of 3 rolls, rounded. */
  centered(min: number, max: number): number {
    const avg = (this.next() + this.next() + this.next()) / 3;
    return Math.round(min + avg * (max - min));
  }

  /** Hex string of `length` chars — used for stable content IDs. */
  hex(length: number): string {
    let out = '';
    while (out.length < length) out += Math.floor(this.next() * 0xffffffff).toString(16).padStart(8, '0');
    return out.slice(0, length);
  }

  /** A child RNG deterministically derived from this one's current state. */
  derive(label: string): SeededRandom {
    return new SeededRandom(hashSeed(`${this.label}:${label}:${this.state}`), `${this.label}/${label}`);
  }

  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }
}

export const RNG_STREAMS = [
  'world',
  'npc',
  'loot',
  'quest',
  'dungeon',
  'encounter',
  'combat',
  'director',
  'name',
  'economy',
] as const;

export type RngStreamName = (typeof RNG_STREAMS)[number];

/**
 * Independent streams derived from one world seed, so consuming loot never
 * shifts world generation.
 */
export class RngStreams {
  private readonly streams = new Map<RngStreamName, SeededRandom>();

  constructor(readonly worldSeed: string) {
    for (const name of RNG_STREAMS) {
      this.streams.set(name, new SeededRandom(`${worldSeed}::${name}`, name));
    }
  }

  get(name: RngStreamName): SeededRandom {
    const stream = this.streams.get(name);
    if (!stream) throw new Error(`Unknown RNG stream: ${name}`);
    return stream;
  }

  /**
   * A throwaway RNG keyed by stream + key. Same key always yields the same
   * sequence regardless of how much the parent stream has been consumed —
   * this is what makes per-entity generation order-independent.
   */
  forKey(name: RngStreamName, key: string): SeededRandom {
    return new SeededRandom(`${this.worldSeed}::${name}::${key}`, `${name}:${key}`);
  }

  snapshot(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [name, rng] of this.streams) out[name] = rng.getState();
    return out;
  }

  restore(states: Record<string, number>): void {
    for (const [name, state] of Object.entries(states)) {
      const stream = this.streams.get(name as RngStreamName);
      if (stream && Number.isFinite(state)) stream.setState(state);
    }
  }
}

/** Readable, shareable seed labels like "verdalia-7f3a". */
const SEED_WORDS = [
  'verdalia', 'corvo', 'ferro', 'alvorada', 'bruma', 'pedra', 'chama', 'raiz',
  'sombra', 'orvalho', 'vento', 'runa', 'cinza', 'lanca', 'carvalho', 'gelo',
];

export function generateSeedLabel(rng: SeededRandom): string {
  return `${rng.pick(SEED_WORDS)}-${rng.hex(4)}`;
}

export function normalizeSeedLabel(input: string): string {
  const cleaned = input.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 32) : 'verdalia-0000';
}
