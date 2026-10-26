export type ParticipantStatus =
  | "registered"
  | "confirmed"
  | "attended"
  | "cancelled";

export interface EventTicket {
  registrationId: string;
  qrCode: string;
  participantStatus: ParticipantStatus;
  event: {
    title: string;
    startDate: string;
    endDate?: string;
    format: "online" | "offline" | "hybrid";
    location?: string;
    imageUrl?: string;
    isLive?: boolean;
  };
  participant: {
    name: string;
    email: string;
  };
  registeredAt: string;
}
