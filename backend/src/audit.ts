import mongoose from 'mongoose';
import { AuditLog } from './models';

type AuditEntityType = 'event' | 'organization_member' | 'organization_request' | 'rsvp' | 'system';

type AuditParams = {
  actorUserId?: string | mongoose.Types.ObjectId;
  action: string;
  entityType: AuditEntityType;
  entityId?: string | mongoose.Types.ObjectId;
  organizationId?: string | mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
};

export async function logAudit(params: AuditParams) {
  try {
    await AuditLog.create({
      actorUserId: params.actorUserId ? new mongoose.Types.ObjectId(params.actorUserId) : undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ? new mongoose.Types.ObjectId(params.entityId) : undefined,
      organizationId: params.organizationId ? new mongoose.Types.ObjectId(params.organizationId) : undefined,
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
