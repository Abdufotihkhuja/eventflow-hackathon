import { PlanKey } from '@prisma/client';
import { SeatLimitService } from './seat-limit.service';
import { SeatLimitRepository } from './seat-limit.repository';
import { EntitlementsService } from './entitlements.service';
import { CapExceededException } from '../errors/billing-errors';

const ORG_ID = 'org-1';

function build(opts: {
  enforcement?: boolean;
  staffSeats?: number | null;
  occupied?: number;
}) {
  const entitlements = {
    getEffectiveEntitlements: jest.fn().mockResolvedValue({
      enforcementEnabled: opts.enforcement ?? true,
      suspended: false,
      staffSeats: opts.staffSeats === undefined ? 1 : opts.staffSeats,
      tierKey: PlanKey.START,
    }),
  };
  const repo = {
    countOccupiedSeats: jest.fn().mockResolvedValue(opts.occupied ?? 0),
  };
  return {
    service: new SeatLimitService(
      entitlements as unknown as EntitlementsService,
      repo as unknown as SeatLimitRepository,
    ),
    repo,
  };
}

describe('SeatLimitService (E-4)', () => {
  it('свободное место — пропускает', async () => {
    const { service } = build({ staffSeats: 3, occupied: 2 });
    await expect(service.assertSeatAvailable(ORG_ID)).resolves.toBeUndefined();
  });

  it('лимит занят (члены + PENDING-инвайты, CR-10) → 409 CAP_EXCEEDED', async () => {
    const { service } = build({ staffSeats: 1, occupied: 1 });
    await expect(service.assertSeatAvailable(ORG_ID)).rejects.toBeInstanceOf(
      CapExceededException,
    );
  });

  it('S-19 ВЫКЛ → без проверки', async () => {
    const { service, repo } = build({ enforcement: false, occupied: 99 });
    await expect(service.assertSeatAvailable(ORG_ID)).resolves.toBeUndefined();
    expect(repo.countOccupiedSeats).not.toHaveBeenCalled();
  });

  it('оверрайд-безлимит (staffSeats null) → без проверки', async () => {
    const { service, repo } = build({ staffSeats: null, occupied: 99 });
    await expect(service.assertSeatAvailable(ORG_ID)).resolves.toBeUndefined();
    expect(repo.countOccupiedSeats).not.toHaveBeenCalled();
  });
});
