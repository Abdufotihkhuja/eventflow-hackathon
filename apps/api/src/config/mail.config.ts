import { registerAs } from '@nestjs/config';

export const mailConfig = registerAs('mail', () => ({
  host: process.env.MAIL_HOST || 'localhost',
  port: parseInt(process.env.MAIL_PORT || '1025', 10),
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
  from: process.env.MAIL_FROM || '"EventFlow" <noreply@eventflow.uz>',
  appUrl: process.env.FRONTEND_APP_URL || 'http://app.localhost',
  brand: {
    productName: process.env.MAIL_BRAND_NAME || 'EventFlow',
    siteUrl: process.env.MAIL_SITE_URL || 'https://eventflow.uz',
    supportEmail: process.env.MAIL_SUPPORT_EMAIL || 'support@eventflow.uz',
    replyTo:
      process.env.MAIL_REPLY_TO ||
      process.env.MAIL_SUPPORT_EMAIL ||
      'support@eventflow.uz',
    legalName: process.env.MAIL_LEGAL_NAME || 'EventFlow',
    postalAddress:
      process.env.MAIL_POSTAL_ADDRESS || 'Tashkent, Uzbekistan',
    // RFC 8058 one-click POST target (the API endpoint).
    unsubscribeApiUrl:
      process.env.MAIL_UNSUBSCRIBE_API_URL ||
      'https://api.eventflow.uz/api/v1/email/unsubscribe',
    // Human-facing confirmation page (web-public).
    unsubscribePageUrl:
      process.env.MAIL_UNSUBSCRIBE_PAGE_URL ||
      'https://eventflow.uz/unsubscribe',
    logoUrl:
      process.env.MAIL_LOGO_URL ||
      'https://eventflow.uz/assets/email-logo.png',
  },
  // HMAC secret for stateless unsubscribe tokens (falls back to JWT secret).
  unsubscribeSecret:
    process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || '',
}));
