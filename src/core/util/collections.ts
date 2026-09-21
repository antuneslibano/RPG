export function groupBy<T, K extends string | number>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = out.get(k);
    if (bucket) bucket.push(item);
    else out.set(k, [item]);
  }
  return out;
}

export function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export function byId<T extends { id: string }>(items: readonly T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) out[item.id] = item;
  return out;
}

export function compact<T>(items: readonly (T | null | undefined)[]): T[] {
  return items.filter((item): item is T => item !== null && item !== undefined);
}

export function sumBy<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

/** Keeps the last `limit` entries of a ring-buffer-ish array. */
export function pushCapped<T>(items: T[], item: T, limit: number): T[] {
  items.push(item);
  return items.length > limit ? items.slice(items.length - limit) : items;
}
