import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Profile } from '../../../core/models/profile.model';

@Component({
  selector: 'app-profile-preview',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatChipsModule, MatDividerModule],
  template: `
    <mat-card class="glass-card preview-card">
      <mat-card-header>
        <mat-card-title>Preview</mat-card-title>
        <mat-card-subtitle>How your profile appears publicly</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        @if (profile) {
          <div class="preview-content">
            <div class="preview-avatar">
              @if (profile.profileImageUrl) {
                <img [src]="profile.profileImageUrl" alt="Profile" class="avatar-img" />
              } @else {
                <div class="avatar-placeholder">
                  <mat-icon>person</mat-icon>
                </div>
              }
            </div>

            <h3 class="preview-name">
              {{ profile.firstName || 'First' }} {{ profile.lastName || 'Last' }}
            </h3>

            @if (profile.tagline) {
              <p class="preview-tagline">{{ profile.tagline }}</p>
            }

            @if (locationString) {
              <p class="preview-location">
                <mat-icon class="inline-icon">location_on</mat-icon>
                {{ locationString }}
              </p>
            }

            @if (profile.bio) {
              <mat-divider></mat-divider>
              <p class="preview-bio">{{ profile.bio }}</p>
            }

            <div class="preview-status">
              <mat-icon [class.published]="profile.isPublished">
                {{ profile.isPublished ? 'visibility' : 'visibility_off' }}
              </mat-icon>
              <span>{{ profile.isPublished ? 'Published' : 'Draft' }}</span>
            </div>
          </div>
        } @else {
          <p class="no-data">No profile data to preview</p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .preview-card { position: sticky; top: 24px; overflow: hidden; }
    .preview-content { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding-top: 16px; width: 100%; overflow: hidden; }
    .preview-avatar { width: 120px; height: 120px; min-width: 120px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(0, 217, 255, 0.3); }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-placeholder {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255, 255, 255, 0.05);
    }
    .avatar-placeholder mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--color-text-secondary, rgba(255,255,255,0.5)); }
    .preview-name { font-size: 1.4rem; margin: 8px 0 0; font-weight: 600; word-break: break-word; overflow-wrap: break-word; width: 100%; }
    .preview-tagline { color: var(--color-accent, #00D9FF); margin: 4px 0; font-size: 0.95rem; word-break: break-word; overflow-wrap: break-word; width: 100%; }
    .preview-location { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 4px; color: var(--color-text-secondary, rgba(255,255,255,0.5)); font-size: 0.9rem; margin: 0; word-break: break-word; overflow-wrap: break-word; width: 100%; }
    .inline-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    mat-divider { margin: 12px 0; width: 100%; }
    .preview-bio { font-size: 0.9rem; line-height: 1.6; color: var(--color-text-secondary, rgba(255,255,255,0.7)); text-align: left; width: 100%; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word; }
    .preview-status { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--color-text-secondary, rgba(255,255,255,0.5)); margin-top: 8px; }
    .preview-status .published { color: #66BB6A; }
    .no-data { color: var(--color-text-secondary, rgba(255,255,255,0.5)); text-align: center; padding: 24px; }
  `],
})
export class ProfilePreviewComponent {
  @Input() profile: Profile | null = null;

  get locationString(): string {
    if (!this.profile?.location) return '';
    const { city, state, country } = this.profile.location;
    return [city, state, country].filter(Boolean).join(', ');
  }
}
