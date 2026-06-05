import { toUuidV7 } from '../../../common/types/entity-id.type';
import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  const adminUser: AuthenticatedUser = {
    id: toUuidV7('018f1234-5678-7890-abcd-ef1234567890'),
    email: 'admin@aivacol.com',
    role: UserRole.Admin,
  };

  const operatorUser: AuthenticatedUser = {
    id: toUuidV7('018f1234-5678-7890-abcd-ef1234567891'),
    email: 'operator@aivacol.com',
    role: UserRole.Operator,
  };

  const createContext = (user?: AuthenticatedUser): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return false;
      }

      if (key === ROLES_KEY) {
        return undefined;
      }

      return undefined;
    });

    expect(guard.canActivate(createContext(adminUser))).toBe(true);
  });

  it('allows access when user role matches required roles', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return false;
      }

      if (key === ROLES_KEY) {
        return [UserRole.Admin];
      }

      return undefined;
    });

    expect(guard.canActivate(createContext(adminUser))).toBe(true);
  });

  it('rejects non-matching role with ForbiddenException', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return false;
      }

      if (key === ROLES_KEY) {
        return [UserRole.Admin];
      }

      return undefined;
    });

    expect(() => guard.canActivate(createContext(operatorUser))).toThrow(
      ForbiddenException,
    );
  });

  it('skips role checks on public routes', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return true;
      }

      if (key === ROLES_KEY) {
        return [UserRole.Admin];
      }

      return undefined;
    });

    expect(guard.canActivate(createContext(undefined))).toBe(true);
  });

  it('rejects when user is missing on protected role route', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return false;
      }

      if (key === ROLES_KEY) {
        return [UserRole.Admin];
      }

      return undefined;
    });

    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('does not throw UnauthorizedException for role mismatch', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return false;
      }

      if (key === ROLES_KEY) {
        return [UserRole.Admin];
      }

      return undefined;
    });

    try {
      guard.canActivate(createContext(operatorUser));
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error).not.toBeInstanceOf(UnauthorizedException);
    }
  });
});
