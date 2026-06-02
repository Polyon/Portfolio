import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatProgressSpinnerModule],
  template: `
    <div class="image-upload">
      <div class="preview-container" [class.shape-circle]="shape === 'circle'" [class.shape-square]="shape === 'square'">
        @if (previewUrl || currentImageUrl) {
          <img
            [src]="previewUrl || currentImageUrl"
            [alt]="alt"
            class="preview-image"
          />
        } @else {
          <div class="placeholder">
            <mat-icon>{{ placeholderIcon }}</mat-icon>
            <span>No image</span>
          </div>
        }
        @if (uploading) {
          <div class="upload-overlay" [class.shape-circle]="shape === 'circle'" [class.shape-square]="shape === 'square'">
            <mat-spinner diameter="40" color="accent"></mat-spinner>
          </div>
        }
      </div>

      <div class="upload-actions">
        <button mat-stroked-button (click)="fileInput.click()" [disabled]="uploading">
          <mat-icon>upload</mat-icon>
          {{ currentImageUrl ? 'Change Image' : 'Upload Image' }}
        </button>
        @if (previewUrl || currentImageUrl) {
          <button mat-stroked-button color="warn" (click)="clearPreview()">
            <mat-icon>clear</mat-icon>
            Clear
          </button>
        }
        <input
          #fileInput
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          (change)="onFileSelected($event)"
          hidden
        />
      </div>

      @if (uploading) {
        <mat-progress-bar mode="indeterminate" color="accent"></mat-progress-bar>
      }

      @if (error) {
        <p class="error-text">{{ error }}</p>
      }

      <p class="hint">Accepted formats: JPG, PNG, WebP. Max size: {{ MAX_SIZE_MB }}MB</p>
    </div>
  `,
  styles: [`
    .image-upload { display: flex; flex-direction: column; gap: 12px; }
    .preview-container {
      position: relative;
      overflow: hidden;
      border: 2px dashed rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
    }
    .preview-container.shape-circle {
      width: 160px;
      height: 160px;
      border-radius: 50%;
    }
    .preview-container.shape-square {
      width: 120px;
      height: 80px;
      border-radius: 10px;
    }
    .upload-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    .upload-overlay.shape-circle { border-radius: 50%; }
    .upload-overlay.shape-square { border-radius: 10px; }
    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: var(--color-text-secondary, rgba(255,255,255,0.5));
    }
    .placeholder mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .upload-actions { display: flex; gap: 8px; }
    .error-text { color: #f44336; font-size: 0.85rem; margin: 0; }
    .hint { color: var(--color-text-secondary, rgba(255,255,255,0.5)); font-size: 0.8rem; margin: 0; }
  `],
})
export class ImageUploadComponent {
  @Input() currentImageUrl: string | undefined;
  @Input() uploading = false;
  /** Controls the shape of the preview container. */
  @Input() shape: 'circle' | 'square' = 'circle';
  /** Material icon name shown when no image is loaded. */
  @Input() placeholderIcon: string = 'person';
  /** Alt text for the preview image. */
  @Input() alt: string = 'Image preview';
  @Output() imageSelected = new EventEmitter<File>();
  @Output() imageCleared = new EventEmitter<void>();

  readonly MAX_SIZE_MB = MAX_SIZE_MB;
  previewUrl: string | null = null;
  error: string | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.error = null;

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.error = 'Invalid file type. Please use JPG, PNG, or WebP.';
      input.value = '';
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      this.error = `File too large. Maximum size is ${MAX_SIZE_MB}MB.`;
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);

    this.imageSelected.emit(file);
    input.value = '';
  }

  clearPreview(): void {
    this.previewUrl = null;
    this.error = null;
    this.imageCleared.emit();
  }

  /** Returns whether an image (preview or persisted) is currently visible. */
  get hasImage(): boolean {
    return !!(this.previewUrl || this.currentImageUrl);
  }
}
