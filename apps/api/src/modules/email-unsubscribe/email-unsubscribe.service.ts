import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UnsubscribeTokenService,
  type UnsubscribeCategory,
} from './unsubscribe-token.service';

export type UnsubscribeResult =
  | { status: 'unsubscribed'; email: string; category: UnsubscribeCategory }
  | { status: 'already'; email: string; category: UnsubscribeCategory }
  | { status: 'invalid_token' };

export type UnsubscribeStatus =
  | {
      valid: true;
      email: string;
      category: UnsubscribeCategory;
      unsubscribed: boolean;
    }
  | { valid: false };

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

@Injectable()
export class EmailUnsubscribeService {
  private readonly logger = new Logger(EmailUnsubscribeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: UnsubscribeTokenService,
  ) {}

  /** True if this recipient opted out of the given category. */
  async isSuppressed(
    email: string,
    category: UnsubscribeCategory,
  ): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const row = await this.prisma.emailUnsubscribe.findUnique({
      where: { email_category: { email: normalized, category } },
      select: { id: true },
    });
    return row !== null;
  }

  /** Idempotent opt-out from a verified token (one-click safe). */
  async unsubscribeByToken(token: string): Promise<UnsubscribeResult> {
    const verified = this.tokens.verify(token);
    if (!verified.ok) {
      this.logger.warn(
        `Unsubscribe rejected: ${verified.reason} token`,
      );
      return { status: 'invalid_token' };
    }

    const email = verified.email.trim().toLowerCase();
    const { category } = verified;

    const existing = await this.prisma.emailUnsubscribe.findUnique({
      where: { email_category: { email, category } },
      select: { id: true },
    });
    if (existing) {
      return { status: 'already', email, category };
    }

    await this.prisma.emailUnsubscribe.create({
      data: { email, category },
    });
    this.logger.log(
      `Unsubscribed ${maskEmail(email)} from ${category}`,
    );
    return { status: 'unsubscribed', email, category };
  }

  /** Read-only status for the confirmation page. */
  async statusByToken(token: string): Promise<UnsubscribeStatus> {
    const verified = this.tokens.verify(token);
    if (!verified.ok) {
      return { valid: false };
    }
    const email = verified.email.trim().toLowerCase();
    const { category } = verified;
    const row = await this.prisma.emailUnsubscribe.findUnique({
      where: { email_category: { email, category } },
      select: { id: true },
    });
    return {
      valid: true,
      email,
      category,
      unsubscribed: row !== null,
    };
  }
}
