jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid',
}));

import { ForbiddenException } from '@nestjs/common';

import { MaterialsService } from './materials.service';

describe('MaterialsService', () => {
  const materialsRepository = {
    findAgendaItemInEvent: jest.fn(),
    findEventAccess: jest.fn(),
    appendMaterial: jest.fn(),
    replaceMaterials: jest.fn(),
  };
  const storage = {
    ensureDirectory: jest.fn(),
  };

  const service = new MaterialsService(
    materialsRepository as never,
    storage as never,
  );

  it('rejects agenda material reads for non-organizer actors', async () => {
    await expect(
      service.getMaterials('event-id', 'agenda-id', {
        sub: 'user-id',
        type: 'USER',
        email: 'user@example.com',
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
