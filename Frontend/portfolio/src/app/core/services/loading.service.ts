import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, debounceTime, distinctUntilChanged } from 'rxjs';

/**
 * Singleton service that exposes a global loading indicator state.
 * Components can subscribe to `isLoading$` to show/hide spinners.
 * Rapid state changes are debounced to prevent spinner flicker.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);

  /**
   * Observable that emits `true` while any async operation is in progress.
   * Debounced by 80 ms to suppress flicker from rapid start/stop cycles.
   */
  readonly isLoading$: Observable<boolean> = this.loadingSubject.asObservable().pipe(
    debounceTime(80),
    distinctUntilChanged(),
  );

  /**
   * Updates the global loading state.
   *
   * @param loading - `true` to show the spinner; `false` to hide it.
   */
  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }
}
