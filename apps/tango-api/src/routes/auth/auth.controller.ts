import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import type { JwtPayload } from './auth.service';
import { LoginDto, RegisterDto, ResendVerificationDto } from './dto';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar usuario (requiere verificacion por email)',
  })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'alice@example.com' },
        displayName: { type: 'string', example: 'Alice' },
        password: { type: 'string', example: 'secret123' },
      },
    },
  })
  async register(@Body() dto: RegisterDto) {
    await this.service.register(dto);
    return {
      message: 'Registro exitoso. Revisa tu email para verificar la cuenta.',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login con email y password (requiere email verificado)',
  })
  @ApiBody({
    schema: {
      properties: { email: { type: 'string' }, password: { type: 'string' } },
    },
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user } = await this.service.login(dto);
    this.setAuthCookie(res, access_token);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProd(),
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  async me(@CurrentUser() user: JwtPayload) {
    return this.service.getMe(user.sub);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar email de verificacion' })
  async resendVerification(@Body() body: ResendVerificationDto) {
    await this.service.resendVerification(body.email);
    return {
      message: 'Si el email existe, reenviamos el enlace de verificacion.',
    };
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verificar email mediante token' })
  async verifyEmail(@Req() req: Request, @Res() res: Response) {
    const token = req.query.token as string | undefined;
    if (!token) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'Token requerido' });
    }

    await this.service.verifyEmail(token);
    const redirectUrl = new URL(
      this.config.get<string>('FRONTEND_BASE_URL') ?? 'http://localhost:3000',
    );
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('verified', '1');
    return res.redirect(redirectUrl.toString());
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Redirige a Google para autenticacion OAuth' })
  async googleAuth() {
    return HttpStatus.OK;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback de Google OAuth' })
  async googleCallback(
    @Req() req: Request & { user?: { access_token: string } },
    @Res() res: Response,
  ) {
    const result = req.user;
    const frontendBase =
      this.config.get<string>('FRONTEND_BASE_URL') ?? 'http://localhost:3000';

    if (!result) {
      return res.redirect(`${frontendBase}/login?error=google`);
    }

    this.setAuthCookie(res, result.access_token);
    return res.redirect(frontendBase);
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
