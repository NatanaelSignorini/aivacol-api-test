import type { EntityId } from '../../../common/types/entity-id.type';
import type { UserRole } from '../../users/enums/user-role.enum';

export interface InteractionAuditRecord {
  occurredAt: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userId: EntityId | null;
  userEmail: string | null;
  userRole: UserRole | null;
}

export interface InteractionAuditDocument extends InteractionAuditRecord {
  _id?: unknown;
}
