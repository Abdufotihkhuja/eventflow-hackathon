import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppBuild, AppBuildPlatform } from '@prisma/client';

/**
 * Safe representation of an app build artifact. Deliberately omits
 * `storedPath` (internal storage detail).
 */
export class AppBuildEntity {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: AppBuildPlatform })
  platform: AppBuildPlatform;

  @ApiProperty({ example: '0.1.0 (42)' })
  version: string;

  @ApiPropertyOptional({ nullable: true })
  notes: string | null;

  @ApiProperty({ example: 'eventflow-0.1.0.apk' })
  originalName: string;

  @ApiProperty({ example: 'application/vnd.android.package-archive' })
  mimeType: string;

  @ApiProperty({ example: 104857600 })
  size: number;

  @ApiPropertyOptional({ nullable: true, example: 'admin@eventflow.uz' })
  uploadedByEmail: string | null;

  @ApiProperty()
  createdAt: Date;

  constructor(build: AppBuild) {
    this.id = build.id;
    this.platform = build.platform;
    this.version = build.version;
    this.notes = build.notes;
    this.originalName = build.originalName;
    this.mimeType = build.mimeType;
    this.size = build.size;
    this.uploadedByEmail = build.uploadedByEmail;
    this.createdAt = build.createdAt;
  }
}
