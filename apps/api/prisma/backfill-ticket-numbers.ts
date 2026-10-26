/**
 * Backfill ticket numbers for existing registrations that pre-date the e-ticket feature.
 *
 * Usage: `npm run tickets:backfill --workspace @eventflow/api`
 * Idempotent: skips registrations that already have a ticketNumber.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes } from 'crypto';

const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SUFFIX_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 200;
const PRISMA_UNIQUE_VIOLATION = 'P2002';

// Prisma 7 requires an adapter when constructed outside the Nest DI container.
// Mirrors PrismaService construction in src/prisma/prisma.service.ts.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be set to run backfill');
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function generateTicketNumber(date: Date = new Date()): string {
  const yy = String(date.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const bytes = randomBytes(SUFFIX_LENGTH);
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += CROCKFORD_ALPHABET[bytes[i] % CROCKFORD_ALPHABET.length];
  }
  return `EVF-${yy}${mm}${dd}-${suffix}`;
}

async function ensureForRegistration(id: string, createdAt: Date): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidate = generateTicketNumber(createdAt);
    try {
      await prisma.registration.update({
        where: { id },
        data: { ticketNumber: candidate, ticketIssuedAt: createdAt },
        select: { id: true },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_VIOLATION &&
        attempt < MAX_ATTEMPTS
      ) {
        continue;
      }
      throw error;
    }
  }
  return false;
}

async function main(): Promise<void> {
  let processed = 0;
  const skipped = 0;
  let failed = 0;

  while (true) {
    const batch = await prisma.registration.findMany({
      where: { ticketNumber: null },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    for (const row of batch) {
      try {
        const ok = await ensureForRegistration(row.id, row.createdAt);
        if (ok) {
          processed += 1;
        } else {
          failed += 1;
          console.error(
            `Could not assign ticket number to ${row.id} after ${MAX_ATTEMPTS} attempts`,
          );
        }
      } catch (error) {
        failed += 1;
        console.error(`Backfill failed for ${row.id}:`, error);
      }
    }

    console.log(
      `Backfilled batch of ${batch.length} (running totals: processed=${processed}, skipped=${skipped}, failed=${failed})`,
    );
  }

  console.log(
    `Done. Total: processed=${processed}, skipped=${skipped}, failed=${failed}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
