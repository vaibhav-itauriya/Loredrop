import { OrganizationMember } from './models';
import mongoose from 'mongoose';

export type OrgAction =
  | 'create_event'
  | 'edit_event'
  | 'manage_organization'
  | 'manage_requests'
  | 'manage_admins'
  | 'view_rsvp'
  | 'check_in'
  | 'manage_tasks'
  | 'view_analytics'
  | 'manage_chat';

const ACTION_ROLES: Record<OrgAction, Array<'owner' | 'admin' | 'moderator' | 'member'>> = {
  create_event: ['owner', 'admin', 'moderator', 'member'],
  edit_event: ['owner', 'admin', 'moderator'],
  manage_organization: ['owner', 'admin', 'moderator', 'member'],
  manage_requests: ['owner', 'admin'],
  manage_admins: ['owner'],
  view_rsvp: ['owner', 'admin', 'moderator'],
  check_in: ['owner', 'admin', 'moderator'],
  manage_tasks: ['owner', 'admin', 'moderator', 'member'],
  view_analytics: ['owner', 'admin', 'moderator'],
  manage_chat: ['owner', 'admin', 'moderator', 'member'],
};

export async function canOrgAction(
  userId: string,
  organizationId: mongoose.Types.ObjectId | string,
  action: OrgAction,
) {
  const membership = await OrganizationMember.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).select('role');

  if (!membership) {
    return { allowed: false, role: null as null | string };
  }

  const role = (membership as any).role as 'owner' | 'admin' | 'moderator' | 'member';
  return { allowed: ACTION_ROLES[action].includes(role), role };
}
