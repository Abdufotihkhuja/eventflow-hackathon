import 'reflect-metadata';

jest.mock('../users/users.service', () => ({
  UsersService: class UsersService {},
}));

import { PublicController } from './public.controller';

describe('PublicController', () => {
  const publicService = {
    getPlatformStats: jest.fn(),
    getOrganizationStats: jest.fn(),
    getPublicEvents: jest.fn(),
    getPublicEventBySlug: jest.fn(),
    getPublicEventById: jest.fn(),
    canRegister: jest.fn(),
  };

  const usersService = {
    getProfileOptions: jest.fn(),
  };

  const controller = new PublicController(
    publicService as never,
    usersService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps profile-options to UsersService.getProfileOptions', () => {
    usersService.getProfileOptions.mockReturnValue({
      skills: [],
      regions: [],
      languages: [],
      specializations: [],
      profileStatuses: [],
      genders: [],
    });

    expect(controller.getProfileOptions()).toEqual({
      skills: [],
      regions: [],
      languages: [],
      specializations: [],
      profileStatuses: [],
      genders: [],
    });
    expect(usersService.getProfileOptions).toHaveBeenCalledTimes(1);
  });
});
