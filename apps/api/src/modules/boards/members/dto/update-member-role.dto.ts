import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { BoardRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: BoardRole })
  @IsEnum(BoardRole)
  @IsNotEmpty()
  role: BoardRole;
}
