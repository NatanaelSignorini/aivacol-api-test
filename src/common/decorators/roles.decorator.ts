import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../modules/users/enums/user-role.enum';

export const ROLES_KEY = 'roles';

/** Marca handler/classe com papéis exigidos; lido pelo RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
