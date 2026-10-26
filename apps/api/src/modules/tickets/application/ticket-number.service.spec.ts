import { Prisma } from '@prisma/client';
import { TicketNumberService } from './ticket-number.service';

const TICKET_NUMBER_REGEX = /^EVF-\d{6}-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;
const FORBIDDEN_CHARS = /[ILOU]/;

function buildPrismaUniqueViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`ticket_number`)',
    {
      code: 'P2002',
      clientVersion: '7.0.0',
      meta: { target: ['ticket_number'] },
    },
  );
}

describe('TicketNumberService', () => {
  describe('generateTicketNumber', () => {
    it('produces EVF-YYMMDD-XXXXXX matching Crockford base32 (no I/L/O/U)', () => {
      const service = new TicketNumberService(null as never);
      const fixed = new Date(Date.UTC(2026, 3, 29));
      const value = service.generateTicketNumber(fixed);
      expect(value.startsWith('EVF-260429-')).toBe(true);
      expect(value).toMatch(TICKET_NUMBER_REGEX);
      expect(FORBIDDEN_CHARS.test(value.split('-')[2])).toBe(false);
    });

    it('produces unique values across many invocations', () => {
      const service = new TicketNumberService(null as never);
      const set = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        set.add(service.generateTicketNumber());
      }
      // Allow at most 1 collision in 1000 iterations as a sanity bound (effectively zero).
      expect(set.size).toBeGreaterThan(998);
    });
  });

  describe('ensureTicketNumber', () => {
    function buildPrismaMock(opts: {
      existing?: string | null;
      failuresBeforeSuccess?: number;
    }) {
      const findUnique = jest
        .fn()
        .mockResolvedValue(
          opts.existing !== undefined ? { ticketNumber: opts.existing } : null,
        );
      const update = jest.fn();
      const failures = opts.failuresBeforeSuccess ?? 0;
      let attempt = 0;
      update.mockImplementation(async ({ data }) => {
        attempt++;
        if (attempt <= failures) {
          throw buildPrismaUniqueViolation();
        }
        return { ticketNumber: data.ticketNumber };
      });
      const prisma = {
        registration: { findUnique, update },
      } as never;
      return { prisma, findUnique, update };
    }

    it('returns existing ticketNumber without writing (idempotent)', async () => {
      const { prisma, update } = buildPrismaMock({
        existing: 'EVF-260101-AAAAAA',
      });
      const service = new TicketNumberService(prisma);
      const result = await service.ensureTicketNumber('reg-1');
      expect(result).toBe('EVF-260101-AAAAAA');
      expect(update).not.toHaveBeenCalled();
    });

    it('generates and persists when none exists', async () => {
      const { prisma, update } = buildPrismaMock({ existing: null });
      const service = new TicketNumberService(prisma);
      const result = await service.ensureTicketNumber('reg-2');
      expect(result).toMatch(TICKET_NUMBER_REGEX);
      expect(update).toHaveBeenCalledTimes(1);
    });

    it('retries on unique-violation collisions', async () => {
      const { prisma, update } = buildPrismaMock({
        existing: null,
        failuresBeforeSuccess: 2,
      });
      const service = new TicketNumberService(prisma);
      const result = await service.ensureTicketNumber('reg-3');
      expect(result).toMatch(TICKET_NUMBER_REGEX);
      expect(update).toHaveBeenCalledTimes(3);
    });

    it('throws after MAX_GENERATION_ATTEMPTS exhausted', async () => {
      const { prisma } = buildPrismaMock({
        existing: null,
        failuresBeforeSuccess: 10,
      });
      const service = new TicketNumberService(prisma);
      await expect(service.ensureTicketNumber('reg-4')).rejects.toBeDefined();
    });
  });
});
