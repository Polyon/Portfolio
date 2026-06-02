import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProfileEditComponent } from './profile-edit.component';
import { ProfileService } from '../../../core/services/profile.service';
import { of, throwError } from 'rxjs';
import { Profile } from '../../../core/models/profile.model';

describe('ProfileEditComponent', () => {
  let component: ProfileEditComponent;
  let fixture: ComponentFixture<ProfileEditComponent>;
  let profileServiceSpy: jasmine.SpyObj<ProfileService>;

  const mockProfile: Profile = {
    id: '1',
    userId: 'user1',
    firstName: 'John',
    lastName: 'Doe',
    tagline: 'Developer',
    bio: 'Bio text',
    location: { city: 'NYC', state: 'NY', country: 'USA' },
    profileImageUrl: '',
    isPublished: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    profileServiceSpy = jasmine.createSpyObj('ProfileService', [
      'getProfile',
      'updateProfile',
      'publishProfile',
      'uploadImage',
    ], {
      profile$: of(mockProfile),
    });
    profileServiceSpy.getProfile.and.returnValue(of({ data: mockProfile, success: true }));
    profileServiceSpy.updateProfile.and.returnValue(of({ data: mockProfile, success: true }));

    await TestBed.configureTestingModule({
      imports: [
        ProfileEditComponent,
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatSnackBarModule,
      ],
      providers: [
        { provide: ProfileService, useValue: profileServiceSpy },
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load profile on init', () => {
    expect(profileServiceSpy.getProfile).toHaveBeenCalled();
    expect(component.profile()).toEqual(mockProfile);
  });

  it('should populate form with profile data', () => {
    expect(component.profileForm.get('firstName')?.value).toBe('John');
    expect(component.profileForm.get('lastName')?.value).toBe('Doe');
    expect(component.profileForm.get('tagline')?.value).toBe('Developer');
    expect(component.profileForm.get('city')?.value).toBe('NYC');
  });

  it('should report no unsaved changes initially', () => {
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('should detect unsaved changes when form is dirty', () => {
    component.profileForm.get('firstName')?.setValue('Jane');
    component.profileForm.markAsDirty();
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('should require firstName and lastName', () => {
    component.profileForm.get('firstName')?.setValue('');
    component.profileForm.get('lastName')?.setValue('');
    expect(component.profileForm.get('firstName')?.hasError('required')).toBe(true);
    expect(component.profileForm.get('lastName')?.hasError('required')).toBe(true);
  });

  it('should enforce maxLength on tagline', () => {
    component.profileForm.get('tagline')?.setValue('a'.repeat(201));
    expect(component.profileForm.get('tagline')?.hasError('maxlength')).toBe(true);
  });

  it('should enforce maxLength on bio', () => {
    component.profileForm.get('bio')?.setValue('a'.repeat(5001));
    expect(component.profileForm.get('bio')?.hasError('maxlength')).toBe(true);
  });

  it('should not save when form is invalid', () => {
    component.profileForm.get('firstName')?.setValue('');
    component.save();
    expect(profileServiceSpy.updateProfile).not.toHaveBeenCalled();
  });

  it('should call updateProfile on save', () => {
    component.profileForm.markAsDirty();
    component.save();
    expect(profileServiceSpy.updateProfile).toHaveBeenCalled();
  });

  it('should toggle publish status', () => {
    const publishedProfile = { ...mockProfile, isPublished: true };
    profileServiceSpy.publishProfile.and.returnValue(of({ data: publishedProfile, success: true }));

    component.togglePublish();
    expect(profileServiceSpy.publishProfile).toHaveBeenCalledWith({ isPublished: true });
  });

  it('should handle image selection', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    component.onImageSelected(file);
    expect(component.pendingImageFile).toBe(file);
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('should clear pending image on image cleared', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    component.onImageSelected(file);
    component.onImageCleared();
    expect(component.pendingImageFile).toBeNull();
  });

  it('should track bio character count', () => {
    component.profileForm.get('bio')?.setValue('Hello world');
    expect(component.charCount).toBe(11);
  });
});
