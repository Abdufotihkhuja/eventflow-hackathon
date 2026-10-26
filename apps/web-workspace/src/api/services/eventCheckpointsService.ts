import { request } from '@api/apiClient'

import type {
  CheckpointAttendanceMatrix,
  CreateEventCheckpointRequest,
  EventCheckpoint,
  UpdateEventCheckpointRequest,
} from './eventCheckpoints.types'

const checkpointsUrl = (eventId: string) => `/v1/events/${eventId}/checkpoints`

export const eventCheckpointsService = {
  list: (eventId: string) =>
    request<EventCheckpoint[]>({
      method: 'GET',
      url: checkpointsUrl(eventId),
    }),

  matrix: (eventId: string) =>
    request<CheckpointAttendanceMatrix>({
      method: 'GET',
      url: `${checkpointsUrl(eventId)}/attendance`,
    }),

  create: (eventId: string, body: CreateEventCheckpointRequest) =>
    request<EventCheckpoint, CreateEventCheckpointRequest>({
      method: 'POST',
      url: checkpointsUrl(eventId),
      data: body,
    }),

  update: (
    eventId: string,
    checkpointId: string,
    body: UpdateEventCheckpointRequest
  ) =>
    request<EventCheckpoint, UpdateEventCheckpointRequest>({
      method: 'PATCH',
      url: `${checkpointsUrl(eventId)}/${checkpointId}`,
      data: body,
    }),

  remove: (eventId: string, checkpointId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${checkpointsUrl(eventId)}/${checkpointId}`,
    }),
} as const
