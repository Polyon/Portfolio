/**
 * Reusable Angular animation definitions for the public portal.
 * Import individual animations as needed in component `animations` metadata.
 *
 * @file animations.ts
 */

import {
  trigger,
  state,
  style,
  transition,
  animate,
  query,
  stagger,
  keyframes,
  animation,
  useAnimation,
  AnimationTriggerMetadata,
  AnimationReferenceMetadata,
} from '@angular/animations';

/** Fades an element from transparent to fully visible. Duration: 400 ms. */
export const fadeInAnimation: AnimationTriggerMetadata = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('400ms ease-in', style({ opacity: 1 })),
  ]),
]);

/**
 * Slides and fades an element in from the left on enter.
 * Duration: 500 ms.
 */
export const slideInAnimation: AnimationTriggerMetadata = trigger('slideIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-40px)' }),
    animate('500ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
  ]),
]);

/**
 * Scales an element from 0 to full size with a fade.
 * Duration: 400 ms.
 */
export const scaleAnimation: AnimationTriggerMetadata = trigger('scale', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.8)' }),
    animate('400ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' })),
  ]),
]);

/**
 * Staggers child elements when a list container enters the DOM.
 * Each child fades in 100 ms after the previous one.
 *
 * Wrap the list container with `[@staggerChildren]` and ensure all
 * list items carry the `[@staggerItem]` trigger.
 */
export const staggerAnimation: AnimationTriggerMetadata = trigger('staggerChildren', [
  transition('* => *', [
    query(
      ':enter',
      [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        stagger(100, [
          animate('350ms ease-out', style({ opacity: 1, transform: 'none' })),
        ]),
      ],
      { optional: true },
    ),
  ]),
]);

/**
 * Applied to individual stagger list items (works alongside `staggerAnimation`).
 */
export const staggerItemAnimation: AnimationTriggerMetadata = trigger('staggerItem', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(20px)' }),
    animate('350ms ease-out', style({ opacity: 1, transform: 'none' })),
  ]),
]);
