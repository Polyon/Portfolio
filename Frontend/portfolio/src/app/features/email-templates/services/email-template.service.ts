import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from '../../../core/http/api.service';
import {
  EmailTemplate,
  ListEmailTemplatesResponse,
  PreviewTemplateResponse,
  TemplatePreviewVariables,
} from '../../../shared/models/contact-inbox.models';

/**
 * Email template service — handles HTTP calls to the email-templates admin API.
 *
 * Endpoints (all under /api prefix configured in ApiService):
 *   GET  /admin/email-templates                  — list all six template descriptors
 *   POST /admin/email-templates/:name/preview    — render a template with given variables
 */
@Injectable({ providedIn: 'root' })
export class EmailTemplateService {
  private readonly api = inject(ApiService);

  /**
   * Fetches the list of all configured email template descriptors.
   *
   * @returns Observable wrapping the array of template descriptors.
   */
  listTemplates(): Observable<ListEmailTemplatesResponse> {
    return this.api.get<ListEmailTemplatesResponse>('/admin/email-templates');
  }

  /**
   * Requests a server-side render of the specified template with the given variables.
   *
   * Returns `null` when the server responds with 404 (unknown template name) so
   * the preview component can show an error banner instead of crashing.
   * All other errors are re-thrown for the global error interceptor to handle.
   *
   * @param name      - The {@link EmailTemplate} enum value identifying the template.
   * @param variables - Variable values to interpolate into the template.
   * @returns Observable wrapping the rendered HTML and plain-text output, or `null` on 404.
   */
  previewTemplate(
    name: EmailTemplate,
    variables: TemplatePreviewVariables,
  ): Observable<PreviewTemplateResponse | null> {
    return this.api.post<PreviewTemplateResponse>(
      `/admin/email-templates/${name}/preview`,
      { variables },
    ).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return of(null);
        throw err;
      }),
    );
  }
}
