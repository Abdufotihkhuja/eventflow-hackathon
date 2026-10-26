import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CheckInDto {
  @ApiProperty({ example: 'uuid-qr-code', description: 'QR-код регистрации' })
  @IsString()
  @IsNotEmpty()
  qrCode: string;
}
