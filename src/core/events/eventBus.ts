import type { GameEventEnvelope, GameEventMap, GameEventName } from '@/core/events/gameEvents';

type Handler<K extends GameEventName> = (payload: GameEventMap[K], name: K) => void;
type AnyHandler = (envelope: GameEventEnvelope) => void;

export interface EventBusOptions {
  /** Ring buffer size for debug telemetry. */
  historyLimit?: number;
  onError?: (error: unknown, name: GameEventName) => void;
}

/**
 * Synchronous typed pub/sub. A throwing subscriber never prevents the other
 * subscribers from running — one broken system must not break the world.
 */
export class EventBus {
  private readonly handlers = new Map<GameEventName, Set<Handler<GameEventName>>>();
  private readonly anyHandlers = new Set<AnyHandler>();
  private readonly history: GameEventEnvelope[] = [];
  private readonly historyLimit: number;
  private readonly onError: (error: unknown, name: GameEventName) => void;

  constructor(options: EventBusOptions = {}) {
    this.historyLimit = options.historyLimit ?? 200;
    this.onError = options.onError ?? (() => undefined);
  }

  on<K extends GameEventName>(name: K, handler: Handler<K>): () => void {
    const set = this.handlers.get(name) ?? new Set();
    set.add(handler as Handler<GameEventName>);
    this.handlers.set(name, set);
    return () => set.delete(handler as Handler<GameEventName>);
  }

  once<K extends GameEventName>(name: K, handler: Handler<K>): () => void {
    const off = this.on(name, ((payload, eventName) => {
      off();
      handler(payload as GameEventMap[K], eventName as K);
    }) as Handler<K>);
    return off;
  }

  onAny(handler: AnyHandler): () => void {
    this.anyHandlers.add(handler);
    return () => this.anyHandlers.delete(handler);
  }

  emit<K extends GameEventName>(name: K, payload: GameEventMap[K]): void {
    const envelope: GameEventEnvelope<K> = { name, payload, at: Date.now() };
    this.history.push(envelope as GameEventEnvelope);
    if (this.history.length > this.historyLimit) this.history.shift();

    for (const handler of this.handlers.get(name) ?? []) {
      try {
        (handler as Handler<K>)(payload, name);
      } catch (error) {
        this.onError(error, name);
      }
    }
    for (const handler of this.anyHandlers) {
      try {
        handler(envelope as GameEventEnvelope);
      } catch (error) {
        this.onError(error, name);
      }
    }
  }

  recent(limit = 50): GameEventEnvelope[] {
    return this.history.slice(-limit);
  }

  clear(): void {
    this.handlers.clear();
    this.anyHandlers.clear();
    this.history.length = 0;
  }
}
