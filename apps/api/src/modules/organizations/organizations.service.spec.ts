jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid',
}));

import {
  AuthProvider,
  OrganizationVerificationStatus,
} from '@prisma/client';
import { OrganizationsRepository } from './organizations.repository';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService multilingual mapping', () => {
  function createService() {
    const organizationsRepository = {
      findById: jest.fn(),
      update: jest.fn((id, data) => Promise.resolve({ id, ...baseOrganization(), ...data })),
    };

    return {
      organizationsRepository,
      service: new OrganizationsService(
        organizationsRepository as unknown as OrganizationsRepository,
        {} as never,
      ),
    };
  }

  function baseOrganization() {
    return {
      id: 'org-id',
      email: 'org@example.com',
      name: 'Existing representative',
      companyName: 'Existing company',
      inn: null,
      description: 'Existing description',
      phone: null,
      address: null,
      website: null,
      logoUrl: null,
      authProvider: AuthProvider.EMAIL,
      isEmailVerified: true,
      isOnboardingCompleted: true,
      industry: null,
      companySize: null,
      companyInfoCompleted: false,
      placesFeatureEnabled: false,
      verificationStatus: OrganizationVerificationStatus.APPROVED,
      rejectionReason: null,
      verifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      translations: {},
      translationMeta: {},
    };
  }

  it('updates public scalar fields from translations and persists metadata', async () => {
    const { organizationsRepository, service } = createService();
    organizationsRepository.findById.mockResolvedValue(baseOrganization());

    await service.update('org-id', {
      organizationName: 'Fallback company',
      translations: {
        name: { en: 'Representative' },
        companyName: { uz: 'Kompaniya' },
        description: { ru: 'Описание' },
      },
      translationMeta: {
        companyName: {
          uz: { status: 'manual' },
        },
      },
    });

    expect(organizationsRepository.update).toHaveBeenCalledWith(
      'org-id',
      expect.objectContaining({
        name: 'Representative',
        companyName: 'Kompaniya',
        description: 'Описание',
        translations: {
          name: { en: 'Representative' },
          companyName: { uz: 'Kompaniya' },
          description: { ru: 'Описание' },
        },
        translationMeta: {
          companyName: {
            uz: { status: 'manual' },
          },
        },
      }),
    );
  });
});
