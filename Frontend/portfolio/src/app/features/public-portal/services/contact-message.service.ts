import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { ApiResponse } from '../../../core/models/common.models';
import { QueryType } from '../../../shared/models/contact-inbox.models';

export interface ContactMessageDTO {
  name: string;
  email: string;
  subject?: string;
  message: string;
  /** Query type selected by the visitor. Triggers the matching email template pair on the backend. */
  queryType?: QueryType;
}

/**
 * Service for submitting visitor contact inquiry messages to the portfolio owner.
 * Calls POST /api/public/contact/message on the backend.
 */
@Injectable({ providedIn: 'root' })
export class ContactMessageService {
  private readonly api = inject(ApiService);

  /**
   * Sends a contact inquiry message from a public portal visitor.
   *
   * @param dto - Validated form payload including the visitor's selected query type.
   *              When `queryType` is present the backend selects the appropriate
   *              `SERVICE_INQUIRY_*` or `GENERAL_INQUIRY_*` email template pair.
   * @returns Observable resolving to the API success/error response.
   */
  sendMessage(dto: ContactMessageDTO): Observable<ApiResponse<null>> {
    return this.api.post<ApiResponse<null>>('/public/contact/message', dto);
  }
}
