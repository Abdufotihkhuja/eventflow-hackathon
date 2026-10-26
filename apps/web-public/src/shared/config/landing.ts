import { BriefcaseBusiness, Users } from "lucide-react";

import { t as fallbackT } from "@eventflow/i18n";

import type { LucideIcon } from "lucide-react";
import type { Translator } from "@eventflow/i18n";

/** Короткий текст — на экран, srOnly — для скринридеров и SEO */
export interface LandingAudienceHighlight {
  label: string;
  srOnly?: string;
}

export interface LandingAudience {
  id: string;
  title: string;
  description: string;
  highlights: LandingAudienceHighlight[];
  icon: LucideIcon;
}

export const getLandingAudiences = (t: Translator = fallbackT): LandingAudience[] => [
  {
    id: "attendees",
    title: t("public.landing.audiences.attendees.title"),
    description: t("public.landing.audiences.attendees.description"),
    highlights: [
      { label: t("public.landing.audiences.attendees.highlights.interests"), srOnly: t("public.landing.audiences.attendees.highlights.interestsSr") },
      { label: t("public.landing.audiences.attendees.highlights.ticket"), srOnly: t("public.landing.audiences.attendees.highlights.ticketSr") },
      { label: t("public.landing.audiences.attendees.highlights.calendar"), srOnly: t("public.landing.audiences.attendees.highlights.calendarSr") },
      { label: t("public.landing.audiences.attendees.highlights.fastEntry"), srOnly: t("public.landing.audiences.attendees.highlights.fastEntrySr") },
      { label: t("public.landing.audiences.attendees.highlights.share"), srOnly: t("public.landing.audiences.attendees.highlights.shareSr") },
      { label: t("public.landing.audiences.attendees.highlights.certificates"), srOnly: t("public.landing.audiences.attendees.highlights.certificatesSr") },
    ],
    icon: Users,
  },
  {
    id: "organizers",
    title: t("public.landing.audiences.organizers.title"),
    description: t("public.landing.audiences.organizers.description"),
    highlights: [
      { label: t("public.landing.audiences.organizers.highlights.dashboard"), srOnly: t("public.landing.audiences.organizers.highlights.dashboardSr") },
      { label: t("public.landing.audiences.organizers.highlights.checkin"), srOnly: t("public.landing.audiences.organizers.highlights.checkinSr") },
      { label: t("public.landing.audiences.organizers.highlights.finances"), srOnly: t("public.landing.audiences.organizers.highlights.financesSr") },
      { label: t("public.landing.audiences.organizers.highlights.export"), srOnly: t("public.landing.audiences.organizers.highlights.exportSr") },
      { label: t("public.landing.audiences.organizers.highlights.notifications"), srOnly: t("public.landing.audiences.organizers.highlights.notificationsSr") },
      { label: t("public.landing.audiences.organizers.highlights.blog"), srOnly: t("public.landing.audiences.organizers.highlights.blogSr") },
    ],
    icon: BriefcaseBusiness,
  },
];
