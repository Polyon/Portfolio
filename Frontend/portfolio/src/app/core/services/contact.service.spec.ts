import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContactService } from './contact.service';
import { Contact, ContactFormData } from '../models/contact.model';
import { ApiResponse } from '../models/common.models';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}${environment.apiPrefix}`;

describe('ContactService', () => {
  let service: ContactService;
  let http: HttpTestingController;

  const mockContact: Contact = {
    id: 'c1',
    userId: 'u1',
    email: 'admin@example.com',
    emailPublic: true,
    phone: '+1 555 000 0000',
    phonePublic: false,
    linkedinUrl: 'https://linkedin.com/in/admin',
    linkedinPublic: true,
    githubUrl: 'https://github.com/admin',
    githubPublic: true,
    twitterUrl: '',
    twitterPublic: false,
    websiteUrl: 'https://adminsite.com',
    websitePublic: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockApiResponse: ApiResponse<Contact> = { data: mockContact, success: true };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ContactService,
      ],
    });
    service = TestBed.inject(ContactService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getContact()', () => {
    it('should GET /admin/contact and return the contact record', () => {
      service.getContact().subscribe((res) => {
        expect(res.data).toEqual(mockContact);
      });

      const req = http.expectOne(`${BASE}/admin/contact`);
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should update the contact$ BehaviorSubject on success', () => {
      let emitted: Contact | null = null;
      service.contact$.subscribe((c) => (emitted = c));

      service.getContact().subscribe();
      http.expectOne(`${BASE}/admin/contact`).flush(mockApiResponse);

      expect(emitted as unknown as Contact).toEqual(mockContact);
    });
  });

  describe('updateContact()', () => {
    it('should PUT /admin/contact with payload and return updated record', () => {
      const payload: Partial<ContactFormData> = { email: 'new@example.com', emailPublic: false };
      const updatedContact = { ...mockContact, email: 'new@example.com', emailPublic: false };
      const updatedResponse: ApiResponse<Contact> = { data: updatedContact, success: true };

      service.updateContact(payload).subscribe((res) => {
        expect(res.data).toEqual(updatedContact);
      });

      const req = http.expectOne(`${BASE}/admin/contact`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush(updatedResponse);
    });

    it('should update the contact$ BehaviorSubject after a successful update', () => {
      const payload: Partial<ContactFormData> = { phone: '+44 20 7946 0000', phonePublic: true };
      const updatedContact = { ...mockContact, phone: '+44 20 7946 0000', phonePublic: true };
      const updatedResponse: ApiResponse<Contact> = { data: updatedContact, success: true };

      let emitted: Contact | null = null;
      service.contact$.subscribe((c) => (emitted = c));

      service.updateContact(payload).subscribe();
      http.expectOne(`${BASE}/admin/contact`).flush(updatedResponse);

      expect(emitted as unknown as Contact).toEqual(updatedContact);
    });
  });
});
