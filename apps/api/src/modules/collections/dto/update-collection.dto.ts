import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCollectionDto } from './create-collection.dto';

export class UpdateCollectionDto extends PartialType(
  OmitType(CreateCollectionDto, ['eventIds'] as const),
) {}
