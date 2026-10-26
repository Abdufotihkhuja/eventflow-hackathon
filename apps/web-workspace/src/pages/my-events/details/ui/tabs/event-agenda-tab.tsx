import { useSpeakersQuery } from '@features/events'
import { AgendaManager } from '@features/events'
import { useT } from '@eventflow/i18n/react'
import { Loader2 } from 'lucide-react'

type EventAgendaTabProps = {
  eventId: string
  startDate: string
  endDate: string
}

export function EventAgendaTab({ eventId, startDate, endDate }: EventAgendaTabProps) {
  const t = useT()
  const { data: speakersData, isLoading } = useSpeakersQuery(eventId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        {t('events.agenda.loading')}
      </div>
    )
  }

  // Получаем спикеров из отдельного запроса
  const speakers = Array.isArray(speakersData)
    ? speakersData.map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName }))
    : (speakersData?.speakers || []).map(s => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
      }))

  return (
    <AgendaManager eventId={eventId} startDate={startDate} endDate={endDate} speakers={speakers} />
  )
}
