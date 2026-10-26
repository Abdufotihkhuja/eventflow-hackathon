import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-linkedin-oauth2';

export interface LinkedInProfile {
  email: string;
  name: string;
  providerId: string;
  picture?: string;
}

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('linkedin.clientId') || '',
      clientSecret: configService.get<string>('linkedin.clientSecret') || '',
      callbackURL:
        configService.get<string>('linkedin.callbackUrl') ||
        'http://api.localhost/api/v1/auth/linkedin/callback',
      scope: ['openid', 'profile', 'email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: LinkedInProfile) => void,
  ): void {
    const { id, emails, displayName, photos } = profile;

    const user: LinkedInProfile = {
      email: emails?.[0]?.value || '',
      name: displayName,
      providerId: id,
      picture: photos?.[0]?.value,
    };

    done(null, user);
  }
}
