import { registerAs } from '@nestjs/config';

export const linkedinConfig = registerAs('linkedin', () => ({
  clientId: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  callbackUrl:
    process.env.LINKEDIN_CALLBACK_URL ||
    'http://api.localhost/api/v1/auth/linkedin/callback',
  scope: ['openid', 'profile', 'email'],
}));
