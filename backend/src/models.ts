import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firebaseUid?: string; // Optional for email-only auth
  email: string;
  password?: string; // Optional password for non-OAuth login
  displayName?: string;
  name?: string; // Full name
  rollNo?: string; // Roll number
  branch?: string; // Branch/department
  avatar?: string;
  role?: 'student' | 'professor' | 'admin';
  organizationId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganization extends Document {
  name: string;
  slug: string;
  description: string;
  type: 'council' | 'club' | 'festival' | 'department' | 'other';
  logo?: string;
  coverImage?: string;
  isVerified: boolean;
  followerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEvent extends Document {
  title: string;
  description: string;
  organizationId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  dateTime: Date;
  endDateTime?: Date;
  venue: string;
  mode: 'online' | 'offline' | 'hybrid';
  tags: string[];
  audience: ('ug' | 'pg' | 'phd' | 'faculty' | 'staff' | 'all')[];
  media: {
    type: 'image' | 'video';
    url: string;
  }[];
  registrationLink?: string;
  upvoteCount: number;
  commentCount: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEventUpvote extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IEventComment extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICalendarSave extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  savedAt: Date;
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'event_comment' | 'event_like' | 'new_org_event' | 'event_reminder' | 'access_request';
  eventId?: mongoose.Types.ObjectId;
  fromUserId?: mongoose.Types.ObjectId;
  requestId?: mongoose.Types.ObjectId;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface IOrganizationMember extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: Date;
}

export interface IVerificationCode extends Document {
  email: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
}

export interface IOrganizationRequest extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  respondedAt?: Date;
}

// Schemas
const UserSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, unique: true, sparse: true }, // Optional for email-only auth
    email: { type: String, required: true, unique: true },
    password: String, // Optional password for password-based login
    displayName: String,
    name: String, // Full name
    rollNo: String, // Roll number
    branch: String, // Branch/department
    avatar: String,
    role: { type: String, enum: ['student', 'professor', 'admin'], default: 'student' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['council', 'club', 'festival', 'department', 'other'], required: true },
    logo: String,
    coverImage: String,
    isVerified: { type: Boolean, default: false },
    followerCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateTime: { type: Date, required: true },
    endDateTime: Date,
    venue: { type: String, required: true },
    mode: { type: String, enum: ['online', 'offline', 'hybrid'], required: true },
    tags: [String],
    audience: [{ type: String, enum: ['ug', 'pg', 'phd', 'faculty', 'staff', 'all'] }],
    media: [
      {
        type: { type: String, enum: ['image', 'video'] },
        url: { type: String, required: true },
      },
    ],
    registrationLink: String,
    upvoteCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const EventUpvoteSchema = new Schema<IEventUpvote>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

EventUpvoteSchema.index({ eventId: 1, userId: 1 }, { unique: true });

const EventCommentSchema = new Schema<IEventComment>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

EventCommentSchema.index({ eventId: 1 });
EventCommentSchema.index({ userId: 1 });

const CalendarSaveSchema = new Schema<ICalendarSave>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    savedAt: { type: Date, default: Date.now },
  }
);

CalendarSaveSchema.index({ eventId: 1, userId: 1 }, { unique: true });
CalendarSaveSchema.index({ userId: 1 });

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['event_comment', 'event_like', 'new_org_event', 'event_reminder', 'access_request'], required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    requestId: { type: Schema.Types.ObjectId, ref: 'OrganizationRequest' },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1 });

const OrganizationMemberSchema = new Schema<IOrganizationMember>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

OrganizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
OrganizationMemberSchema.index({ organizationId: 1 });

const VerificationCodeSchema = new Schema<IVerificationCode>(
  {
    email: { type: String, required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

VerificationCodeSchema.index({ email: 1 });
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OrganizationRequestSchema = new Schema<IOrganizationRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    respondedAt: Date,
  },
  { timestamps: true }
);

OrganizationRequestSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
OrganizationRequestSchema.index({ organizationId: 1 });
OrganizationRequestSchema.index({ status: 1 });

// Export Models
export const User = mongoose.model<IUser>('User', UserSchema);
export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
export const Event = mongoose.model<IEvent>('Event', EventSchema);
export const EventUpvote = mongoose.model<IEventUpvote>('EventUpvote', EventUpvoteSchema);
export const EventComment = mongoose.model<IEventComment>('EventComment', EventCommentSchema);
export const CalendarSave = mongoose.model<ICalendarSave>('CalendarSave', CalendarSaveSchema);
export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export const OrganizationMember = mongoose.model<IOrganizationMember>('OrganizationMember', OrganizationMemberSchema);
export const VerificationCode = mongoose.model<IVerificationCode>('VerificationCode', VerificationCodeSchema);
export const OrganizationRequest = mongoose.model<IOrganizationRequest>('OrganizationRequest', OrganizationRequestSchema);
