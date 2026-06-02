import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { ApiService } from '../http/api.service';
import { ApiResponse } from '../models/common.models';
import { Contact, ContactFormData } from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private api = inject(ApiService);
  private contactSubject = new BehaviorSubject<Contact | null>(null);

  /** Emits the cached contact record whenever it is fetched or updated. */
  readonly contact$ = this.contactSubject.asObservable();

  /**
   * Fetches the current user's contact information.
   *
   * @returns Observable wrapping the contact record.
   */
  getContact(): Observable<ApiResponse<Contact>> {
    return this.api.get<ApiResponse<Contact>>('/admin/contact').pipe(
      tap((response) => this.contactSubject.next(response.data as Contact)),
    );
  }

  /**
   * Updates the contact information including per-field visibility flags.
   *
   * @param data - Contact form payload with values and visibility flags.
   * @returns Observable wrapping the updated contact record.
   */
  updateContact(data: Partial<ContactFormData>): Observable<ApiResponse<Contact>> {
    return this.api.put<ApiResponse<Contact>>('/admin/contact', data).pipe(
      tap((response) => this.contactSubject.next(response.data as Contact)),
    );
  }
}
