import 'reflect-metadata';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles decorator', () => {
  it('exports metadata key', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('sets allowed roles on route handler', () => {
    class TestController {
      @Roles(UserRole.Admin, UserRole.Operator)
      list(): void {}
    }

    expect(Reflect.getMetadata(ROLES_KEY, TestController.prototype.list)).toEqual(
      [UserRole.Admin, UserRole.Operator],
    );
  });

  it('accepts a single role', () => {
    class TestController {
      @Roles(UserRole.Admin)
      create(): void {}
    }

    expect(Reflect.getMetadata(ROLES_KEY, TestController.prototype.create)).toEqual(
      [UserRole.Admin],
    );
  });
});
