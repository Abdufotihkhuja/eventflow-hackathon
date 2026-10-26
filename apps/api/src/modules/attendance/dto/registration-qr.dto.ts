import { ApiProperty } from '@nestjs/swagger';

/**
 * QR-код регистрации. `qrCode` — data-URL c base64 PNG.
 */
export class RegistrationQrDto {
  @ApiProperty({
    description: 'QR-код в виде data-URL (base64 PNG)',
    example: 'data:image/png;base64,iVBORw0KGgo...',
  })
  qrCode!: string;
}
