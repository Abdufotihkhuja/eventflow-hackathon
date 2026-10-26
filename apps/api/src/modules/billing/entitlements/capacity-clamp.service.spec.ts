import { PlanKey } from '@prisma/client';
import { CapacityClampService } from './capacity-clamp.service';
import { EntitlementsService } from './entitlements.service';
import { BillingConfigService } from '../billing-config.service';

const ORG_ID = 'org-1';
const ENABLED_AT = new Date('2026-07-01T00:00:00Z');
const PRE_CUTOVER = new Date('2026-06-01T00:00:00Z');
const POST_CUTOVER = new Date('2026-07-10T00:00:00Z');

function build(opts: {
  enforcement?: boolean;
  tierCap?: number | null;
  tierKey?: PlanKey;
  enabledAt?: Date | null;
}) {
  const entitlements = {
    getEffectiveEntitlements: jest.fn().mockResolvedValue({
      enforcementEnabled: opts.enforcement ?? true,
      maxParticipantsPerEvent: opts.tierCap === undefined ? 50 : opts.tierCap,
      tierKey: opts.tierKey ?? PlanKey.START,
    }),
  };
  const config = {
    getEnabledAt: jest
      .fn()
      .mockResolvedValue(opts.enabledAt === undefined ? ENABLED_AT : opts.enabledAt),
  };
  return new CapacityClampService(
    entitlements as unknown as EntitlementsService,
    config as unknown as BillingConfigService,
  );
}

describe('CapacityClampService (E-3)', () => {
  it('тарифный кап строже организаторского → TIER', async () => {
    const service = build({ tierCap: 50 });
    const cap = await service.effectiveEventCap(ORG_ID, {
      createdAt: POST_CUTOVER,
      maxParticipants: 200,
    });
    expect(cap).toEqual({ cap: 50, source: 'TIER', tierCap: 50, tierKey: PlanKey.START });
  });

  it('организаторский строже тарифного → ORGANIZER', async () => {
    const service = build({ tierCap: 400, tierKey: PlanKey.PRO });
    const cap = await service.effectiveEventCap(ORG_ID, {
      createdAt: POST_CUTOVER,
      maxParticipants: 100,
    });
    expect(cap.source).toBe('ORGANIZER');
    expect(cap.cap).toBe(100);
  });

  it('pre-cutover событие: тарифный кап игнорируется НАВСЕГДА (B-3 п.3)', async () => {
    const service = build({ tierCap: 50 });
    const cap = await service.effectiveEventCap(ORG_ID, {
      createdAt: PRE_CUTOVER,
      maxParticipants: 500,
    });
    expect(cap).toMatchObject({ cap: 500, source: 'ORGANIZER', tierCap: null });
  });

  it('S-19 ВЫКЛ: только организаторский кап (легаси-поведение)', async () => {
    const service = build({ enforcement: false, tierCap: 50 });
    const cap = await service.effectiveEventCap(ORG_ID, {
      createdAt: POST_CUTOVER,
      maxParticipants: 300,
    });
    expect(cap).toMatchObject({ cap: 300, source: 'ORGANIZER' });
  });

  it('капов нет вовсе → NONE', async () => {
    const service = build({ enforcement: false });
    const cap = await service.effectiveEventCap(ORG_ID, {
      createdAt: POST_CUTOVER,
      maxParticipants: null,
    });
    expect(cap).toMatchObject({ cap: null, source: 'NONE' });
  });
});
