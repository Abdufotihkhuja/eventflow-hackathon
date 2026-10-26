import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';
import { FollowersRepository } from './followers.repository';

@Module({
  imports: [PrismaModule],
  controllers: [FollowersController],
  providers: [FollowersService, FollowersRepository],
  exports: [FollowersService],
})
export class FollowersModule {}
