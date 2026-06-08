import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const data = request?.cookies['access_token'];
          if (!data) {
            return null;
          }
          return data;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'super-secret-key-change-me-in-prod',
    });
  }

  async validate(payload: any) {
    // Payload from JWT token
    return {
      userId: payload.sub,
      userName: payload.userName,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
