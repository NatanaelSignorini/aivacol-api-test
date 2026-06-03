import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AUTH_MESSAGE } from '../../common/constants/message.constants';
import { passwordEncoder } from '../../common/decorators/password-encoder';
import { UsersService } from '../users/users.service';
import type { LoginResponseDto } from './dto/login-response.dto';
import type { LoginInput } from './dto/login.input';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { parseJwtDurationToSeconds } from './utils/parse-jwt-duration.util';

const TOKEN_TYPE = 'Bearer';
const REFRESH_TOKEN_EXPIRES_IN = '1d';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(input: LoginInput): Promise<LoginResponseDto> {
    const user = input.email
      ? await this.usersService.findByEmail(input.email)
      : await this.usersService.findByDocument(input.document!);

    if (!user) {
      throw new UnauthorizedException(AUTH_MESSAGE.INVALID_CREDENTIALS);
    }

    const passwordMatches = await passwordEncoder.verify(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(AUTH_MESSAGE.INVALID_CREDENTIALS);
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessExpiresIn =
      this.configService.get<string>('jwt.expiresIn') ?? '1h';
    const expiresIn = parseJwtDurationToSeconds(accessExpiresIn);
    const refreshExpiresIn = parseJwtDurationToSeconds(
      REFRESH_TOKEN_EXPIRES_IN,
    );

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: TOKEN_TYPE,
      expiresIn,
    };
  }
}
