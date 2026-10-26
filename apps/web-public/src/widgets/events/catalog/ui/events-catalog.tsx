import { useT } from "@eventflow/i18n/react";
import { EventCard } from "@entities/event";
import { PageSection, SectionHeading, Surface } from "@shared/ui";

import type { Event } from "@entities/event";

export interface EventsCatalogProps {
  events: Event[];
  searchTerm: string;
  /** Заголовок каталога */
  title?: string;
  /** Описание каталога для пустого состояния */
  emptyStateDescription?: string;
}

export function EventsCatalog({
  events,
  searchTerm,
  title,
  emptyStateDescription,
}: EventsCatalogProps): React.ReactNode {
  const t = useT();
  const isEmpty = events.length === 0;

  const defaultEmptyDescription = searchTerm
    ? t("public.events.emptySearch", { query: searchTerm })
    : t("public.events.emptyDefault");

  return (
    <PageSection
      id="events"
      className="overflow-hidden pt-12 pb-24"
      decorations={
        <div className="pointer-events-none absolute inset-x-0 -top-32 h-40 bg-linear-to-b from-background/0 via-ember-50/40 to-background" />
      }
      containerClassName="flex flex-col gap-12"
    >
      <SectionHeading
        align="center"
        eyebrow={t("public.events.catalog")}
        title={title ?? t("public.events.all")}
      />

      {isEmpty ? (
        <Surface
          variant="glassStrong"
          radius="4xl"
          padding="lg"
          className="flex flex-col items-center gap-6 px-8 py-16 text-center"
        >
          <SectionHeading
            align="center"
            title={t("public.events.nothingFound")}
            description={emptyStateDescription ?? defaultEmptyDescription}
          />
        </Surface>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </PageSection>
  );
}
