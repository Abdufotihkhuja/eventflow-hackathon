import 'reflect-metadata';
import { UserType } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import type { ICurrentUser } from '../../common/interfaces';

jest.mock('../events/saved/saved-events.service', () => ({
  SavedEventsService: class SavedEventsService {},
}));

import { AccountSavedEventsController } from './account-saved-events.controller';

describe('AccountSavedEventsController', () => {
  const savedEventsService = {
    save: jest.fn(),
    unsave: jest.fn(),
    findByUserId: jest.fn(),
    isSaved: jest.fn(),
  };

  const controller = new AccountSavedEventsController(
    savedEventsService as never,
  );
  const user: ICurrentUser = {
    sub: 'user-1',
    type: UserType.USER,
    email: 'user@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps save to SavedEventsService.save', async () => {
    savedEventsService.save.mockResolvedValue({ id: 'saved-1' });

    await expect(controller.save('event-1', user)).resolves.toEqual({
      id: 'saved-1',
    });
    expect(savedEventsService.save).toHaveBeenCalledWith('event-1', user);
  });

  it('maps unsave to SavedEventsService.unsave', async () => {
    savedEventsService.unsave.mockResolvedValue(undefined);

    await expect(controller.unsave('event-1', user)).resolves.toEqual({
      message: 'Мероприятие удалено из избранного',
    });
    expect(savedEventsService.unsave).toHaveBeenCalledWith('event-1', user);
  });

  it('maps findAll to SavedEventsService.findByUserId', async () => {
    const query = { page: 1, limit: 10 };
    savedEventsService.findByUserId.mockResolvedValue({ data: [], total: 0 });

    await expect(controller.findAll(query, user)).resolves.toEqual({
      data: [],
      total: 0,
    });
    expect(savedEventsService.findByUserId).toHaveBeenCalledWith(user, query);
  });

  it('maps checkSaved to SavedEventsService.isSaved', async () => {
    savedEventsService.isSaved.mockResolvedValue(true);

    await expect(controller.checkSaved('event-1', user)).resolves.toEqual({
      isSaved: true,
    });
    expect(savedEventsService.isSaved).toHaveBeenCalledWith('event-1', user);
  });

  it('requires USER role for the controller surface', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AccountSavedEventsController),
    ).toEqual([UserType.USER]);
  });
});
