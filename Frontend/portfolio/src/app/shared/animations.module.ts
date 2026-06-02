/**
 * Convenience NgModule that imports BrowserAnimationsModule so that
 * Angular Material components and custom animation triggers work correctly.
 * Import this module in any feature module or shared module that needs animations.
 *
 * @file animations.module.ts
 */

import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  imports: [BrowserAnimationsModule],
  exports: [BrowserAnimationsModule],
})
export class AnimationsModule {}
