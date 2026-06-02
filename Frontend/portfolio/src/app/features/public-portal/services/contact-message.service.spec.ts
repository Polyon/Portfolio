import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';

import { ContactMessageService, ContactMessageDTO } from './contact-message.service';
import { ApiService } from '../../../core/http/api.service';
import { ApiResponse } from '../../../core/models/common.models';
import { QueryType } from '../../../shared/models/contact-inbox.models';

/**
 * T013 — ContactMessageService unit tests.
 *
 * Verifies that sendMessage() forwards the full DTO — including the optional
 * queryType field — to the correct API endpoint via ApiService.
 */
describe('ContactMessageService', () => {
  let service: ContactMessageService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const SUCCESS_RESPONSE: ApiResponse<null> = { success: true, data: null };
  const BASE_DTO: ContactMessageDTO = {
    name: 'Alice',
    email: 'alice@example.com',
    message: 'Hello, I have a question.',
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', ['post']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ContactMessageService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(ContactMessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── sendMessage() — without queryType ────────────────────────────────────

  describe('sendMessage() — without queryType', () => {
    it('should call api.post with /public/contact/message endpoint', () => {
      apiSpy.post.and.returnValue(of(SUCCESS_RESPONSE));
      service.sendMessage(BASE_DTO).subscribe();
      expect(apiSpy.post).toHaveBeenCalledWith(
        '/public/contact/message',
        jasmine.any(Object),
      );
    });

    it('should forward name, email, and message fields in the payload', () => {
      apiSpy.post.and.returnValue(of(SUCCESS_RESPONSE));
      service.sendMessage(BASE_DTO).subscribe();
      expect(apiSpy.post).toHaveBeenCalledWith(
        '/public/contact/message',
        jasmine.objectContaining({
          name: 'Alice',
          email: 'alice@example.com',
          message: 'Hello, I have a question.',
        }),
      );
    });
  });

  // ─── sendMessage() — queryType: SERVICE ───────────────────────────────────

  describe('sendMessage() — queryType: SERVICE', () => {
    it('should include queryType SERVICE in the POST payload', () => {
      apiSpy.post.and.returnValue(of(SUCCESS_RESPONSE));
      service
        .sendMessage({ ...BASE_DTO, queryType: QueryType.SERVICE })
        .subscribe();
      expect(apiSpy.post).toHaveBeenCalledWith(
        '/public/contact/message',
        jasmine.objectContaining({ queryType: QueryType.SERVICE }),
      );
    });

    it('should return the observable from api.post', (done) => {
      apiSpy.post.and.returnValue(of(SUCCESS_RESPONSE));
      service
        .sendMessage({ ...BASE_DTO, queryType: QueryType.SERVICE })
        .subscribe((res) => {
          expect(res).toEqual(SUCCESS_RESPONSE);
          done();
        });
    });
  });

  // ─── sendMessage() — queryType: GENERAL ───────────────────────────────────

  describe('sendMessage() — queryType: GENERAL', () => {
    it('should include queryType GENERAL in the POST payload', () => {
      apiSpy.post.and.returnValue(of(SUCCESS_RESPONSE));
      service
        .sendMessage({ ...BASE_DTO, queryType: QueryType.GENERAL })
        .subscribe();
      expect(apiSpy.post).toHaveBeenCalledWith(
        '/public/contact/message',
        jasmine.objectContaining({ queryType: QueryType.GENERAL }),
      );
    });
  });
});
