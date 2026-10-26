import 'reflect-metadata';
import { UserType } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import type { ICurrentUser } from '../../common/interfaces';
import { AccountSavedBlogPostsController } from './account-saved-blog-posts.controller';

describe('AccountSavedBlogPostsController', () => {
  const savedBlogPostsService = {
    findUserSaved: jest.fn(),
    save: jest.fn(),
    unsave: jest.fn(),
    checkSaved: jest.fn(),
  };

  const controller = new AccountSavedBlogPostsController(
    savedBlogPostsService as never,
  );

  const user: ICurrentUser = {
    sub: 'user-1',
    type: UserType.USER,
    email: 'user@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps findAll to SavedBlogPostsService.findUserSaved', async () => {
    const query = { page: 1, limit: 10 };
    savedBlogPostsService.findUserSaved.mockResolvedValue({
      data: [],
      total: 0,
    });

    await expect(controller.findAll(query, user)).resolves.toEqual({
      data: [],
      total: 0,
    });
    expect(savedBlogPostsService.findUserSaved).toHaveBeenCalledWith(
      query,
      user,
    );
  });

  it('maps save to SavedBlogPostsService.save', async () => {
    savedBlogPostsService.save.mockResolvedValue({ id: 'saved-post-1' });

    await expect(controller.save('post-1', user)).resolves.toEqual({
      id: 'saved-post-1',
    });
    expect(savedBlogPostsService.save).toHaveBeenCalledWith('post-1', user);
  });

  it('maps unsave to SavedBlogPostsService.unsave', async () => {
    savedBlogPostsService.unsave.mockResolvedValue({ success: true });

    await expect(controller.unsave('post-1', user)).resolves.toEqual({
      success: true,
    });
    expect(savedBlogPostsService.unsave).toHaveBeenCalledWith('post-1', user);
  });

  it('maps checkSaved to SavedBlogPostsService.checkSaved', async () => {
    savedBlogPostsService.checkSaved.mockResolvedValue({ saved: true });

    await expect(controller.checkSaved('post-1', user)).resolves.toEqual({
      saved: true,
    });
    expect(savedBlogPostsService.checkSaved).toHaveBeenCalledWith(
      'post-1',
      user,
    );
  });

  it('requires USER role for the controller surface', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AccountSavedBlogPostsController),
    ).toEqual([UserType.USER]);
  });
});
