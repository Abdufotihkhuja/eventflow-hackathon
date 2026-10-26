import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from '../../../common/guards';
import {
  CurrentUser,
  RequirePermissions,
} from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { ArtifactBulkPreviewService } from './artifact-bulk-preview.service';
import { ArtifactRecipientsService } from './artifact-recipients.service';
import {
  ArtifactBulkPreviewDto,
  ArtifactBulkPreviewResponseDto,
  ArtifactRecipientQueryDto,
  ArtifactRecipientCreateResultDto,
  ArtifactRecipientDto,
  ArtifactRecipientRoleAssignmentResultDto,
  ArtifactRecipientsPageDto,
  ArtifactTemplateSummaryQueryDto,
  ArtifactTemplateSummaryResponseDto,
  AssignArtifactRecipientRoleDto,
  BatchCreateManualArtifactRecipientsDto,
  BatchCreateManualArtifactRecipientsResultDto,
  CreateManualArtifactRecipientDto,
  CreateRecipientRoleDto,
  RecipientRoleDeletePreviewDto,
  RecipientRoleDto,
  UpdateManualArtifactRecipientDto,
  UpdateRecipientRoleDto,
} from './dto';

@ApiTags('event-artifact-recipients')
@Controller('events/:eventId')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ArtifactRecipientsController {
  constructor(
    private readonly artifactRecipientsService: ArtifactRecipientsService,
    private readonly artifactBulkPreviewService: ArtifactBulkPreviewService,
  ) {}

  @Get('artifact-recipients')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  @ApiOperation({ summary: 'List normalized artifact recipients for an event' })
  @ApiOkResponse({ type: ArtifactRecipientsPageDto })
  getArtifactRecipients(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: ArtifactRecipientQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.findArtifactRecipients(
      eventId,
      query,
      user,
    );
  }

  @Post('artifact-recipients')
  @RequirePermissions(PERMISSIONS.ARTIFACT_RECIPIENTS_MANAGE)
  @ApiOperation({ summary: 'Create or reuse a manual artifact recipient' })
  @ApiCreatedResponse({ type: ArtifactRecipientCreateResultDto })
  createManualArtifactRecipient(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateManualArtifactRecipientDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.createManualArtifactRecipient(
      eventId,
      dto,
      user,
    );
  }

  @Post('artifact-recipients/batch')
  @RequirePermissions(PERMISSIONS.ARTIFACT_RECIPIENTS_MANAGE)
  @ApiOperation({
    summary: 'Batch create or reuse manual artifact recipients (Excel import)',
  })
  @ApiCreatedResponse({ type: BatchCreateManualArtifactRecipientsResultDto })
  batchCreateManualArtifactRecipients(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: BatchCreateManualArtifactRecipientsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.batchCreateManualArtifactRecipients(
      eventId,
      dto,
      user,
    );
  }

  @Patch('artifact-recipients/:recipientId')
  @RequirePermissions(PERMISSIONS.ARTIFACT_RECIPIENTS_MANAGE)
  @ApiOperation({ summary: 'Update a manual artifact recipient' })
  @ApiOkResponse({ type: ArtifactRecipientDto })
  updateManualArtifactRecipient(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Body() dto: UpdateManualArtifactRecipientDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.updateManualArtifactRecipient(
      eventId,
      recipientId,
      dto,
      user,
    );
  }

  @Post('artifact-recipients/:recipientId/roles')
  @RequirePermissions(PERMISSIONS.ARTIFACT_RECIPIENTS_MANAGE)
  @ApiOperation({ summary: 'Assign a role to an artifact recipient' })
  @ApiCreatedResponse({ type: ArtifactRecipientRoleAssignmentResultDto })
  assignArtifactRecipientRole(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Body() dto: AssignArtifactRecipientRoleDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.assignRoleToArtifactRecipient(
      eventId,
      recipientId,
      dto,
      user,
    );
  }

  @Delete('artifact-recipients/:recipientId/roles/:roleId')
  @RequirePermissions(PERMISSIONS.ARTIFACT_RECIPIENTS_MANAGE)
  @ApiOperation({ summary: 'Deactivate a recipient role assignment' })
  @ApiOkResponse({ type: ArtifactRecipientRoleAssignmentResultDto })
  deactivateArtifactRecipientRole(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.deactivateRoleForArtifactRecipient(
      eventId,
      recipientId,
      roleId,
      user,
    );
  }

  @Get('artifacts/template-summary')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  @ApiOperation({
    summary: 'Get role-based artifact template summary for an event',
  })
  @ApiOkResponse({ type: ArtifactTemplateSummaryResponseDto })
  getArtifactTemplateSummary(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: ArtifactTemplateSummaryQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.getArtifactTemplateSummary(
      eventId,
      query,
      user,
    );
  }

  @Post('artifacts/bulk-preview')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  @ApiOperation({
    summary: 'Preview affected recipients and artifacts for a bulk action',
  })
  @ApiOkResponse({ type: ArtifactBulkPreviewResponseDto })
  getArtifactBulkPreview(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: ArtifactBulkPreviewDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactBulkPreviewService.preview(eventId, dto, user);
  }

  @Get('recipient-roles')
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  @ApiOperation({ summary: 'List normalized recipient roles for an event' })
  @ApiOkResponse({ type: [RecipientRoleDto] })
  getRecipientRoles(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.findRecipientRoles(eventId, user);
  }

  @Post('recipient-roles')
  @RequirePermissions(PERMISSIONS.RECIPIENT_ROLES_MANAGE)
  @ApiOperation({ summary: 'Create a custom recipient role for an event' })
  @ApiCreatedResponse({ type: RecipientRoleDto })
  createRecipientRole(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateRecipientRoleDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.createRecipientRole(
      eventId,
      dto,
      user,
    );
  }

  @Patch('recipient-roles/:roleId')
  @RequirePermissions(PERMISSIONS.RECIPIENT_ROLES_MANAGE)
  @ApiOperation({ summary: 'Update a custom recipient role for an event' })
  @ApiOkResponse({ type: RecipientRoleDto })
  updateRecipientRole(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRecipientRoleDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.updateRecipientRole(
      eventId,
      roleId,
      dto,
      user,
    );
  }

  @Post('recipient-roles/:roleId/deactivate')
  @RequirePermissions(PERMISSIONS.RECIPIENT_ROLES_MANAGE)
  @ApiOperation({ summary: 'Deactivate a custom recipient role for an event' })
  @ApiOkResponse({ type: RecipientRoleDto })
  deactivateRecipientRole(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.deactivateRecipientRole(
      eventId,
      roleId,
      user,
    );
  }

  @Post('recipient-roles/:roleId/activate')
  @RequirePermissions(PERMISSIONS.RECIPIENT_ROLES_MANAGE)
  @ApiOperation({ summary: 'Activate a custom recipient role for an event' })
  @ApiOkResponse({ type: RecipientRoleDto })
  activateRecipientRole(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.activateRecipientRole(
      eventId,
      roleId,
      user,
    );
  }

  @Get('recipient-roles/:roleId/delete-preview')
  @RequirePermissions(PERMISSIONS.RECIPIENT_ROLES_MANAGE)
  @ApiOperation({
    summary:
      'Preview whether a recipient role can be safely deleted in the future',
  })
  @ApiOkResponse({ type: RecipientRoleDeletePreviewDto })
  previewRecipientRoleDelete(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.artifactRecipientsService.previewRecipientRoleDelete(
      eventId,
      roleId,
      user,
    );
  }
}
