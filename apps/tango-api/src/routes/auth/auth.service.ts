import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto, LoginDto } from './dto';
//a
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

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
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(password, (user as any).password_hash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    return this.issue(user);
  }

  private issue(user: any) {
    const payload = { sub: user.id, email: user.email, name: user.display_name };
    return { access_token: this.jwt.sign(payload, { secret: 'supersecret', expiresIn: '7d' }) };
  }
}
