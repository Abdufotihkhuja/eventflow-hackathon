import { InAppChannelSender } from './in-app-channel.sender';

describe('InAppChannelSender organization lifecycle guard', () => {
  it('does not create an in-app side effect for an archived organization', async () => {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue(null) },
      notification: { create: jest.fn() },
      accountNotification: { create: jest.fn() },
      notificationDelivery: { update: jest.fn().mockResolvedValue({}) },
    };
    const sender = new InAppChannelSender(prisma as never);

    await sender.dispatchDelivery({
      id: 'delivery-1',
      dedupKey: 'org-feed:1',
      catalogId: 'ORG-01',
      channel: 'in_app',
      accountId: null,
      organizationId: 'org-archived',
      payload: {
        orgInApp: {
          organizationId: 'org-archived',
          type: 'MEMBER_JOINED',
        },
      },
      error: null,
    });

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(prisma.accountNotification.create).not.toHaveBeenCalled();
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
      data: { status: 'skipped', error: 'organization_unavailable' },
    });
  });
});
