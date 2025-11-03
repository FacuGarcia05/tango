import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL =
      config.get<string>('GOOGLE_CALLBACK_URL') ??
      'http://localhost:3001/auth/google/callback';

    const enabled = Boolean(clientID && clientSecret);
    super({
      clientID: clientID || 'placeholder',
      clientSecret: clientSecret || 'placeholder',
      callbackURL,
      scope: ['profile', 'email'],
    });
    this.isEnabled = enabled;

    if (!enabled) {
      this.logger.warn(
        'Google OAuth strategy disabled. Missing GOOGLE_CLIENT_ID/SECRET env vars.',
      );
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: unknown, user?: unknown) => void,
  ) {
    if (!this.isEnabled) {
      return done(new Error('Google OAuth no configurado'));
    }

    try {
      const result = await this.authService.handleGoogleLogin(profile);
      done(null, result);
    } catch (error) {
      done(error, false);
    }
  }
}
