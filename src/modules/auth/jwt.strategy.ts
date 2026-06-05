import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type {
  AuthenticatedUser,
  JwtPayload,
} from './interfaces/jwt-payload.interface';
import { toUuidV7 } from '../../common/types/entity-id.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Valida payload JWT e monta usuário autenticado anexado ao request.
   * Exige `sub`, `email` e `role`; lança 401 se payload incompleto.
   */
  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: toUuidV7(payload.sub),
      email: payload.email,
      role: payload.role,
    };
  }
}
