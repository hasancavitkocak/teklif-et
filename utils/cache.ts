interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class Cache {
  private cache: Map<string, CacheItem<any>> = new Map();

  set<T>(key: string, data: T, expiresInMs: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMs,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() - item.timestamp > item.expiresIn) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() - item.timestamp > item.expiresIn) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.expiresIn) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new Cache();

setInterval(() => {
  cache.clearExpired();
}, 60000);
