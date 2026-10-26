import { ApiProperty } from '@nestjs/swagger';
import { RegistrationFileStatus, RegistrationFileUpload } from '@prisma/client';

/**
 * Safe representation of an uploaded registration file. Deliberately omits
 * `storedPath` and `organizationId` (internal/tenant fields).
 */
export class RegistrationFileEntity {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  questionId: string;

  @ApiProperty({ example: 'resume.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 102400 })
  size: number;

  @ApiProperty({ enum: RegistrationFileStatus })
  status: RegistrationFileStatus;

  @ApiProperty()
  uploadedAt: Date;

  constructor(file: RegistrationFileUpload) {
    this.id = file.id;
    this.questionId = file.questionId;
    this.originalName = file.originalName;
    this.mimeType = file.mimeType;
    this.size = file.size;
    this.status = file.status;
    this.uploadedAt = file.createdAt;
  }
}
