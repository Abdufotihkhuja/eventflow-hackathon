import { PERMISSIONS_KEY } from '../../../common/decorators';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { ArtifactRecipientsController } from './artifact-recipients.controller';

describe('ArtifactRecipientsController permissions', () => {
  const requiredPermissionsFor = (methodName: keyof ArtifactRecipientsController) =>
    Reflect.getMetadata(
      PERMISSIONS_KEY,
      Object.getOwnPropertyDescriptor(
        ArtifactRecipientsController.prototype,
        methodName,
      )?.value,
    );

  it('allows certificate readers to list recipient roles', () => {
    expect(requiredPermissionsFor('getRecipientRoles')).toEqual([
      PERMISSIONS.CERTIFICATES_READ,
    ]);
    expect(requiredPermissionsFor('getArtifactTemplateSummary')).toEqual([
      PERMISSIONS.CERTIFICATES_READ,
    ]);
    expect(requiredPermissionsFor('getArtifactBulkPreview')).toEqual([
      PERMISSIONS.CERTIFICATES_READ,
    ]);
  });

  it('requires recipient role management permission for write operations', () => {
    expect(requiredPermissionsFor('createRecipientRole')).toEqual([
      PERMISSIONS.RECIPIENT_ROLES_MANAGE,
    ]);
    expect(requiredPermissionsFor('updateRecipientRole')).toEqual([
      PERMISSIONS.RECIPIENT_ROLES_MANAGE,
    ]);
    expect(requiredPermissionsFor('deactivateRecipientRole')).toEqual([
      PERMISSIONS.RECIPIENT_ROLES_MANAGE,
    ]);
    expect(requiredPermissionsFor('activateRecipientRole')).toEqual([
      PERMISSIONS.RECIPIENT_ROLES_MANAGE,
    ]);
    expect(requiredPermissionsFor('previewRecipientRoleDelete')).toEqual([
      PERMISSIONS.RECIPIENT_ROLES_MANAGE,
    ]);
  });

  it('requires artifact recipient management permission for manual recipient operations', () => {
    expect(requiredPermissionsFor('createManualArtifactRecipient')).toEqual([
      PERMISSIONS.ARTIFACT_RECIPIENTS_MANAGE,
    ]);
    expect(requiredPermissionsFor('updateManualArtifactRecipient')).toEqual([
      PERMISSIONS.ARTIFACT_RECIPIENTS_MANAGE,
    ]);
    expect(requiredPermissionsFor('assignArtifactRecipientRole')).toEqual([
      PERMISSIONS.ARTIFACT_RECIPIENTS_MANAGE,
    ]);
    expect(requiredPermissionsFor('deactivateArtifactRecipientRole')).toEqual([
      PERMISSIONS.ARTIFACT_RECIPIENTS_MANAGE,
    ]);
  });
});
