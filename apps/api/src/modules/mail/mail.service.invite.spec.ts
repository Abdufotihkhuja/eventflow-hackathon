import { MailService } from './mail.service';

describe('MailService organization invite metadata', () => {
  it('keeps the raw one-use token out of queue identifiers', async () => {
    const enqueueTemplateMail = jest.fn().mockResolvedValue('job-1');
    const service = new MailService(
      { get: jest.fn().mockReturnValue('https://app.eventflow.test') } as never,
      {} as never,
      { enqueueTemplateMail } as never,
    );
    const rawToken = 'raw-secret-token-that-must-not-be-a-job-id';

    await service.sendOrganizationInvite({
      inviteId: 'invite-safe-id',
      email: 'invitee@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      organizationName: 'EventFlow',
      rawToken,
      userExists: true,
    });

    const queued = enqueueTemplateMail.mock.calls[0][0] as {
      entityId: string;
      idempotencyKey: string;
      context: { activationUrl: string };
    };
    expect(queued.entityId).toBe('invite-safe-id');
    expect(queued.idempotencyKey).toBe('org-invite:invite-safe-id');
    expect(queued.entityId).not.toContain(rawToken);
    expect(queued.idempotencyKey).not.toContain(rawToken);
    // The token remains only where it is functionally required: the email URL.
    expect(queued.context.activationUrl).toContain(rawToken);
  });
});
