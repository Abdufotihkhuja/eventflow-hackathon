import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface GoogleProfile {
  email: string;
  name: string;
  providerId: string;
  picture?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('google.clientId') || '',
      clientSecret: configService.get<string>('google.clientSecret') || '',
      callbackURL:
        configService.get<string>('google.callbackUrl') ||
        'http://api.localhost/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { id, emails, displayName, photos } = profile;

    const user: GoogleProfile = {
      email: emails?.[0]?.value || '',
      name: displayName,
      providerId: id,
      picture: photos?.[0]?.value,
    };

    done(null, user);
  }
}
