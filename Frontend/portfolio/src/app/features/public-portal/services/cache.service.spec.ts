import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CacheService } from './cache.service';

/**
 * T125b — CacheService tests.
 * Validates TTL-based in-memory caching, expiry, invalidation, and shareReplay behaviour.
 */
describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), CacheService] });
    service = TestBed.inject(CacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── cache() ─────────────────────────────────────────────────────────────

  describe('cache()', () => {
    it('should store data and return an observable emitting it', (done) => {
      service.cache('key1', { name: 'Alice' }).subscribe((value) => {
        expect(value).toEqual({ name: 'Alice' });
        done();
      });
    });

    it('should allow caching primitive values', (done) => {
      service.cache('num', 42).subscribe((v) => {
        expect(v).toBe(42);
        done();
      });
    });

    it('should overwrite an existing entry for the same key', (done) => {
      service.cache('dup', 'first');
      service.cache('dup', 'second').subscribe((v) => {
        expect(v).toBe('second');
        done();
      });
    });
  });

  // ─── get() ───────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('should return null for an unknown key', () => {
      expect(service.get('missing')).toBeNull();
    });

    it('should return the cached observable for a known key', (done) => {
      service.cache('greet', 'hello');
      const obs = service.get<string>('greet');
      expect(obs).not.toBeNull();
      obs!.subscribe((v) => {
        expect(v).toBe('hello');
        done();
      });
    });

    it('should return null after the TTL has expired', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate();
      service.cache('ttl-key', 'data', 1000); // 1 second TTL
      jasmine.clock().tick(1001);
      expect(service.get('ttl-key')).toBeNull();
      jasmine.clock().uninstall();
    });

    it('should still return data before TTL expires', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate();
      service.cache('fresh-key', 'fresh', 5000);
      jasmine.clock().tick(4999);
      expect(service.get('fresh-key')).not.toBeNull();
      jasmine.clock().uninstall();
    });
  });

  // ─── invalidate() ────────────────────────────────────────────────────────

  describe('invalidate()', () => {
    it('should remove a specific key from the cache', () => {
      service.cache('del-key', 'value');
      service.invalidate('del-key');
      expect(service.get('del-key')).toBeNull();
    });

    it('should not throw when invalidating a non-existent key', () => {
      expect(() => service.invalidate('ghost')).not.toThrow();
    });
  });

  // ─── invalidateAll() ─────────────────────────────────────────────────────

  describe('invalidateAll()', () => {
    it('should remove all cached entries', () => {
      service.cache('k1', 'v1');
      service.cache('k2', 'v2');
      service.cache('k3', 'v3');
      service.invalidateAll();
      expect(service.get('k1')).toBeNull();
      expect(service.get('k2')).toBeNull();
      expect(service.get('k3')).toBeNull();
    });

    it('should not throw when the cache is already empty', () => {
      expect(() => service.invalidateAll()).not.toThrow();
    });
  });
});
