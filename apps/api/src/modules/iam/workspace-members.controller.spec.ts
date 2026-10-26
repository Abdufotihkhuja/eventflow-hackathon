import 'reflect-metadata';
import { UserType } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import type { ICurrentUser } from '../../common/interfaces';

jest.mock('../organizations/members/members.service', () => ({
  MembersService: class MembersService {},
}));

import { WorkspaceMembersController } from './workspace-members.controller';

describe('WorkspaceMembersController', () => {
  const getControllerHandler = (
    methodName: keyof WorkspaceMembersController,
  ): unknown =>
    Object.getOwnPropertyDescriptor(
      WorkspaceMembersController.prototype,
      methodName,
    )?.value;

  const membersService = {
    getMyProfile: jest.fn(),
    updateMyProfile: jest.fn(),
    updateMyPrivacy: jest.fn(),
    uploadMyAvatar: jest.fn(),
    deleteMyAvatar: jest.fn(),
    completeOnboarding: jest.fn(),
    getMyPermissions: jest.fn(),
  };

  const controller = new WorkspaceMembersController(membersService as never);
  const user: ICurrentUser = {
    sub: 'member-1',
    type: UserType.MEMBER,
    email: 'member@example.com',
    organizationId: 'org-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps getMe to MembersService.getMyProfile', async () => {
    membersService.getMyProfile.mockResolvedValue({ id: 'member-1' });

    await expect(controller.getMe(user)).resolves.toEqual({ id: 'member-1' });
    expect(membersService.getMyProfile).toHaveBeenCalledWith('member-1');
  });

  it('maps updateMe to MembersService.updateMyProfile', async () => {
    const dto = { firstName: 'Jane' };
    membersService.updateMyProfile.mockResolvedValue({ id: 'member-1' });

    await controller.updateMe(user, dto);

    expect(membersService.updateMyProfile).toHaveBeenCalledWith(
      'member-1',
      dto,
    );
  });

  it('maps updatePrivacy to MembersService.updateMyPrivacy', async () => {
    const dto = { showEmail: true };
    membersService.updateMyPrivacy.mockResolvedValue({ id: 'member-1' });

    await controller.updatePrivacy(user, dto);

    expect(membersService.updateMyPrivacy).toHaveBeenCalledWith(
      'member-1',
      dto,
    );
  });

  it('maps uploadAvatar to MembersService.uploadMyAvatar', async () => {
    const file = { originalname: 'avatar.png' } as Express.Multer.File;
    membersService.uploadMyAvatar.mockResolvedValue({ id: 'member-1' });

    await controller.uploadAvatar(user, file);

    expect(membersService.uploadMyAvatar).toHaveBeenCalledWith(
      'member-1',
      file,
    );
  });

  it('maps deleteAvatar to MembersService.deleteMyAvatar', async () => {
    membersService.deleteMyAvatar.mockResolvedValue({ id: 'member-1' });

    await controller.deleteAvatar(user);

    expect(membersService.deleteMyAvatar).toHaveBeenCalledWith('member-1');
  });

  it('maps completeOnboarding to MembersService.completeOnboarding', async () => {
    membersService.completeOnboarding.mockResolvedValue({ id: 'member-1' });

    await controller.completeOnboarding(user);

    expect(membersService.completeOnboarding).toHaveBeenCalledWith('member-1');
  });

  it('maps getPermissions to MembersService.getMyPermissions', async () => {
    membersService.getMyPermissions.mockResolvedValue({ permissions: [] });

    await expect(controller.getPermissions(user)).resolves.toEqual({
      permissions: [],
    });
    expect(membersService.getMyPermissions).toHaveBeenCalledWith('member-1');
  });

  it('requires MEMBER role for all workspace member self endpoints', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, getControllerHandler('getMe')),
    ).toEqual([UserType.MEMBER]);
    expect(
      Reflect.getMetadata(ROLES_KEY, getControllerHandler('updateMe')),
    ).toEqual([UserType.MEMBER]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        getControllerHandler('updatePrivacy'),
      ),
    ).toEqual([UserType.MEMBER]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        getControllerHandler('uploadAvatar'),
      ),
    ).toEqual([UserType.MEMBER]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        getControllerHandler('deleteAvatar'),
      ),
    ).toEqual([UserType.MEMBER]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        getControllerHandler('completeOnboarding'),
      ),
    ).toEqual([UserType.MEMBER]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        getControllerHandler('getPermissions'),
      ),
    ).toEqual([UserType.MEMBER]);
  });
});
