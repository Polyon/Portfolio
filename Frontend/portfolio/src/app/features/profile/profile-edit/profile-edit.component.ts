import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  DestroyRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, timer, switchMap, filter, tap, catchError, of } from 'rxjs';

import { ProfileService } from '../../../core/services/profile.service';
import { Profile, ProfileFormData } from '../../../core/models/profile.model';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { RichTextComponent } from '../../../shared/components/rich-text/rich-text.component';
import {
  ClassicEditor,
  Bold, Italic, Underline, Strikethrough,
  Essentials, Paragraph, Heading,
  List,
  Link, BlockQuote,
  Undo,
} from 'ckeditor5';

const AUTO_SAVE_INTERVAL_MS = 30_000;

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule,
    ImageUploadComponent,
    CKEditorModule,
    RichTextComponent,
  ],
  templateUrl: './profile-edit.component.html',
  styleUrl: './profile-edit.component.scss',
})
export class ProfileEditComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  readonly isBrowser = isPlatformBrowser(this.platformId);

  // CKEditor
  readonly Editor = ClassicEditor;
  readonly editorConfig = {
    licenseKey: 'GPL',
    plugins: [
      Essentials, Bold, Italic, Underline, Strikethrough,
      Paragraph, Heading, List,
      Link, BlockQuote, Undo,
    ],
    toolbar: [
      'heading', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'bulletedList', 'numberedList', '|',
      'blockQuote', 'link', '|',
      'undo', 'redo',
    ],
    placeholder: 'Tell your story…',
  };

  profileForm!: FormGroup;
  isLoading = signal(true);
  isSaving = signal(false);
  showBioPreview = signal(false);
  isImageUploading = signal(false);
  autoSaveStatus = signal<string | null>(null);
  profile = signal<Profile | null>(null);

  private autoSaveDestroy$ = new Subject<void>();

  ngOnInit(): void {
    this.initForm();
    this.loadProfile();
    this.startAutoSave();
  }

  ngOnDestroy(): void {
    this.autoSaveDestroy$.next();
    this.autoSaveDestroy$.complete();
  }

  hasUnsavedChanges(): boolean {
    return this.profileForm?.dirty ?? false;
  }

  onImageSelected(file: File): void {
    this.isImageUploading.set(true);
    this.profileService.uploadImage(file).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (imgResponse) => {
        const url = (imgResponse.data as { profileImageUrl: string }).profileImageUrl;
        this.profile.update((p) => p ? { ...p, profileImageUrl: url } : p);
        this.profileForm.patchValue({ profileImageUrl: url }, { emitEvent: false });
        this.isImageUploading.set(false);
        this.snackBar.open('Profile image uploaded!', 'OK', { duration: 3000 });
      },
      error: () => {
        this.isImageUploading.set(false);
        this.snackBar.open('Image upload failed. Please try again.', 'Dismiss', { duration: 5000 });
      },
    });
  }

  onImageCleared(): void {
    this.profileForm.patchValue({ profileImageUrl: '' });
    this.profileForm.markAsDirty();
  }

  save(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.performSave(false);
  }

  togglePublish(): void {
    const current = this.profile();
    if (!current) return;

    const newStatus = !current.isPublished;
    this.profileService.publishProfile({ isPublished: newStatus }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response) => {
        this.profile.set(response.data as Profile);
        this.profileForm.patchValue({ isPublished: newStatus }, { emitEvent: false });
        this.snackBar.open(
          newStatus ? 'Profile published!' : 'Profile unpublished.',
          'OK',
          { duration: 3000 }
        );
      },
      error: () => {
        this.snackBar.open('Failed to update publish status.', 'Dismiss', { duration: 5000 });
      },
    });
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      tagline: ['', [Validators.maxLength(200)]],
      bio: ['', [Validators.maxLength(5000)]],
      city: ['', [Validators.maxLength(100)]],
      state: ['', [Validators.maxLength(100)]],
      country: ['', [Validators.maxLength(100)]],
      email: ['', [Validators.email, Validators.maxLength(200)]],
      phone: ['', [Validators.maxLength(30)]],
      linkedinUrl: ['', [Validators.maxLength(300)]],
      githubUrl: ['', [Validators.maxLength(300)]],
      profileImageUrl: [''],
      isPublished: [false],
    });
  }

  private loadProfile(): void {
    this.isLoading.set(true);
    this.profileService.getProfile().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response) => {
        const p = response.data as Profile;
        this.profile.set(p);
        this.profileForm.patchValue({
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          tagline: p.tagline || '',
          bio: p.bio || '',
          city: p.location?.city || '',
          state: p.location?.state || '',
          country: p.location?.country || '',
          email: (p as any).email || '',
          phone: (p as any).phone || '',
          linkedinUrl: (p as any).linkedinUrl || '',
          githubUrl: (p as any).githubUrl || '',
          profileImageUrl: p.profileImageUrl || '',
          isPublished: p.isPublished,
        });
        this.profileForm.markAsPristine();
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load profile.', 'Dismiss', { duration: 5000 });
        this.isLoading.set(false);
      },
    });
  }

  private performSave(isAutoSave: boolean): void {
    if (this.isSaving()) return;

    const formValue = this.profileForm.getRawValue();
    const data: Partial<ProfileFormData> = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      tagline: formValue.tagline,
      bio: formValue.bio,
      location: {
        city: formValue.city,
        state: formValue.state,
        country: formValue.country,
      },
      profileImageUrl: formValue.profileImageUrl,
      ...(formValue.email && { email: formValue.email }),
      ...(formValue.phone && { phone: formValue.phone }),
      ...(formValue.linkedinUrl && { linkedinUrl: formValue.linkedinUrl }),
      ...(formValue.githubUrl && { githubUrl: formValue.githubUrl }),
    } as any;

    this.isSaving.set(true);
    if (isAutoSave) {
      this.autoSaveStatus.set('Auto-saving...');
    }

    const save$ = this.profileService.updateProfile(data);

    save$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response) => {
        this.profile.set(response.data as Profile);
        this.profileForm.markAsPristine();
        this.isSaving.set(false);
        if (isAutoSave) {
          this.autoSaveStatus.set('Saved');
          setTimeout(() => this.autoSaveStatus.set(null), 2000);
        } else {
          this.snackBar.open('Profile saved successfully!', 'OK', { duration: 3000 });
        }
      },
      error: () => {
        this.isSaving.set(false);
        this.isImageUploading.set(false);
        this.autoSaveStatus.set(null);
        if (!isAutoSave) {
          this.snackBar.open('Failed to save profile.', 'Dismiss', { duration: 5000 });
        }
      },
    });
  }

  private startAutoSave(): void {
    timer(AUTO_SAVE_INTERVAL_MS, AUTO_SAVE_INTERVAL_MS).pipe(
      filter(() => this.profileForm.dirty && this.profileForm.valid),
      tap(() => this.performSave(true)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  get charCount(): number {
    return this.profileForm.get('bio')?.value?.length || 0;
  }
}
