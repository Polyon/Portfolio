import { ContactMessage, IContactMessage } from '../infrastructure/database/models/ContactMessage';
import { emailService, EmailService } from '../infrastructure/email/EmailService';
import { QueryType } from '../domain/enums/query-type.enum';

export interface SendContactMessageDTO {
  name:       string;
  email:      string;
  subject?:   string;
  message:    string;
  ipAddress?: string;
  userAgent?: string;
  /** Optional visitor-selected inquiry classification. Defaults to GENERAL (FR-001, FR-003). */
  queryType?: QueryType;
}

export class ContactMessageService {
  /** @internal Overridable in tests to simulate email failures without side effects. */
  private _emailService: Pick<EmailService, 'sendContactNotifications'> = emailService;

  /**
   * Persists a contact inquiry message sent by a public portfolio visitor,
   * then dispatches email notifications fire-and-forget (never blocks the response).
   *
   * @param dto - Validated message payload from the public contact form.
   * @returns The saved ContactMessage document.
   */
  async send(dto: SendContactMessageDTO): Promise<IContactMessage> {
    const saved = await ContactMessage.create({
      name:      dto.name.trim(),
      email:     dto.email.trim().toLowerCase(),
      subject:   dto.subject?.trim(),
      message:   dto.message.trim(),
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      queryType: dto.queryType ?? QueryType.GENERAL,
    });

    // Fire-and-forget: email failures must never surface as a 500 to the visitor (FR-011).
    setImmediate(() => {
      this._emailService.sendContactNotifications(saved).catch((err: unknown) => {
        console.error('[ContactMessageService] Failed to send contact notification email', err);
      });
    });

    return saved;
  }
}
