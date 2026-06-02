import { ContactMessage } from '../infrastructure/database/models/ContactMessage';
import { QueryType } from '../domain/enums/query-type.enum';
import { emailService as defaultEmailService, EmailService } from '../infrastructure/email/EmailService';
import { EmailTemplate } from '../infrastructure/email/types';
import { NotFoundError } from '../domain/errors/AppError';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/** Query parameters accepted by the list() method. */
export interface ListContactMessagesQuery {
  page?:      number;
  limit?:     number;
  queryType?: QueryType;
  isRead?:    boolean;
}

/** Shape of each item in the paginated list (message body excluded). */
export interface ContactMessageListItem {
  id:         string;
  name:       string;
  email:      string;
  subject?:   string;
  queryType:  QueryType;
  isRead:     boolean;
  replyCount: number;
  createdAt:  Date;
}

/** Pagination metadata returned alongside list results. */
export interface PaginationMeta {
  total:       number;
  pages:       number;
  currentPage: number;
  limit:       number;
}

/** Aggregate counts for the stats endpoint. */
export interface ContactMessageStats {
  total:          number;
  unread:         number;
  serviceQueries: number;
  generalQueries: number;
}

/** DTO for admin reply submissions. */
export interface SendReplyDTO {
  /** Optional override subject; defaults to "Re: {original subject}" at service layer. */
  subject?: string;
  /** Reply body text. Handlebars auto-escapes HTML at render time. */
  body:     string;
}

/** Shape of a persisted reply returned to the client. */
export interface ContactReplyDetail {
  id:       string;
  subject?: string;
  body:     string;
  /** ISO 8601 timestamp when the reply was sent. */
  sentAt:   string;
  /** JWT `sub` of the admin who sent the reply. */
  sentBy:   string;
}

/** Reply template by query type. */
const REPLY_TEMPLATE: Record<QueryType, EmailTemplate> = {
  [QueryType.SERVICE]: EmailTemplate.SERVICE_INQUIRY_REPLY,
  [QueryType.GENERAL]: EmailTemplate.GENERAL_INQUIRY_REPLY,
};

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Application-layer service for admin operations on contact messages
 * (inbox, mark-read, delete, stats, reply).
 */
export class ContactMessageAdminService {
  private readonly _emailService: Pick<EmailService, 'send' | 'renderTemplate'>;

  /**
   * @param emailService - Email service instance; defaults to the production singleton.
   *                       Pass a mock for unit testing.
   */
  constructor(emailService: Pick<EmailService, 'send' | 'renderTemplate'> = defaultEmailService) {
    this._emailService = emailService;
  }
  /**
   * Returns a paginated, filtered list of contact messages.
   * Message body (`message` field) is excluded from each item (FR-017).
   *
   * @param query - Pagination and filter options (page, limit, queryType, isRead).
   * @returns Paginated result with `data` array and `pagination` metadata.
   */
  async list(query: ListContactMessagesQuery): Promise<{ data: ContactMessageListItem[]; pagination: PaginationMeta }> {
    const page  = Math.max(1, query.page  ?? 1);
    const limit = Math.max(1, query.limit ?? 20);
    const skip  = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.queryType !== undefined) {
      filter['queryType'] = query.queryType;
    }
    if (query.isRead !== undefined) {
      filter['isRead'] = query.isRead;
    }

    const [docs, total] = await Promise.all([
      ContactMessage
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-message')
        .lean(),
      ContactMessage.countDocuments(filter),
    ]);

    const data: ContactMessageListItem[] = docs.map((doc) => ({
      id:         String(doc['_id']),
      name:       doc['name'] as string,
      email:      doc['email'] as string,
      subject:    doc['subject'] as string | undefined,
      queryType:  doc['queryType'] as QueryType,
      isRead:     doc['isRead'] as boolean,
      replyCount: ((doc['replies'] as unknown[]) ?? []).length,
      createdAt:  doc['createdAt'] as Date,
    }));

    return {
      data,
      pagination: {
        total,
        pages:       Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    };
  }

  /**
   * Returns the full contact message document (including replies) or null.
   *
   * @param id - MongoDB ObjectId string of the ContactMessage document.
   * @returns The full document or `null` if no document with that id exists.
   */
  async getById(id: string): Promise<InstanceType<typeof ContactMessage> | null> {
    return ContactMessage.findById(id).exec();
  }

  /**
   * Sets the isRead flag on a contact message and returns the updated document.
   *
   * @param id     - MongoDB ObjectId string of the ContactMessage document.
   * @param isRead - New read state to apply.
   * @returns The updated document, or `null` if no document with that id exists.
   */
  async markRead(id: string, isRead: boolean): Promise<InstanceType<typeof ContactMessage> | null> {
    return ContactMessage.findByIdAndUpdate(
      id,
      { $set: { isRead } },
      { returnDocument: 'after' },
    ).exec();
  }

  /**
   * Deletes a contact message by id and returns the deleted document.
   *
   * @param id - MongoDB ObjectId string of the ContactMessage document.
   * @returns The deleted document, or `null` if no document with that id exists.
   */
  async delete(id: string): Promise<InstanceType<typeof ContactMessage> | null> {
    return ContactMessage.findByIdAndDelete(id).exec();
  }

  /**
   * Returns aggregate inbox statistics.
   *
   * @returns Counts: `{ total, unread, serviceQueries, generalQueries }`.
   */
  async stats(): Promise<ContactMessageStats> {
    const [total, unread, serviceQueries, generalQueries] = await Promise.all([
      ContactMessage.countDocuments({}),
      ContactMessage.countDocuments({ isRead: false }),
      ContactMessage.countDocuments({ queryType: QueryType.SERVICE }),
      ContactMessage.countDocuments({ queryType: QueryType.GENERAL }),
    ]);

    return { total, unread, serviceQueries, generalQueries };
  }

  /**
   * Sends a reply email to the original visitor and persists the reply
   * to the contact message document — only if the email send succeeds (atomic FR-025).
   *
   * @param id      - ID of the target ContactMessage document.
   * @param dto     - Reply body and optional subject override.
   * @param adminId - JWT `sub` of the authenticated admin sending the reply.
   * @returns Persisted `ContactReplyDetail`.
   * @throws `NotFoundError` (404) if the message does not exist.
   * @throws The underlying send error if the email fails after all retries.
   */
  async sendReply(id: string, dto: SendReplyDTO, adminId: string): Promise<ContactReplyDetail> {
    const message = await ContactMessage.findById(id).exec();
    if (!message) {
      throw new NotFoundError('Contact message not found');
    }

    const replySubject = dto.subject ?? `Re: ${message.subject ?? 'Your enquiry'}`;
    const queryType    = (message.queryType as QueryType) ?? QueryType.GENERAL;
    const template     = REPLY_TEMPLATE[queryType];

    const { html, text } = await this._emailService.renderTemplate(template, {
      visitorName:  message.name,
      visitorEmail: message.email,
      subject:      replySubject,
      replyBody:    dto.body,
      ownerName:    process.env['OWNER_NAME']    ?? 'Portfolio Owner',
      portfolioUrl: process.env['PORTFOLIO_URL'] ?? '',
    });

    // Attempt send — if this throws, we do NOT persist (FR-025 atomicity rule).
    await this._emailService.send({
      to:      message.email,
      subject: replySubject,
      html,
      text,
    });

    // Persist reply only after successful email send.
    const sentAt = new Date();
    message.replies.push({
      subject: replySubject,
      body:    dto.body,
      sentAt,
      sentBy:  adminId,
    } as Parameters<typeof message.replies.push>[0]);

    await message.save();

    const savedReply = message.replies[message.replies.length - 1]!;
    return {
      id:      String(savedReply._id),
      subject: savedReply.subject,
      body:    savedReply.body,
      sentAt:  savedReply.sentAt.toISOString(),
      sentBy:  savedReply.sentBy,
    };
  }
}
