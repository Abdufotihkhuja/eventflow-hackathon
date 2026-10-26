import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import {
  SpeakersController,
  SpeakerInvitationsController,
} from './speakers/speakers.controller';
import { SpeakersService } from './speakers/speakers.service';
import { SpeakersRepository } from './speakers/speakers.repository';
import { AgendaController } from './agenda/agenda.controller';
import { AgendaService } from './agenda/agenda.service';
import { AgendaRepository } from './agenda/agenda.repository';
import { MaterialsController } from './agenda/materials.controller';
import { MaterialsService } from './agenda/materials.service';
import { MaterialsRepository } from './agenda/materials.repository';
import { QuestionsController } from './questions/questions.controller';
import { QuestionsService } from './questions/questions.service';
import { QuestionsRepository } from './questions/questions.repository';
import { CommentsController } from './comments/comments.controller';
import { CommentsService } from './comments/comments.service';
import { CommentsRepository } from './comments/comments.repository';
import { SavedEventsService } from './saved/saved-events.service';
import { SavedEventsRepository } from './saved/saved-events.repository';
import {
  TagsController,
  OrganizationTagsController,
} from './tags/tags.controller';
import { TagsService } from './tags/tags.service';
import { TagsRepository } from './tags/tags.repository';
import { ArtifactRecipientsModule } from './artifact-recipients/artifact-recipients.module';
import { EventRoomsModule } from './rooms/event-rooms.module';
import { EventInvitationsController } from './invitations/event-invitations.controller';
import { EventInvitationsService } from './invitations/event-invitations.service';
import { EventCheckpointsModule } from './checkpoints/event-checkpoints.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { PlacesModule } from '../places/places.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    BillingModule,
    PrismaModule,
    MailModule,
    PlacesModule,
    StorageModule,
    ArtifactRecipientsModule,
    EventRoomsModule,
    EventCheckpointsModule,
  ],
  controllers: [
    EventsController,
    SpeakersController,
    SpeakerInvitationsController,
    AgendaController,
    MaterialsController,
    QuestionsController,
    CommentsController,
    TagsController,
    OrganizationTagsController,
    EventInvitationsController,
  ],
  providers: [
    EventsService,
    EventsRepository,
    SpeakersService,
    SpeakersRepository,
    AgendaService,
    AgendaRepository,
    MaterialsService,
    MaterialsRepository,
    QuestionsService,
    QuestionsRepository,
    CommentsService,
    CommentsRepository,
    SavedEventsService,
    SavedEventsRepository,
    TagsService,
    TagsRepository,
    EventInvitationsService,
  ],
  exports: [
    EventsService,
    EventsRepository,
    SpeakersService,
    AgendaService,
    MaterialsService,
    QuestionsService,
    CommentsService,
    SavedEventsService,
    TagsService,
    ArtifactRecipientsModule,
    EventRoomsModule,
    EventCheckpointsModule,
  ],
})
export class EventsModule {}
