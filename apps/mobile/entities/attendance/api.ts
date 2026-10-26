/**
 * Per-event attendance (org session): the day-by-day check-in report and its
 * summary. Both live behind `PERMISSIONS.ATTENDANCE_READ`, so they run on the
 * workspace token.
 *
 * Wrapper-free through `apiTransport` for the same reason as `uploadCoverImage`
 * and `translateFields` — the generated SDK exposes only `attendance.checkIn`,
 * and the contract packages are frozen.
 *
 * CONTRACT NOTE: an attendance record is a CHECK-IN, nothing more. The API has
 * no present / late / excused / absent state, so screens must not invent one —
 * a person is either in the day's report or they are not.
 */
import { useQuery } from "@tanstack/react-query";

import { apiTransport } from "@shared/api";

export interface AttendanceAttendee {
  userId: string;
  /** Server-composed "First Last", or its "Без имени" fallback. */
  userName: string;
  userEmail: string;
  checkInAt: string;
}

/** One day of the event, with everyone who checked in that day. */
export interface AttendanceDay {
  /** `YYYY-MM-DD`. */
  date: string;
  total: number;
  attendees: AttendanceAttendee[];
}

export interface AttendanceStats {
  totalRegistrations: number;
  totalAttended: number;
  attendanceByDate: { date: string; count: number }[];
}

export const attendanceKeys = {
  all: ["attendance"] as const,
  report: (eventId: string) => ["attendance", "report", eventId] as const,
  stats: (eventId: string) => ["attendance", "stats", eventId] as const,
  landingQr: (eventId: string) => ["attendance", "landing-qr", eventId] as const,
};

/**
 * The event's "one QR for everyone" (design 4.6b · «QR-код события»).
 *
 * It encodes a link to the public check-in page, NOT a ticket: the organizer
 * shows it at the door and each attendee scans it with their own phone and
 * self-checks-in. That is the opposite direction from `scan.tsx`, where the
 * organizer scans an attendee's ticket — both exist because a queue moves
 * faster when the crowd does the scanning.
 */
export function useCheckInLandingQrQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.landingQr(eventId ?? ""),
    queryFn: async (): Promise<string | null> => {
      const res = await apiTransport<{ qrCode?: string }>({
        method: "GET",
        url: `/api/v1/events/${eventId}/attendance/check-in-landing-qr`,
      });
      return res?.qrCode ?? null;
    },
    enabled: Boolean(eventId),
    // The QR is stable for the life of the event — no need to refetch it.
    staleTime: Infinity,
  });
}

export function useAttendanceReportQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.report(eventId ?? ""),
    queryFn: async (): Promise<AttendanceDay[]> => {
      const res = await apiTransport<AttendanceDay[]>({
        method: "GET",
        url: `/api/v1/events/${eventId}/attendance`,
      });
      return Array.isArray(res) ? res : [];
    },
    enabled: Boolean(eventId),
  });
}

export function useAttendanceStatsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.stats(eventId ?? ""),
    queryFn: async (): Promise<AttendanceStats> => {
      const res = await apiTransport<Partial<AttendanceStats>>({
        method: "GET",
        url: `/api/v1/events/${eventId}/attendance/stats`,
      });
      return {
        totalRegistrations: res?.totalRegistrations ?? 0,
        totalAttended: res?.totalAttended ?? 0,
        attendanceByDate: res?.attendanceByDate ?? [],
      };
    },
    enabled: Boolean(eventId),
  });
}
