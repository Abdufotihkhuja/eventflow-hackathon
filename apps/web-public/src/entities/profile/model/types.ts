import type { BlogPost } from "@entities/blog";
import type { Event } from "@entities/event";

export interface ProfileInfo {
  id: string;
  name: string;
  role: string;
  company: string;
  location: string;
  timezone: string;
  email: string;
  telegram: string;
  calendarLink: string;
  avatarUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  bio: string;
  badges: string[];
  focusAreas: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}

export interface ProfileStatHighlight {
  id: string;
  label: string;
  value: string;
  description: string;
  trendLabel: string;
  trendValue: string;
  accent: "brand" | "neutral" | "accent";
}

export interface ProfileStatsSummary {
  highlights: ProfileStatHighlight[];
}

export type ProfileEventStatus = "upcoming" | "live" | "completed";

export interface ProfileEventSummary {
  id: string;
  role: "Организатор" | "Спикер" | "Куратор";
  status: ProfileEventStatus;
  progress: number;
  impactBadges: string[];
  kpis: Array<{
    label: string;
    value: string;
    hint?: string;
  }>;
  baseEvent: Event;
}

export type ProfileCalendarDayState =
  | "registered"
  | "hosting"
  | "travel"
  | "focus"
  | "free";

export interface ProfileCalendarDay {
  day: number;
  state?: ProfileCalendarDayState;
  eventIds?: string[];
}

export interface ProfileCalendarMonth {
  title: string;
  subtitle: string;
  weekDays: string[];
  weeks: Array<Array<ProfileCalendarDay | null>>;
}

export type ProfileCalendarEventStatus = "hosting" | "attending" | "mentoring";

export interface ProfileCalendarEvent {
  id: string;
  title: string;
  date: string;
  timeRange: string;
  location: string;
  status: ProfileCalendarEventStatus;
  description: string;
}

export interface ProfileCalendarData {
  month: ProfileCalendarMonth;
  legend: Array<{
    id: ProfileCalendarDayState;
    label: string;
  }>;
  events: ProfileCalendarEvent[];
}

export interface ProfileCertificate {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  credentialId: string;
  verificationUrl: string;
  hours: number;
  description: string;
  skills: string[];
  accent: string;
  icon: "shield" | "sparkles" | "bookmark";
}

export interface ProfileData {
  info: ProfileInfo;
  stats: ProfileStatsSummary;
  articles: BlogPost[];
  events: ProfileEventSummary[];
  calendar: ProfileCalendarData;
  certificates: ProfileCertificate[];
}
