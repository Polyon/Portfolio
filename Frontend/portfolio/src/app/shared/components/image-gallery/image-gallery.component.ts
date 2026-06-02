import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { inject } from '@angular/core';

import { ProjectImage } from '../../../core/models/project.model';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 5;

/**
 * Image gallery editor that supports multi-image upload, preview, removal,
 * and drag-and-drop reordering.
 *
 * Emits `imagesChange` whenever the list is mutated.
 */
@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="gallery-container">
      <div class="gallery-header">
        <span class="gallery-label">Images</span>
        <label class="upload-btn" matTooltip="Upload images (JPG, PNG, WebP, max 5 MB each)">
          <mat-icon>add_photo_alternate</mat-icon> Add Image
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple (change)="onFilesSelected($event)" hidden />
        </label>
      </div>

      <div
        cdkDropList
        cdkDropListOrientation="horizontal"
        class="image-grid"
        (cdkDropListDropped)="onDrop($event)"
      >
        <div
          *ngFor="let img of images(); let i = index"
          cdkDrag
          class="image-card"
          [class.pending]="img['_pending']"
        >
          <img [src]="img['_preview'] ?? img.url" [alt]="'Project image ' + (i + 1)" class="preview-img" />
          <div class="image-overlay">
            <span class="order-badge">{{ i + 1 }}</span>
            <button mat-icon-button color="warn" matTooltip="Remove" (click)="removeImage(i)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
          <div cdkDragHandle class="drag-handle" matTooltip="Drag to reorder">
            <mat-icon>drag_indicator</mat-icon>
          </div>
        </div>

        <div *ngIf="images().length === 0" class="empty-gallery">
          <mat-icon>image</mat-icon>
          <p>No images yet. Upload images above.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gallery-container { display: flex; flex-direction: column; gap: 8px; }
    .gallery-header { display: flex; justify-content: space-between; align-items: center; }
    .gallery-label { font-size: 14px; color: rgba(255,255,255,0.7); }
    .upload-btn {
      display: inline-flex; align-items: center; gap: 4px;
      cursor: pointer; color: #00D9FF; font-size: 14px;
      padding: 4px 12px; border-radius: 4px;
      border: 1px solid #00D9FF33; transition: background .2s;
    }
    .upload-btn:hover { background: #00D9FF11; }
    .image-grid { display: flex; flex-wrap: wrap; gap: 12px; min-height: 80px; }
    .image-card {
      position: relative; width: 120px; height: 90px;
      border-radius: 8px; overflow: hidden;
      border: 2px solid transparent; transition: border-color .2s;
    }
    .image-card.pending { border-color: #00D9FF; }
    .preview-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .image-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 4px; opacity: 0; transition: opacity .2s;
    }
    .image-card:hover .image-overlay { opacity: 1; }
    .order-badge {
      background: rgba(0,0,0,0.7); color: #fff;
      font-size: 11px; padding: 2px 6px; border-radius: 4px;
    }
    .drag-handle {
      position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
      cursor: grab; color: rgba(255,255,255,0.7);
    }
    .empty-gallery {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; width: 100%; padding: 24px;
      color: rgba(255,255,255,0.4); gap: 4px;
    }
    .empty-gallery mat-icon { font-size: 36px; width: 36px; height: 36px; }
  `],
})
export class ImageGalleryComponent implements OnChanges {
  /** Existing images from the API (persisted URLs). */
  @Input() existingImages: ProjectImage[] = [];
  /** Emits when the images list changes (for new file uploads or reordering). */
  @Output() imagesChange = new EventEmitter<{ files: File[]; order: ProjectImage[] }>();

  private snackBar = inject(MatSnackBar);

  images = signal<Array<ProjectImage & { _pending?: boolean; _preview?: string; _file?: File }>>([]);
  private pendingFiles: File[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingImages']) {
      this.images.set(this.existingImages.map((img) => ({ ...img })));
    }
  }

  /** Handles file input selection event. */
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        this.snackBar.open(`"${file.name}" is not a supported image type.`, 'Dismiss', { duration: 4000 });
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        this.snackBar.open(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB} MB limit.`, 'Dismiss', { duration: 4000 });
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        const order = this.images().length;
        this.images.update((list) => [
          ...list,
          { url: '', order, _pending: true, _preview: preview, _file: file },
        ]);
        this.pendingFiles.push(file);
        this.emitChange();
      };
      reader.readAsDataURL(file);
    }
  }

  /** Removes an image by index. */
  removeImage(index: number): void {
    const img = this.images()[index];
    if (img._pending && img._file) {
      this.pendingFiles = this.pendingFiles.filter((f) => f !== img._file);
    }
    this.images.update((list) => {
      const updated = list.filter((_, i) => i !== index);
      return updated.map((item, i) => ({ ...item, order: i }));
    });
    this.emitChange();
  }

  /** Handles drag-and-drop reorder events. */
  onDrop(event: CdkDragDrop<Array<ProjectImage>>): void {
    this.images.update((list) => {
      const mutable = [...list];
      moveItemInArray(mutable, event.previousIndex, event.currentIndex);
      return mutable.map((item, i) => ({ ...item, order: i }));
    });
    this.emitChange();
  }

  private emitChange(): void {
    const order = this.images()
      .filter((img) => !img._pending)
      .map(({ url, order }) => ({ url, order }));
    this.imagesChange.emit({ files: [...this.pendingFiles], order });
  }
}
