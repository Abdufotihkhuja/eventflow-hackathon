import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SUFFIX_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 5;
const PRISMA_UNIQUE_VIOLATION = 'P2002';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

@Injectable()
export class TicketNumberService {
  private readonly logger = new Logger(TicketNumberService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a human-readable ticket number: `EVF-YYMMDD-XXXXXX`.
   * Suffix: 6 chars from Crockford base32 (no I/L/O/U) for unambiguous reading at the venue.
   *
   * Pure function — no DB access. Use {@link ensureTicketNumber} when persisting.
   */
  generateTicketNumber(date: Date = new Date()): string {
    const yy = String(date.getUTCFullYear() % 100).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const suffix = this.randomCrockfordBase32(SUFFIX_LENGTH);
    return `EVF-${yy}${mm}${dd}-${suffix}`;
  }

  /**
   * Idempotent: if registration already has `ticketNumber` — returns it.
   * Otherwise generates and persists, retrying on rare unique-constraint collisions.
   */
  async ensureTicketNumber(
    registrationId: string,
    client: PrismaLike = this.prisma,
  ): Promise<string> {
    const existing = await client.registration.findUnique({
      where: { id: registrationId },
      select: { ticketNumber: true },
    });

    if (existing?.ticketNumber) {
      return existing.ticketNumber;
    }

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
      const candidate = this.generateTicketNumber();
      try {
        const updated = await client.registration.update({
          where: { id: registrationId },
          data: {
            ticketNumber: candidate,
            ticketIssuedAt: new Date(),
          },
          select: { ticketNumber: true },
        });
        return updated.ticketNumber!;
      } catch (error) {
        if (this.isUniqueViolation(error) && attempt < MAX_GENERATION_ATTEMPTS) {
          this.logger.warn(
            `Ticket number collision for ${registrationId} on attempt ${attempt}, retrying`,
          );
          continue;
        }
        throw error;
      }
    }

    throw new Error(
      `Failed to generate unique ticket number after ${MAX_GENERATION_ATTEMPTS} attempts`,
    );
  }

  private randomCrockfordBase32(length: number): string {
    const bytes = randomBytes(length);
    let out = '';
    for (let i = 0; i < length; i++) {
      out += CROCKFORD_ALPHABET[bytes[i] % CROCKFORD_ALPHABET.length];
    }
    return out;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === PRISMA_UNIQUE_VIOLATION
    );
  }
}
