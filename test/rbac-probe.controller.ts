import { Controller, Delete, Get } from '@nestjs/common';
import { CurrentUser } from '../src/common/decorators/current-user.decorator';
import { Roles } from '../src/common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../src/modules/auth/interfaces/jwt-payload.interface';
import { UserRole } from '../src/modules/users/enums/user-role.enum';

@Controller('rbac-probe')
export class RbacProbeController {
  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Roles(UserRole.Admin, UserRole.Operator)
  @Get('shared')
  sharedAccess(): { ok: true } {
    return { ok: true };
  }

  @Roles(UserRole.Admin)
  @Delete('admin-only')
  adminOnlyDelete(): { deleted: true } {
    return { deleted: true };
  }
}
