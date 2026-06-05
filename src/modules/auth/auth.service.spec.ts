import { toUuidV7 } from '../../common/types/entity-id.type';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { passwordEncoder } from '../../common/decorators/password-encoder';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('../../common/decorators/password-encoder', () => ({
  passwordEncoder: {
    verify: jest.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  const mockUser = {
    id: toUuidV7('018f1234-5678-7890-abcd-ef1234567890'),
    nickname: 'aivacol',
    name: 'Aivacol Admin',
    email: 'admin@aivacol.com',
    passwordHash: '$2a$10$hashedpassword',
    role: UserRole.Admin,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: toUuidV7('018f1234-5678-7890-abcd-ef1234567890'),
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'jwt.expiresIn' ? '1h' : undefined,
            ),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('returns access token for valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      jest.mocked(passwordEncoder.verify).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('signed-access-token')
        .mockResolvedValueOnce('signed-refresh-token');

      const result = await service.login({
        email: 'admin@aivacol.com',
        password: 'Password1!',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'admin@aivacol.com',
      );
      expect(passwordEncoder.verify).toHaveBeenCalledWith(
        'Password1!',
        mockUser.passwordHash,
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        {
          sub: mockUser.id,
          email: mockUser.email,
          role: UserRole.Admin,
        },
        { expiresIn: 3600 },
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        {
          sub: mockUser.id,
          email: mockUser.email,
          role: UserRole.Admin,
        },
        { expiresIn: 86_400 },
      );
      expect(result).toEqual({
        accessToken: 'signed-access-token',
        refreshToken: 'signed-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    });

    it('rejects unknown email with 401', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'missing@aivacol.com',
          password: 'Password1!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(passwordEncoder.verify).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects wrong password with 401', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      jest.mocked(passwordEncoder.verify).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'admin@aivacol.com',
          password: 'Wrongpass1!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('returns success message', () => {
      expect(service.logout()).toEqual({ message: 'Logout successful' });
    });
  });
});
