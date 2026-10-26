/**
 * TEMPORARY production email smoke test.
 *
 * Sends EXACTLY 3 synthetic transactional emails through the real configured
 * SMTP transport + the real email renderer — without touching business data,
 * the BullMQ queue, or the idempotency store.
 *
 * Safety:
 *  - TEST_EMAIL is required and must be a valid address.
 *  - Refuses to send to an address that belongs to a real User
 *    (override with EMAIL_SMOKE_ALLOW_KNOWN=yes only if you own that mailbox).
 *  - Dry-run by default. Actually sends ONLY with EMAIL_SMOKE_CONFIRM=send.
 *  - Never prints credentials, tokens, codes or full recipient address.
 *
 * Run (inside the api container, after the image is rebuilt with this file):
 *   TEST_EMAIL="x@mail-tester.com" npm run email:smoke:prod              # dry-run
 *   TEST_EMAIL="x@mail-tester.com" EMAIL_SMOKE_CONFIRM=send npm run email:smoke:prod
 *   SMOKE_ONLY=email-verification-code TEST_EMAIL="x@srv1.mail-tester.com" \
 *     EMAIL_SMOKE_CONFIRM=send npm run email:smoke:prod                  # one template
 *
 * This file is disposable — see docs/email-deliverability.md "Removing the
 * smoke test" for cleanup.
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MailerModule, MailerService } from '@nestjs-modules/mailer';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { mailConfig } from '../config/mail.config';
import {
  renderEmail,
  DEFAULT_BRAND,
  type BrandConfig,
} from '../modules/mail/email/render';
import { UnsubscribeTokenService } from '../modules/email-unsubscribe/unsubscribe-token.service';

// Intentionally does NOT import MailModule (it pulls PrismaModule/QueueModule
// which depend on app-global providers not present in this tiny context).
// We wire the same MailerModule transport directly and use a standalone
// PrismaClient for the read-only recipient guard.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [mailConfig] }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('mail.host'),
          port: configService.get<number>('mail.port'),
          secure: configService.get<boolean>('mail.secure'),
          auth: {
            user: configService.get<string>('mail.auth.user'),
            pass: configService.get<string>('mail.auth.pass'),
          },
        },
        defaults: {
          from: configService.get<string>('mail.from'),
        },
      }),
    }),
  ],
  providers: [UnsubscribeTokenService],
})
class EmailSmokeModule {}

interface SmokeCase {
  template: string;
  context: Record<string, unknown>;
}

function buildCases(testEmail: string): SmokeCase[] {
  // Context keys match exactly what each template builder consumes.
  // All values are synthetic; nothing is persisted.
  return [
    {
      template: 'email-verification-code',
      context: {
        locale: 'ru',
        firstName: 'Eventflow Test',
        code: '123456',
      },
    },
    {
      template: 'member-invitation',
      context: {
        locale: 'ru',
        firstName: 'Eventflow',
        lastName: 'Test',
        email: testEmail,
        organizationName: 'Eventflow Production Smoke',
        activationUrl:
          'https://app.eventflow.uz/invite/activate?token=SMOKE-TEST-DO-NOT-USE',
      },
    },
    {
      template: 'registration-created',
      context: {
        locale: 'ru',
        userName: 'Test Recipient',
        eventTitle: 'Eventflow Production Email Smoke Test',
        organizationName: 'Eventflow Production Smoke',
        ticketNumber: 'SMOKE-TEST-0001',
        ticketUrl:
          'https://eventflow.uz/tickets/SMOKE-TEST-0001?smoke=1',
        isPending: false,
      },
    },
  ];
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}

function fail(message: string): never {
   
  console.error(`\n[email:smoke] ABORTED — ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const testEmail = (process.env.TEST_EMAIL || '').trim();
  const confirm = (process.env.EMAIL_SMOKE_CONFIRM || '').trim();
  const only = (process.env.SMOKE_ONLY || '').trim();
  const allowKnown =
    (process.env.EMAIL_SMOKE_ALLOW_KNOWN || '').trim().toLowerCase() === 'yes';

  if (!testEmail) {
    fail('TEST_EMAIL is required (e.g. an address from mail-tester.com).');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testEmail)) {
    fail('TEST_EMAIL is not a valid email address.');
  }

  const app = await NestFactory.createApplicationContext(EmailSmokeModule, {
    logger: ['error', 'warn'],
  });

  // Prisma 7 here uses the @prisma/adapter-pg driver adapter, so the client
  // MUST be constructed with an adapter. If DATABASE_URL is absent or the
  // client can't be built, we skip the (best-effort) recipient guard rather
  // than crash — the other safety gates still apply.
  let prisma: PrismaClient | null = null;
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl }),
      });
    } catch {
      prisma = null;
    }
  }

  try {
    const config = app.get(ConfigService);
    const mailer = app.get(MailerService);
    const tokens = app.get(UnsubscribeTokenService);

    const from = config.get<string>('mail.from') || '';
    const host = config.get<string>('mail.host') || '';
    const brand =
      config.get<BrandConfig>('mail.brand') ?? DEFAULT_BRAND;

    if (!from || !host) {
      fail('MAIL_FROM / MAIL_HOST are not configured in this environment.');
    }
    if (host === 'localhost' || /eventflow\.local/.test(from)) {
      fail(
        'Mail transport looks like a non-production placeholder ' +
          `(host="${host}"). Refusing to run a "prod" smoke test.`,
      );
    }

    // Guard: do not email a real user by accident (best-effort).
    let knownUser = false;
    if (prisma) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: testEmail },
          select: { id: true },
        });
        knownUser = Boolean(user);
      } catch {
        console.warn(
          '[email:smoke] WARN — could not verify recipient against User table.',
        );
      }
    } else {
      console.warn(
        '[email:smoke] WARN — DATABASE_URL unavailable; skipping recipient guard.',
      );
    }
    if (knownUser && !allowKnown) {
      fail(
        `${maskEmail(testEmail)} belongs to an existing user. ` +
          'Use a dedicated test mailbox, or set EMAIL_SMOKE_ALLOW_KNOWN=yes ' +
          'only if you personally own this address.',
      );
    }

    let cases = buildCases(testEmail);
    if (only) {
      cases = cases.filter((c) => c.template === only);
      if (cases.length === 0) {
        fail(
          `SMOKE_ONLY="${only}" did not match any of: ` +
            buildCases(testEmail)
              .map((c) => c.template)
              .join(', '),
        );
      }
    }

    const willSend = confirm === 'send';

     
    console.log('\n=== Eventflow production email smoke test ===');
     
    console.log(`recipient    : ${maskEmail(testEmail)}`);
     
    console.log(`from         : ${from}`);
     
    console.log(`reply-to     : ${brand.replyTo}`);
     
    console.log(`smtp host    : ${host}`);
     
    console.log(`known user   : ${knownUser ? 'YES (override)' : 'no'}`);
     
    console.log(
      `mode         : ${willSend ? 'SEND' : 'DRY-RUN (set EMAIL_SMOKE_CONFIRM=send to send)'}`,
    );
     
    console.log('templates    :');

    // Same per-recipient signed token / URLs the real dispatch builds, so
    // mail-tester sees a valid one-click List-Unsubscribe.
    const token = tokens.sign(testEmail, 'notification');
    const oneClickUrl = `${brand.unsubscribeApiUrl}${
      brand.unsubscribeApiUrl.includes('?') ? '&' : '?'
    }token=${encodeURIComponent(token)}`;
    const pageUrl = `${brand.unsubscribePageUrl}${
      brand.unsubscribePageUrl.includes('?') ? '&' : '?'
    }token=${encodeURIComponent(token)}`;

    const previews = cases.map((c) => {
      const r = renderEmail(c.template, c.context, brand, undefined, pageUrl);
      return { template: c.template, rendered: r };
    });
    for (const p of previews) {
       
      console.log(
        `  - ${p.template.padEnd(26)} [${p.rendered.category}] subject="${p.rendered.subject}"`,
      );
    }

    if (!willSend) {
       
      console.log(
        '\nDry-run only. No email was sent. Re-run with EMAIL_SMOKE_CONFIRM=send.\n',
      );
      return;
    }

     
    console.log('\n--- sending ---');
    let failures = 0;
    for (const p of previews) {
      const headers: Record<string, string> = {
        'List-Unsubscribe': `<${oneClickUrl}>, <mailto:${brand.supportEmail}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      };
      try {
        const info: { messageId?: string; accepted?: unknown[]; rejected?: unknown[] } =
          await mailer.sendMail({
            to: testEmail,
            subject: p.rendered.subject,
            html: p.rendered.html,
            text: p.rendered.text,
            replyTo: brand.replyTo,
            headers,
          });
         
        console.log(
          `  OK   ${p.template.padEnd(26)} -> @${testEmail.split('@')[1]} ` +
            `messageId=${info.messageId ?? 'n/a'} ` +
            `accepted=${(info.accepted ?? []).length} rejected=${(info.rejected ?? []).length}`,
        );
      } catch (err) {
        failures++;
        const msg = err instanceof Error ? err.message : 'unknown error';
         
        console.error(`  FAIL ${p.template.padEnd(26)} -> ${msg}`);
      }
    }

     
    console.log(
      `\nDone. ${previews.length - failures}/${previews.length} sent, ${failures} failed.\n`,
    );
    if (failures > 0) process.exitCode = 1;
  } finally {
    if (prisma) await prisma.$disconnect().catch(() => undefined);
    await app.close();
  }
}

void main();
