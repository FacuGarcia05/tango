import { Body, Controller, Get, Post, UseGuards, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import type { JwtPayload } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Post('register')
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'alice@example.com' },
        displayName: { type: 'string', example: 'Alice' },
        password: { type: 'string', example: 'secret123' },
      },
    },
  })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { access_token, user } = await this.service.register(dto);
    this.setAuthCookie(res, access_token);
    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ schema: { properties: { email: { type: 'string' }, password: { type: 'string' } } } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { access_token, user } = await this.service.login(dto);
    this.setAuthCookie(res, access_token);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax', secure: this.isProd() });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  async me(@CurrentUser() user: JwtPayload) {
    return this.service.getMe(user.sub);
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProd(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private isProd() {
    return process.env.NODE_ENV === 'production';
  }
}