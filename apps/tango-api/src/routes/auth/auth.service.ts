import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtService } from '@nestjs/jwt';

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
  ) {}

  async register(dto: RegisterDto) {
    const { email, displayName, password } = dto;
    const exists = await this.prisma.users.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('Email ya registrado');

    const password_hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.users.create({
      data: { email, display_name: displayName, password_hash },
    });

    return this.issue(user);
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Credenciales invalidas');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Credenciales invalidas');

    return this.issue(user);
  }

  async getMe(userId: string) {
    return this.usersService.getMe(userId);
  }

  private async issue(user: { id: string; email: string; display_name: string }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, name: user.display_name };
    const access_token = this.jwt.sign(payload);
    const profile = await this.usersService.getMe(user.id);
    return {
      access_token,
      user: profile,
    };
  }
}
