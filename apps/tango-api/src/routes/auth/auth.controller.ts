import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtService } from '@nestjs/jwt';
//a
@Controller('auth')
export class AuthController {
  constructor(private service: AuthService, private jwt: JwtService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.service.register(dto);   
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);      
  }

  @Get('me')
  me(@Headers('authorization') auth?: string) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Falta token');
    const token = auth.slice(7);
    const payload = this.jwt.verify(token, { secret: 'supersecret' });
    return { user: payload };
  }
}
