import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileEditComponent } from './profile-edit/profile-edit.component';
import { ProfilePreviewComponent } from './profile-preview/profile-preview.component';
import { ProfileService } from '../../core/services/profile.service';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ProfileEditComponent, ProfilePreviewComponent],
  template: `
    <div class="profile-layout">
      <div class="profile-form-area">
        <app-profile-edit></app-profile-edit>
      </div>
      <aside class="profile-preview-area">
        <app-profile-preview [profile]="(profileService.profile$ | async) ?? null"></app-profile-preview>
      </aside>
    </div>
  `,
  styles: [`
    .profile-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 24px;
      align-items: start;
    }
    .profile-form-area {
      min-width: 0;
    }
    .profile-preview-area {
      min-width: 0;
    }
    @media (max-width: 1024px) {
      .profile-layout {
        grid-template-columns: 1fr;
      }
      .profile-preview-area { order: -1; }
    }
  `],
})
/**
 * Profile page container.
 * Hosts the side-by-side profile edit form and live preview panel.
 * Implements `HasUnsavedChanges` so the router can warn before navigating away.
 */
export class ProfileComponent implements HasUnsavedChanges {
  profileService = inject(ProfileService);
  @ViewChild(ProfileEditComponent) private editComponent?: ProfileEditComponent;

  /**
   * Delegates to the edit form to determine whether there are pending changes.
   *
   * @returns `true` if the form has unsaved changes.
   */
  hasUnsavedChanges(): boolean {
    return this.editComponent?.hasUnsavedChanges() ?? false;
  }
}
