/**
 * Промежуточные чекпоинты события.
 *
 * Чекпоинт — именованное окно времени [startsAt, endsAt), внутри которого
 * участника отмечают ровно один раз. Окна одного события не пересекаются, так
 * что в момент скана активен максимум один чекпоинт; если скан пришёлся мимо
 * всех окон, отметка засчитывается на день по прежним правилам.
 */

export type EventCheckpoint = {
  id: string
  eventId: string
  name: string
  /** ISO 8601 */
  startsAt: string
  /** ISO 8601 */
  endsAt: string
  /** Сколько участников уже отмечено в этом чекпоинте. */
  checkedInCount: number
  createdAt: string
  updatedAt: string
}

export type CreateEventCheckpointRequest = {
  name: string
  startsAt: string
  endsAt: string
}

export type UpdateEventCheckpointRequest = {
  name?: string
  startsAt?: string
  endsAt?: string
}

export type CheckpointMatrixParticipant = {
  registrationId: string
  userId: string
  fullName: string
  email: string
  /** id чекпоинтов, в которых участник отмечен. */
  checkpointIds: string[]
  attendedCount: number
}

/** GET /v1/events/:eventId/checkpoints/attendance */
export type CheckpointAttendanceMatrix = {
  checkpoints: EventCheckpoint[]
  participants: CheckpointMatrixParticipant[]
  totalCheckpoints: number
  totalParticipants: number
}
