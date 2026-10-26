import { Prisma, EventType, OrderStatus, PlanKey, RevenueChannel } from '@prisma/client';
import { TicketingService } from './ticketing.service';
import { TicketingRepository } from './ticketing.repository';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { RevenueService } from '../revenue/revenue.service';
import { ConflictException } from '@nestjs/common';
import type { ICurrentUser } from '../../../common/interfaces';

const USER = { sub: 'user-1' } as ICurrentUser;
const REG_ID = 'reg-1';

function registration(overrides: Record<string, unknown> = {}) {
  return {
    id: REG_ID,
    userId: 'user-1',
    event: {
      id: 'ev-1',
      organizationId: 'org-1',
      type: EventType.PAID,
      price: new Prisma.Decimal('150000.50'),
      currency: 'UZS',
      status: 'PUBLISHED',
      title: 'Conf',
    },
    ...overrides,
  };
}

function build(opts: {
  registration?: unknown;
  liveOrder?: unknown;
  commissionBps?: number;
}) {
  const tx = {};
  const repo = {
    runInTransaction: jest.fn((fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    findRegistrationForCheckout: jest
      .fn()
      .mockResolvedValue(opts.registration ?? registration()),
    findLiveOrderForRegistration: jest
      .fn()
      .mockResolvedValue(opts.liveOrder ?? null),
    expireStaleOrders: jest.fn().mockResolvedValue(undefined),
    createTicketOrder: jest
      .fn()
      .mockImplementation((_tx, data) => Promise.resolve({ id: 'ord-1', ...data })),
    confirmPaid: jest.fn().mockResolvedValue({
      id: 'ord-1',
      organizationId: 'org-1',
      commissionAmountMinor: 1_200_004n,
      currency: 'UZS',
      registrationId: REG_ID,
    }),
  };
  const entitlements = {
    getEffectiveEntitlements: jest.fn().mockResolvedValue({
      commissionBps: opts.commissionBps ?? 800,
      tierKey: PlanKey.PRO,
    }),
  };
  const revenue = { record: jest.fn().mockResolvedValue({}) };
  // Цепочка 2 (Батч 6б): чекаут возвращает enqueue-замыкание, confirm гасит
  // платёжные job'ы + шлёт REG-06 — в юнитах достаточно заглушек.
  const registrationChain = {
    onCheckoutCreated: jest.fn().mockResolvedValue(jest.fn()),
    onTicketPaid: jest.fn().mockResolvedValue(undefined),
  };
  const service = new TicketingService(
    repo as unknown as TicketingRepository,
    entitlements as unknown as EntitlementsService,
    revenue as unknown as RevenueService,
    registrationChain as never,
  );
  return { service, repo, revenue, registrationChain };
}

describe('TicketingService.checkout (M-4 + M-6)', () => {
  it('создаёт TICKET_SALE заказ: Decimal→тийины без float, комиссия по снапшоту bps', async () => {
    const { service, repo } = build({});
    const order = (await service.checkout(REG_ID, USER)) as Record<string, unknown>;

    // 150000.50 UZS → 15000050 тийинов
    expect(order.amountMinor).toBe(15_000_050n);
    // 8% (800 bps) half-up: 15000050 × 800 / 10000 = 1200004
    expect(order.commissionBpsSnapshot).toBe(800);
    expect(order.commissionAmountMinor).toBe(1_200_004n);
    expect(order.holdExpiresAt).toBeInstanceOf(Date);
    expect(repo.expireStaleOrders).toHaveBeenCalled();
  });

  it('бесплатное событие → 400', async () => {
    const { service } = build({
      registration: registration({
        event: { ...registration().event, type: EventType.FREE, price: null },
      }),
    });
    await expect(service.checkout(REG_ID, USER)).rejects.toThrow(
      'не является платным',
    );
  });

  it('живая бронь → возвращается тот же заказ (идемпотентный чекаут)', async () => {
    const live = { id: 'ord-live', status: OrderStatus.PENDING_PAYMENT };
    const { service, repo } = build({ liveOrder: live });
    const order = await service.checkout(REG_ID, USER);
    expect(order).toBe(live);
    expect(repo.createTicketOrder).not.toHaveBeenCalled();
  });

  it('уже оплачено → 409 TICKET_ALREADY_PAID', async () => {
    const { service } = build({
      liveOrder: { id: 'ord-paid', status: OrderStatus.PAID },
    });
    await expect(service.checkout(REG_ID, USER)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('TicketingService.confirmTicketPaid', () => {
  it('пишет выручку COMMISSION при подтверждении', async () => {
    const { service, revenue } = build({});
    const order = await service.confirmTicketPaid('ord-1', RevenueChannel.MANUAL);
    expect(order?.id).toBe('ord-1');
    expect(revenue.record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'COMMISSION',
        amountMinor: 1_200_004n,
        sourceRef: 'ord-1',
      }),
      expect.anything(),
    );
  });

  it('повторное подтверждение → идемпотентный null, выручка не дублируется', async () => {
    const { service, repo, revenue } = build({});
    repo.confirmPaid.mockResolvedValue(null);
    const order = await service.confirmTicketPaid('ord-1', RevenueChannel.MANUAL);
    expect(order).toBeNull();
    expect(revenue.record).not.toHaveBeenCalled();
  });
});
