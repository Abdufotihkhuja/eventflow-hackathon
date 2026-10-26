import { SpeakersService } from './speakers.service';

describe('SpeakersService event-role isolation', () => {
  it('links a verified User without creating or changing Registration', async () => {
    const repository = {
      findInvitationByToken: jest.fn().mockResolvedValue({
        id: 'speaker-1',
        eventId: 'event-1',
        firstName: 'Jane',
        lastName: 'Doe',
        invitedEmail: 'jane@example.com',
        invitationStatus: 'PENDING',
        tokenExpiresAt: new Date(Date.now() + 60_000),
        event: {
          id: 'event-1',
          title: 'Event',
          startDate: new Date(),
          endDate: new Date(),
          organization: { name: 'Org' },
        },
      }),
      findUserByEmail: jest
        .fn()
        .mockResolvedValue({ id: 'user-1', email: 'jane@example.com' }),
      findById: jest.fn().mockResolvedValue({
        id: 'speaker-1',
        eventId: 'event-1',
        invitedEmail: 'jane@example.com',
      }),
      findUserById: jest
        .fn()
        .mockResolvedValue({ id: 'user-1', email: 'jane@example.com' }),
      update: jest.fn().mockResolvedValue({}),
    };
    const service = new SpeakersService(repository as never, {} as never);

    await expect(
      service.acceptInvitation('raw-speaker-token', 'user-1'),
    ).resolves.toEqual({ message: 'Приглашение принято' });

    expect(repository.update).toHaveBeenCalledWith(
      'speaker-1',
      expect.objectContaining({
        user: { connect: { id: 'user-1' } },
        invitationStatus: 'ACCEPTED',
      }),
    );
    expect(repository).not.toHaveProperty('createSpeakerRegistration');
    expect(repository).not.toHaveProperty('updateRegistrationRole');
  });
});
