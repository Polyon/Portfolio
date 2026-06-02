import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProfileService } from './profile.service';
import { environment } from '../../../environments/environment';
import { Profile, ProfileFormData } from '../models/profile.model';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}${environment.apiPrefix}`;

  const mockProfile: Profile = {
    id: '1',
    userId: 'user1',
    firstName: 'John',
    lastName: 'Doe',
    tagline: 'Full Stack Developer',
    bio: 'A passionate developer.',
    location: { city: 'New York', state: 'NY', country: 'USA' },
    profileImageUrl: 'https://example.com/img.jpg',
    isPublished: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProfileService, provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch profile via GET /admin/profile', () => {
    const apiResponse = { data: mockProfile, success: true };

    service.getProfile().subscribe((response) => {
      expect(response.data).toEqual(mockProfile);
    });

    const req = httpMock.expectOne(`${baseUrl}/admin/profile`);
    expect(req.request.method).toBe('GET');
    req.flush(apiResponse);
  });

  it('should update profile$ subject after getProfile', () => {
    const apiResponse = { data: mockProfile, success: true };

    service.getProfile().subscribe();
    httpMock.expectOne(`${baseUrl}/admin/profile`).flush(apiResponse);

    service.profile$.subscribe((profile) => {
      expect(profile).toEqual(mockProfile);
    });
  });

  it('should update profile via PUT /admin/profile', () => {
    const updateData: Partial<ProfileFormData> = {
      firstName: 'Jane',
      lastName: 'Smith',
    };
    const updatedProfile = { ...mockProfile, ...updateData };
    const apiResponse = { data: updatedProfile, success: true };

    service.updateProfile(updateData).subscribe((response) => {
      expect(response.data).toEqual(updatedProfile);
    });

    const req = httpMock.expectOne(`${baseUrl}/admin/profile`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateData);
    req.flush(apiResponse);
  });

  it('should toggle publish status via PUT /admin/profile/publish', () => {
    const publishedProfile = { ...mockProfile, isPublished: true };
    const apiResponse = { data: publishedProfile, success: true };

    service.publishProfile({ isPublished: true }).subscribe((response) => {
      expect((response.data as Profile).isPublished).toBe(true);
    });

    const req = httpMock.expectOne(`${baseUrl}/admin/profile/publish`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ isPublished: true });
    req.flush(apiResponse);
  });

  it('should upload image via POST /admin/profile/image', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const apiResponse = { data: { url: 'https://example.com/new.jpg' }, success: true };

    service.uploadImage(file).subscribe((response) => {
      expect((response.data as { url: string }).url).toBe('https://example.com/new.jpg');
    });

    const req = httpMock.expectOne(`${baseUrl}/admin/profile/image`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(apiResponse);
  });
});
