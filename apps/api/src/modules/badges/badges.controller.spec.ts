jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

import { PERMISSIONS_KEY } from '../../common/decorators';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { BadgesController } from './badges.controller';

describe('BadgesController permissions', () => {
  it('requires export permission for badge ZIP downloads', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      Object.getOwnPropertyDescriptor(
        BadgesController.prototype,
        'downloadBadges',
      )?.value,
    );

    expect(permissions).toEqual([PERMISSIONS.CERTIFICATES_EXPORT]);
  });
});
