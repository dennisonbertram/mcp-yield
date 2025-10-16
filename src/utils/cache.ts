export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<TValue> {
  private readonly store = new Map<string, CacheEntry<TValue>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): TValue | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: TValue, ttlOverrideMs?: number) {
    const ttl = ttlOverrideMs ?? this.ttlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  clear(key?: string) {
    if (key) {
      this.store.delete(key);
      return;
    }
    this.store.clear();
  }
}
