import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { BoardRole } from '@prisma/client';

export class AddBoardMemberDto {
  @ApiProperty({ description: 'ID участника организации' })
  @IsUUID()
  @IsNotEmpty()
  memberId: string;

  @ApiPropertyOptional({ enum: BoardRole, default: BoardRole.MEMBER })
  @IsEnum(BoardRole)
  @IsOptional()
  role?: BoardRole;
}
