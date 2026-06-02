import { Injectable } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';

/** Represents a single cache entry with TTL metadata. */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  observable$: Observable<T>;
}

/**
 * Generic in-memory cache service with TTL support.
 * Uses RxJS shareReplay to deduplicate in-flight requests.
 * Suitable for caching public portfolio API responses.
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  /**
   * Stores data in the cache under the given key with a TTL.
   *
   * @param key   - Unique cache key.
   * @param data  - Data to cache.
   * @param ttlMs - Time-to-live in milliseconds (default: 5 minutes).
   * @returns Observable emitting the cached data.
   */
  cache<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): Observable<T> {
    const observable$ = of(data).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs, observable$ } as CacheEntry<unknown>);
    return observable$ as Observable<T>;
  }

  /**
   * Retrieves cached data for the given key if it has not expired.
   *
   * @param key - Unique cache key.
   * @returns The cached Observable, or `null` when missing or expired.
   */
  get<T>(key: string): Observable<T> | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.observable$;
  }

  /**
   * Removes the cache entry for the given key.
   *
   * @param key - Unique cache key to invalidate.
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clears all entries from the cache.
   */
  invalidateAll(): void {
    this.store.clear();
  }
}
