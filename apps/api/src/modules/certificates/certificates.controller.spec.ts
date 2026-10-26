jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

import { PERMISSIONS_KEY } from '../../common/decorators';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { EventCertificatesController } from './certificates.controller';

describe('EventCertificatesController permissions', () => {
  it('requires export permission for organizer certificate downloads', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      Object.getOwnPropertyDescriptor(
        EventCertificatesController.prototype,
        'downloadByEvent',
      )?.value,
    );

    expect(permissions).toEqual([PERMISSIONS.CERTIFICATES_EXPORT]);
  });
});
