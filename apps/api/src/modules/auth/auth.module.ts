import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { AuthService } from './auth.service';
import { LoginThrottleService } from './login-throttle.service';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { LinkedInOAuthGuard } from './guards/linkedin-oauth.guard';
import { JwtStrategy, GoogleStrategy, LinkedInStrategy } from './strategies';
import { VerificationModule } from '../verification/verification.module';
import { MailModule } from '../mail/mail.module';
import { IamModule } from '../iam/iam.module';
import { AccessMaskModule } from '../access-mask/access-mask.module';
import { MobileOAuthExchangeService } from './mobile-oauth-exchange.service';

@Module({
  imports: [
    PrismaModule,
    VerificationModule,
    MailModule,
    IamModule,
    AccessMaskModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    LoginThrottleService,
    MobileOAuthExchangeService,
    JwtStrategy,
    GoogleOAuthGuard,
    LinkedInOAuthGuard,
    // OAuth стратегии подключаются условно если установлены credentials
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleStrategy]
      : []),
    ...(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET
      ? [LinkedInStrategy]
      : []),
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
