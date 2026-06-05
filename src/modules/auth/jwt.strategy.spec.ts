import { toUuidV7 } from '../../common/types/entity-id.type';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { UserRole } from '../users/enums/user-role.enum';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'jwt.secret'
                ? 'test-jwt-secret-key-for-testing-only-32-chars'
                : undefined,
            ),
          },
        },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  describe('validate', () => {
    it('maps payload to AuthenticatedUser with role', () => {
      const result = strategy.validate({
        sub: toUuidV7('018f1234-5678-7890-abcd-ef1234567890'),
        email: 'admin@aivacol.com',
        role: UserRole.Admin,
      });

      expect(result).toEqual({
        id: toUuidV7('018f1234-5678-7890-abcd-ef1234567890'),
        email: 'admin@aivacol.com',
        role: UserRole.Admin,
      });
    });

    it('rejects incomplete payload', () => {
      expect(() =>
        strategy.validate({
          sub: toUuidV7('018f1234-5678-7890-abcd-ef1234567890'),
          email: 'admin@aivacol.com',
          role: undefined as unknown as UserRole,
        }),
      ).toThrow(UnauthorizedException);
    });
  });
});
