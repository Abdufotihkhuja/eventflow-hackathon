import { CalmEventDetailsView } from "./calm-event-details-view";

import type { EventDetail } from "@entities/event";

export interface EventDetailsPageProps {
  slug: string;
  initialEvent: EventDetail;
  inviteCode?: string;
}

export function EventDetailsPage({
  slug,
  initialEvent,
  inviteCode,
}: EventDetailsPageProps): React.ReactNode {
  return (
    <CalmEventDetailsView
      slug={slug}
      initialEvent={initialEvent}
      inviteCode={inviteCode}
    />
  );
}
