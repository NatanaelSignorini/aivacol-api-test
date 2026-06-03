import type { EntityId } from '../../../common/types/entity-id.type';
import type { UserRole } from '../../users/enums/user-role.enum';

export interface JwtPayload {
  sub: EntityId;
  email: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: EntityId;
  email: string;
  role: UserRole;
}
