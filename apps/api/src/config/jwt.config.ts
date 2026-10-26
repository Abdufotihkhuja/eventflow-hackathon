import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  accessTokenExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
