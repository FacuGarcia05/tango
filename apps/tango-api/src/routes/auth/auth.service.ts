import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import type { Profile } from 'passport-google-oauth20';

import { EmailService } from '../../common/email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, displayName, password } = dto;
    const exists = await this.prisma.users.findUnique({ where: { email } });
    if (exists) {
      throw new BadRequestException('Email ya registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.users.create({
      data: {
        email,
        display_name: displayName,
        password_hash: passwordHash,
        provider: 'local',
      },
    });

    await this.sendEmailVerification(user.id, user.email);
  }

  async resendVerification(email: string) {
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user || user.email_verified_at) {
      return;
    }

    await this.sendEmailVerification(user.id, user.email);
  }

  async verifyEmail(token: string) {
    const secret = this.config.get<string>('EMAIL_TOKEN_SECRET');
    if (!secret) {
      throw new BadRequestException('Email verification no configurado');
    }

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
      }>(token, { secret });
      const user = await this.prisma.users.findUnique({
        where: { id: payload.sub },
      });
      if (!user || user.email !== payload.email) {
        throw new BadRequestException('Token invalido');
      }

      if (!user.email_verified_at) {
        await this.prisma.users.update({
          where: { id: user.id },
          data: { email_verified_at: new Date() },
        });
      }

      return true;
    } catch (error) {
      throw new BadRequestException('Token invalido o expirado');
    }
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (user.provider === 'google' && !user.password_hash) {
      throw new ForbiddenException('Inicia sesion con Google para continuar');
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (!user.email_verified_at) {
      throw new ForbiddenException('Debes verificar tu email');
    }

    return this.issue(user);
  }

  async handleGoogleLogin(profile: Profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('La cuenta de Google no informa email');
    }

    const displayName =
      profile.displayName ||
      `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`.trim() ||
      email;

    let user = await this.prisma.users.findFirst({
      where: { provider: 'google', provider_id: profile.id },
    });

    if (!user) {
      user = await this.prisma.users.findUnique({ where: { email } });
      if (user) {
        user = await this.prisma.users.update({
          where: { id: user.id },
          data: {
            provider: 'google',
            provider_id: profile.id,
            email_verified_at: user.email_verified_at ?? new Date(),
          },
        });
      }
    }

    if (!user) {
      const passwordHash = await bcrypt.hash(
        randomBytes(32).toString('hex'),
        10,
      );
      user = await this.prisma.users.create({
        data: {
          email,
          display_name: displayName,
          password_hash: passwordHash,
          provider: 'google',
          provider_id: profile.id,
          email_verified_at: new Date(),
        },
      });
    }

    return this.issue(user);
  }

  async getMe(userId: string) {
    return this.usersService.getMe(userId);
  }

  private async issue(user: {
    id: string;
    email: string;
    display_name: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.display_name,
    };
    const access_token = this.jwt.sign(payload);
    const profile = await this.usersService.getMe(user.id);
    return { access_token, user: profile };
  }

  private async sendEmailVerification(userId: string, email: string) {
    const secret = this.config.get<string>('EMAIL_TOKEN_SECRET');
    if (!secret) {
      throw new BadRequestException('Email verification no configurado');
    }

    const appBaseUrl =
      this.config.get<string>('APP_BASE_URL') ?? 'http://localhost:3001';
    const token = await this.jwt.signAsync(
      { sub: userId, email },
      { secret, expiresIn: '24h' },
    );
    const link = `${appBaseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

    await this.emailService.sendVerificationEmail(email, link);
  }
}
