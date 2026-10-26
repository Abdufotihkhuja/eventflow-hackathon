import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class VerifyCertificateDto {
  @ApiPropertyOptional({ description: 'ID сертификата' })
  @IsOptional()
  @IsUUID('4')
  certificateId?: string;

  @ApiPropertyOptional({ description: 'Код верификации (из QR)' })
  @IsOptional()
  @IsString()
  code?: string;
}
