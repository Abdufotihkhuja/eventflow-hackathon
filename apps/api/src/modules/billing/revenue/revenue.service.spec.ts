import { Currency, RevenueChannel, RevenueType } from '@prisma/client';
import { RevenueService } from './revenue.service';
import { PrismaService } from '../../../prisma/prisma.service';

function build() {
  const create = jest.fn().mockImplementation(({ data }) => Promise.resolve(data));
  const prisma = { revenueEntry: { create } } as unknown as PrismaService;
  return { service: new RevenueService(prisma), create };
}

describe('RevenueService (M-15)', () => {
  it('пишет строку выручки с дефолтной валютой UZS', async () => {
    const { service, create } = build();
    await service.record({
      organizationRef: 'org-1',
      organizationLabel: 'Acme Events',
      type: RevenueType.PLAN_FEE,
      channel: RevenueChannel.MANUAL,
      amountMinor: 7_500_000_00n,
      sourceRef: 'order-1',
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationRef: 'org-1',
        type: RevenueType.PLAN_FEE,
        channel: RevenueChannel.MANUAL,
        amountMinor: 7_500_000_00n,
        currency: Currency.UZS,
        sourceRef: 'order-1',
      }),
    });
  });

  it('использует переданный tx (атомарность с денежной мутацией)', async () => {
    const { service, create } = build();
    const txCreate = jest.fn().mockResolvedValue({});
    await service.record(
      {
        organizationRef: 'org-1',
        type: RevenueType.COIN_PACK,
        channel: RevenueChannel.MANUAL,
        amountMinor: 45_000_000n,
      },
      { revenueEntry: { create: txCreate } } as never,
    );
    expect(txCreate).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
  });

  it('ограждение знаков: REFUND < 0, доход > 0, ADJUSTMENT — любой', async () => {
    const { service } = build();
    await expect(
      service.record({
        organizationRef: 'o',
        type: RevenueType.REFUND,
        channel: RevenueChannel.MANUAL,
        amountMinor: 100n,
      }),
    ).rejects.toThrow('отрицательным');
    await expect(
      service.record({
        organizationRef: 'o',
        type: RevenueType.COMMISSION,
        channel: RevenueChannel.PAYME,
        amountMinor: 0n,
      }),
    ).rejects.toThrow('положительным');
    await expect(
      service.record({
        organizationRef: 'o',
        type: RevenueType.ADJUSTMENT,
        channel: RevenueChannel.MANUAL,
        amountMinor: -5n,
      }),
    ).resolves.toBeDefined();
  });
});
