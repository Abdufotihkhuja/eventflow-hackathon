import { UserType } from '@prisma/client';
import { CertificatesService } from './certificates.service';

describe('CertificatesService personal-history continuity', () => {
  it('authorizes the certificate owner independently of staff/org lifecycle', async () => {
    const certificate = {
      id: 'certificate-1',
      certificateUrl: '/certificates/certificate-1.pdf',
      event: { title: 'Past event', organizationId: 'archived-org' },
      registration: {
        user: { id: 'personal-user' },
        event: { title: 'Past event', organizationId: 'archived-org' },
      },
      eventRecipient: null,
    };
    const prisma = {
      certificate: {
        findUnique: jest.fn().mockResolvedValue(certificate),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const storage = {
      ensureDirectory: jest.fn(),
      exists: jest.fn().mockReturnValue(true),
    };
    const service = new CertificatesService(
      prisma as never,
      {} as never,
      storage as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.downloadCertificate('certificate-1', {
        sub: 'personal-user',
        type: UserType.USER,
      } as never),
    ).resolves.toEqual({
      path: '/certificates/certificate-1.pdf',
      filename: 'certificate-Past event.pdf',
    });
  });
});
