/**
 * Shared frontend data models for the Contact Email UI Integration feature (007).
 *
 * All interfaces mirror the 006-contact-email-admin-inbox backend API contracts.
 * Backend source of truth: specs/006-contact-email-admin-inbox/contracts/
 *
 * Used by:
 *   - ContactInboxService (admin inbox API calls)
 *   - ContactInboxStateService (unread count reactive state)
 *   - EmailTemplateService (template preview API calls)
 *   - ReplyComposeComponent (MatDialog data and form value)
 *   - TemplatePreviewComponent (@Input bindings)
 *   - contact-message.service.ts (extended DTO for public portal)
 */

// ─── Shared Enums ─────────────────────────────────────────────────────────────

/**
 * Query type for a visitor contact submission.
 * Mirror of backend QueryType enum — values must stay in sync with 006 backend.
 */
export enum QueryType {
  SERVICE = 'SERVICE',
  GENERAL = 'GENERAL',
}

/**
 * Names of the six server-side email templates.
 * Mirror of backend EmailTemplate enum — values must stay in sync with 006 backend.
 */
export enum EmailTemplate {
  SERVICE_INQUIRY_SENDER   = 'SERVICE_INQUIRY_SENDER',
  SERVICE_INQUIRY_RECEIVER = 'SERVICE_INQUIRY_RECEIVER',
  SERVICE_INQUIRY_REPLY    = 'SERVICE_INQUIRY_REPLY',
  GENERAL_INQUIRY_SENDER   = 'GENERAL_INQUIRY_SENDER',
  GENERAL_INQUIRY_RECEIVER = 'GENERAL_INQUIRY_RECEIVER',
  GENERAL_INQUIRY_REPLY    = 'GENERAL_INQUIRY_REPLY',
}

/** Recipient role label used in the template list UI. */
export type RecipientRole = 'SENDER' | 'RECEIVER' | 'REPLY';

// ─── Public Portal ─────────────────────────────────────────────────────────────

/**
 * Angular Reactive Form value shape for the public contact section.
 * `queryType` is always present because MatButtonToggle pre-selects a default.
 */
export interface ContactFormValue {
  /** Selected query type — always present, defaulting to GENERAL. */
  queryType: QueryType;
  /** Visitor's full name. */
  name:      string;
  /** Visitor's email address. */
  email:     string;
  /** Optional enquiry subject. */
  subject:   string;
  /** Enquiry message body. */
  message:   string;
}

// ─── Admin Inbox — List ────────────────────────────────────────────────────────

/** Pagination metadata returned by list API responses. */
export interface PaginationMeta {
  /** Total number of records matching the query. */
  total:       number;
  /** Total number of pages at the current page size. */
  pages:       number;
  /** Current page index (1-based). */
  currentPage: number;
  /** Maximum records returned per page. */
  limit:       number;
}

/**
 * Single row in the admin inbox message list.
 * Message body is intentionally excluded (full body is in the detail response).
 */
export interface ContactMessageListItem {
  /** MongoDB document ID. */
  id:         string;
  /** Visitor's name. */
  name:       string;
  /** Visitor's email address. */
  email:      string;
  /** Optional enquiry subject. */
  subject?:   string;
  /** Enquiry query type (Service or General). */
  queryType:  QueryType;
  /** Whether the admin has read this message. */
  isRead:     boolean;
  /** Number of admin replies sent for this message. */
  replyCount: number;
  /** ISO 8601 submission timestamp. */
  createdAt:  string;
}

/** Wrapped list API response from GET /api/admin/contact/messages. */
export interface ContactMessageListResponse {
  /** Always true on success. */
  success:    true;
  /** Array of message list rows. */
  data:       ContactMessageListItem[];
  /** Pagination metadata. */
  pagination: PaginationMeta;
}

/** Query parameters sent to GET /api/admin/contact/messages. */
export interface InboxListQueryParams {
  /** Page number (1-based). Defaults to 1. */
  page?:      number;
  /** Records per page. Defaults to 20. */
  limit?:     number;
  /** Filter by query type. Omit to show all. */
  queryType?: QueryType;
  /** Filter by read status. Omit to show all. */
  isRead?:    boolean;
}

/**
 * Active filter state maintained in InboxListComponent.
 * `null` means "show all" for that dimension.
 */
export interface InboxFilterState {
  /** Active query type filter, or null to show all. */
  queryType: QueryType | null;
  /** Active read-status filter, or null to show all. */
  isRead:    boolean | null;
  /** Current page (1-based). */
  page:      number;
  /** Records per page. */
  limit:     number;
}

// ─── Admin Inbox — Detail ──────────────────────────────────────────────────────

/** A single admin reply stored within a contact message's replies array. */
export interface ContactReplyItem {
  /** MongoDB document ID. */
  id:       string;
  /** Optional reply subject. */
  subject?: string;
  /** Reply body text. */
  body:     string;
  /** ISO 8601 sent timestamp. */
  sentAt:   string;
  /** ID of the admin user who sent the reply. */
  sentBy:   string;
}

/** Full message detail — response payload from GET /api/admin/contact/messages/:id. */
export interface ContactMessageDetail {
  /** MongoDB document ID. */
  id:         string;
  /** Visitor's name. */
  name:       string;
  /** Visitor's email address. */
  email:      string;
  /** Optional enquiry subject. */
  subject?:   string;
  /** Full enquiry message body. */
  message:    string;
  /** Enquiry query type. */
  queryType:  QueryType;
  /** Whether the admin has read this message. */
  isRead:     boolean;
  /** Visitor's IP address, if captured. */
  ipAddress?: string;
  /** Visitor's user agent string, if captured. */
  userAgent?: string;
  /** All admin replies in chronological order. */
  replies:    ContactReplyItem[];
  /** ISO 8601 submission timestamp. */
  createdAt:  string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt:  string;
}

/** Wrapped detail API response from GET /api/admin/contact/messages/:id. */
export interface ContactMessageDetailResponse {
  /** Always true on success. */
  success: true;
  /** Full message detail payload. */
  data:    ContactMessageDetail;
}

// ─── Admin Inbox — Stats ───────────────────────────────────────────────────────

/** Stats bar data from GET /api/admin/contact/messages/stats. */
export interface ContactMessageStats {
  /** Total number of contact messages. */
  total:          number;
  /** Number of unread messages. */
  unread:         number;
  /** Number of SERVICE_INQUIRY messages. */
  serviceQueries: number;
  /** Number of GENERAL_INQUIRY messages. */
  generalQueries: number;
}

/** Wrapped stats API response. */
export interface ContactMessageStatsResponse {
  /** Always true on success. */
  success: true;
  /** Stats payload. */
  data:    ContactMessageStats;
}

// ─── Admin Inbox — Mark Read ───────────────────────────────────────────────────

/** Body sent to PATCH /api/admin/contact/messages/:id/read. */
export interface MarkReadDTO {
  /** Desired read state. */
  isRead: boolean;
}

/** Wrapped mark-read API response. */
export interface MarkReadResponse {
  /** Always true on success. */
  success: true;
  /** Updated message detail. */
  data:    ContactMessageDetail;
}

// ─── Admin Inbox — Delete ──────────────────────────────────────────────────────

/** Wrapped delete API response. */
export interface DeleteMessageResponse {
  /** Always true on success. */
  success: true;
  /** Human-readable confirmation message. */
  message: string;
}

// ─── Admin Reply — Compose ─────────────────────────────────────────────────────

/**
 * Data injected into ReplyComposeComponent via MAT_DIALOG_DATA.
 * Provides all context needed to pre-fill and send the reply.
 */
export interface ReplyComposeDialogData {
  /** ID of the parent contact message. */
  messageId:        string;
  /** Original message subject, used to pre-fill "Re: {subject}". */
  originalSubject?: string;
  /** Recipient email address shown as read-only "To:" label. */
  recipientEmail:   string;
  /** Query type shown as an informational chip in the compose dialog. */
  queryType:        QueryType;
}

/** Angular Reactive Form value shape for the reply compose dialog. */
export interface ReplyFormValue {
  /** Pre-filled reply subject (editable). */
  subject: string;
  /** Required reply body (plain text). */
  body:    string;
}

/** DTO sent to POST /api/admin/contact/messages/:id/reply. */
export interface SendReplyDTO {
  /** Reply subject. Defaults to "Re: Your enquiry" if omitted. */
  subject?: string;
  /** Reply body text. Required. */
  body:     string;
}

/** Wrapped send-reply API response. */
export interface SendReplyResponse {
  /** Always true on success. */
  success: true;
  /** Human-readable confirmation message. */
  message: string;
  /** The newly created reply record. */
  data:    ContactReplyItem;
}

// ─── Email Templates ───────────────────────────────────────────────────────────

/** Single template descriptor from GET /api/admin/email-templates. */
export interface EmailTemplateDescriptor {
  /** Template identifier enum value. */
  name:          EmailTemplate;
  /** Query type this template is associated with. */
  queryType:     QueryType;
  /** Who receives this template (visitor, owner, or reply). */
  recipientRole: RecipientRole;
  /** Human-readable description shown in the template list. */
  description:   string;
}

/** Wrapped template list API response. */
export interface ListEmailTemplatesResponse {
  /** Always true on success. */
  success: true;
  /** All configured email template descriptors. */
  data:    EmailTemplateDescriptor[];
}

/**
 * Editable variable inputs for the template preview panel.
 * All fields are optional — the component pre-fills sensible sample defaults.
 */
export interface TemplatePreviewVariables {
  /** Visitor's full name. */
  visitorName?:    string;
  /** Visitor's email address. */
  visitorEmail?:   string;
  /** Enquiry subject. */
  subject?:        string;
  /** Full enquiry message body. */
  messageBody?:    string;
  /** Short summary of the enquiry. */
  messageSummary?: string;
  /** Human-readable query type label (e.g. "Service Inquiry"). */
  queryTypeLabel?: string;
  /** Admin reply body text. */
  replyBody?:      string;
  /** Portfolio owner's display name. */
  ownerName?:      string;
  /** Public portfolio URL. */
  portfolioUrl?:   string;
  /** Admin portal URL. */
  adminPortalUrl?: string;
  /** ISO 8601 submission timestamp string. */
  submittedAt?:    string;
  /** SLA reply time in hours shown in the visitor confirmation email. */
  replySlaHours?:  number;
}

/** Body sent to POST /api/admin/email-templates/:name/preview. */
export interface PreviewTemplateDTO {
  /** Variable values for template rendering. */
  variables: TemplatePreviewVariables;
}

/** Rendered template output from the preview API. */
export interface TemplatePreviewResult {
  /** Rendered HTML string. Use DomSanitizer before binding to [innerHTML]. */
  html: string;
  /** Rendered plain-text fallback. */
  text: string;
}

/** Wrapped template preview API response. */
export interface PreviewTemplateResponse {
  /** Always true on success. */
  success: true;
  /** Rendered template output. */
  data:    TemplatePreviewResult;
}

// ─── Shared State ─────────────────────────────────────────────────────────────

/**
 * State shape for ContactInboxStateService.
 * Holds the reactive unread count used by the nav badge.
 */
export interface ContactInboxState {
  /** Number of unread contact messages. */
  unreadCount: number;
}
