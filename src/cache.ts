const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class Cache<T = string> {
  private store = new Map<string, CacheEntry<T>>();
  private _hits = 0;
  private _misses = 0;

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }
    if (Date.now() - entry.timestamp > TTL_MS) {
      this.store.delete(key);
      this._misses++;
      return null;
    }
    this._hits++;
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, timestamp: Date.now() });
  }

  stats() {
    return { size: this.store.size, hits: this._hits, misses: this._misses };
  }

  clear(): void {
    this.store.clear();
    this._hits = 0;
    this._misses = 0;
  }
}

export const cache = new Cache<string>();
