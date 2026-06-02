import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit false initially (after debounce)', () => {
    const states: boolean[] = [];
    service.isLoading$.subscribe((v) => states.push(v));

    jasmine.clock().tick(100); // let debounce settle
    expect(states).toContain(false);
  });

  it('should emit true after setLoading(true)', () => {
    const states: boolean[] = [];
    service.isLoading$.subscribe((v) => states.push(v));

    service.setLoading(true);
    jasmine.clock().tick(100);
    expect(states).toContain(true);
  });

  it('should emit false after setLoading(false)', () => {
    const states: boolean[] = [];
    service.isLoading$.subscribe((v) => states.push(v));

    service.setLoading(true);
    jasmine.clock().tick(100);
    service.setLoading(false);
    jasmine.clock().tick(100);
    expect(states[states.length - 1]).toBeFalse();
  });

  it('should debounce rapid setLoading calls (suppress flicker)', () => {
    const states: boolean[] = [];
    service.isLoading$.subscribe((v) => states.push(v));

    // Rapid on/off/on within debounce window → should settle on true
    service.setLoading(true);
    service.setLoading(false);
    service.setLoading(true);
    jasmine.clock().tick(100); // debounce window passes
    expect(states[states.length - 1]).toBeTrue();
  });

  it('should not emit duplicate consecutive values (distinctUntilChanged)', () => {
    const states: boolean[] = [];
    service.isLoading$.subscribe((v) => states.push(v));

    service.setLoading(true);
    jasmine.clock().tick(100);
    service.setLoading(true); // same value — should not emit again
    jasmine.clock().tick(100);

    const trueCount = states.filter((s) => s === true).length;
    expect(trueCount).toBe(1);
  });
});
