import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';

import { EmailTemplateService } from './email-template.service';
import { ApiService } from '../../../core/http/api.service';
import { EmailTemplate } from '../../../shared/models/contact-inbox.models';

/**
 * T007 — EmailTemplateService unit tests.
 *
 * Verifies that listTemplates() and previewTemplate() construct the correct
 * HTTP calls via ApiService. No real HTTP requests are made.
 */
describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        EmailTemplateService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(EmailTemplateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── listTemplates() ───────────────────────────────────────────────────────

  describe('listTemplates()', () => {
    it('should call api.get with /admin/email-templates', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: [] }));
      service.listTemplates().subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith('/admin/email-templates');
    });

    it('should return the observable emitted by api.get', (done) => {
      const mockResponse = { success: true as const, data: [] };
      apiSpy.get.and.returnValue(of(mockResponse));
      service.listTemplates().subscribe((res) => {
        expect(res).toEqual(mockResponse);
        done();
      });
    });
  });

  // ─── previewTemplate() ─────────────────────────────────────────────────────

  describe('previewTemplate()', () => {
    it('should call api.post with the correct URL and variables payload', () => {
      apiSpy.post.and.returnValue(
        of({ success: true, data: { html: '<p>Hello</p>', text: 'Hello' } }),
      );
      const variables = { visitorName: 'Alice', subject: 'Test enquiry' };
      service
        .previewTemplate(EmailTemplate.SERVICE_INQUIRY_SENDER, variables)
        .subscribe();
      expect(apiSpy.post).toHaveBeenCalledWith(
        '/admin/email-templates/SERVICE_INQUIRY_SENDER/preview',
        { variables },
      );
    });

    it('should interpolate each of the six EmailTemplate names into the URL', () => {
      const allTemplates = Object.values(EmailTemplate);
      allTemplates.forEach((templateName) => {
        apiSpy.post.and.returnValue(
          of({ success: true, data: { html: '', text: '' } }),
        );
        service.previewTemplate(templateName, {}).subscribe();
        expect(apiSpy.post).toHaveBeenCalledWith(
          `/admin/email-templates/${templateName}/preview`,
          { variables: {} },
        );
      });
      expect(apiSpy.post).toHaveBeenCalledTimes(allTemplates.length);
    });

    it('should pass an empty variables object when no variables are provided', () => {
      apiSpy.post.and.returnValue(
        of({ success: true, data: { html: '', text: '' } }),
      );
      service
        .previewTemplate(EmailTemplate.GENERAL_INQUIRY_REPLY, {})
        .subscribe();
      expect(apiSpy.post).toHaveBeenCalledWith(
        '/admin/email-templates/GENERAL_INQUIRY_REPLY/preview',
        { variables: {} },
      );
    });
  });
});
