import mongoose, { Schema, model, Document } from 'mongoose';
import { QueryType } from '../../../domain/enums/query-type.enum';

// ─── ContactReply sub-document ────────────────────────────────────────────────

/** A single admin reply persisted against its parent ContactMessage. */
export interface IContactReply {
  _id:      mongoose.Types.ObjectId;
  /** Optional reply subject — defaults to "Re: {original subject}" at service layer. */
  subject?: string;
  /** Reply body text (HTML-escaped at render time via Handlebars). */
  body:     string;
  /** Timestamp when the reply email was successfully sent and persisted. */
  sentAt:   Date;
  /** JWT `sub` of the admin user who sent the reply. */
  sentBy:   string;
}

const contactReplySchema = new Schema<IContactReply>(
  {
    subject: { type: String, trim: true, maxlength: 200 },
    body:    { type: String, required: true, trim: true, maxlength: 8000 },
    sentAt:  { type: Date, required: true, default: () => new Date() },
    sentBy:  { type: String, required: true },
  },
  { _id: true },
);

// ─── ContactMessage document ─────────────────────────────────────────────────

export interface IContactMessage extends Document {
  name:       string;
  email:      string;
  subject?:   string;
  message:    string;
  ipAddress?: string;
  userAgent?: string;
  createdAt:  Date;
  updatedAt:  Date;
  /** Visitor-selected inquiry classification; defaults to GENERAL (FR-001, FR-003). */
  queryType:  QueryType;
  /** Whether the admin has read this message; defaults to false (FR-022). */
  isRead:     boolean;
  /** Ordered list of admin replies sent against this message (FR-022, FR-031). */
  replies:    IContactReply[];
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    name:      { type: String, required: true, trim: true, maxlength: 120 },
    email:     { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    subject:   { type: String, trim: true, maxlength: 200 },
    message:   { type: String, required: true, trim: true, maxlength: 4000 },
    ipAddress: { type: String },
    userAgent: { type: String },
    // Feature 006 additions
    queryType: { type: String, enum: Object.values(QueryType), default: QueryType.GENERAL },
    isRead:    { type: Boolean, default: false },
    replies:   { type: [contactReplySchema], default: [] },
  },
  { timestamps: true },
);

// Existing indexes (unchanged)
contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ email: 1, createdAt: -1 });

// New compound indexes for admin inbox filtering (SC-008)
contactMessageSchema.index({ queryType: 1, createdAt: -1 });
contactMessageSchema.index({ isRead: 1,    createdAt: -1 });

export const ContactMessage = model<IContactMessage>('ContactMessage', contactMessageSchema);
