import { registerAs } from '@nestjs/config';

export const googleConfig = registerAs('google', () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    'http://api.localhost/api/v1/auth/google/callback',
}));
