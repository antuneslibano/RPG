export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Guards every persisted or computed number against NaN/Infinity. */
export function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function safeInt(value: unknown, fallback = 0): number {
  return Math.trunc(safeNumber(value, fallback));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

export function percent(value: number, total: number): number {
  return total <= 0 ? 0 : clamp01(value / total);
}

export function roundTo(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Diminishing returns curve used by crit/dodge so nothing reaches 100%. */
export function saturate(value: number, softCap: number, hardCap: number): number {
  if (value <= softCap) return value;
  const over = value - softCap;
  return clamp(softCap + over / (1 + over / Math.max(1, hardCap - softCap)), 0, hardCap);
}
