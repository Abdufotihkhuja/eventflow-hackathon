import { request } from '@api/apiClient'

import type {
  CreateEventRoomRequest,
  EventRoom,
  UpdateEventRoomRequest,
} from './eventRooms.types'

const roomsUrl = (eventId: string) => `/v1/events/${eventId}/rooms`

export const eventRoomsService = {
  list: (eventId: string) =>
    request<EventRoom[]>({
      method: 'GET',
      url: roomsUrl(eventId),
    }),

  create: (eventId: string, body: CreateEventRoomRequest) =>
    request<EventRoom, CreateEventRoomRequest>({
      method: 'POST',
      url: roomsUrl(eventId),
      data: body,
    }),

  update: (eventId: string, roomId: string, body: UpdateEventRoomRequest) =>
    request<EventRoom, UpdateEventRoomRequest>({
      method: 'PATCH',
      url: `${roomsUrl(eventId)}/${roomId}`,
      data: body,
    }),

  remove: (eventId: string, roomId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${roomsUrl(eventId)}/${roomId}`,
    }),
} as const
