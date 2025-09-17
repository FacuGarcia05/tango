import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

function cookieExtractor(req: Request): string | null {
  // Parse from Cookie header to avoid depending on cookie-parser
  const header = req.headers['cookie'];
  if (!header) return null;
  const cookies = header
    .split(';')
    .map((c) => c.trim())
    .map((c) => c.split('=')) as [string, string][];
  const found = cookies.find(([k]) => k === 'access_token');
  return found ? decodeURIComponent(found[1]) : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => cookieExtractor(req),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_SECRET') || 'dev-secret',
    });
  }

  async validate(payload: any) {
    return payload; // attach to req.user
  }
}

