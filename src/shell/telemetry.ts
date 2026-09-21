/**
 * Local-only debug telemetry. Development records generation timings, seeds,
 * event counts and save durations; production keeps a tiny ring buffer and
 * stays quiet.
 */
export interface TelemetryEntry {
  at: number;
  kind: 'generation' | 'save' | 'error' | 'validation' | 'event';
  message: string;
  data?: unknown;
}

const MAX_ENTRIES = 120;
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

class Telemetry {
  private readonly entries: TelemetryEntry[] = [];

  private push(entry: TelemetryEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();
  }

  generation(what: string, durationMs: number, entityCount: number): void {
    this.push({ at: Date.now(), kind: 'generation', message: `${what} gerado`, data: { durationMs, entityCount } });
    if (isDev) console.warn(`[gen] ${what}: ${durationMs}ms, ${entityCount} entidades`);
  }

  save(durationMs: number, partitions: number): void {
    this.push({ at: Date.now(), kind: 'save', message: 'save', data: { durationMs, partitions } });
  }

  validation(issueCount: number): void {
    this.push({ at: Date.now(), kind: 'validation', message: `${issueCount} problema(s) reparado(s) no save` });
    if (isDev) console.warn(`[save] ${issueCount} problema(s) reparado(s)`);
  }

  error(message: string, error: unknown): void {
    this.push({ at: Date.now(), kind: 'error', message, data: String(error) });
    console.error(`[rpg] ${message}`, error);
  }

  recent(limit = 40): TelemetryEntry[] {
    return this.entries.slice(-limit).reverse();
  }
}

export const telemetry = new Telemetry();
