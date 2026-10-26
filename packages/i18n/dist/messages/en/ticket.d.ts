export declare const ticket: {
    readonly label: {
        readonly eTicket: "E-ticket";
        readonly eventInfo: "Event information";
        readonly date: "Date";
        readonly time: "Time";
        readonly location: "Location";
        readonly locationOnline: "Online";
        readonly format: "Format";
        readonly attendee: "Attendee";
        readonly number: "Ticket #";
        readonly qrTitle: "Entry QR";
    };
    readonly format: {
        readonly online: "Online";
        readonly offline: "Offline";
        readonly hybrid: "Hybrid";
    };
    readonly qr: {
        readonly instruction: "Show this QR at the entrance";
        readonly checkedIn: "You are already checked in";
        readonly used: "Ticket already used";
        readonly usedPlaceholder: "Ticket already used";
    };
    readonly security: {
        readonly line: "Secure · Unique ticket · Non-transferable";
    };
    readonly poweredBy: "Organized via";
    readonly actions: {
        readonly download: "Download PDF";
        readonly downloading: "Downloading…";
        readonly downloadError: "Failed to download ticket";
        readonly addToCalendar: "Add to calendar";
        readonly share: "Share";
        readonly shareText: "My ticket for «{event}»";
        readonly shareError: "Failed to share";
        readonly linkCopied: "Link copied";
        readonly copy: "Copy ticket number";
        readonly copyAria: "Copy ticket number {number}";
        readonly copySuccess: "Ticket number copied";
        readonly copyError: "Failed to copy";
        readonly openFullPage: "Open full-page ticket";
    };
    readonly empty: {
        readonly pendingTitle: "Ticket under review";
        readonly pendingBody: "Your registration is awaiting organizer approval. The ticket activates as soon as it is confirmed.";
        readonly cancelledTitle: "Ticket cancelled";
        readonly cancelledBody: "This registration has been cancelled. The QR is no longer valid.";
        readonly notRegisteredTitle: "Ticket not issued";
        readonly notRegisteredBody: "We couldn't find an active registration for this event in your account.";
        readonly unknownTitle: "Ticket unavailable";
        readonly unknownBody: "Could not load the ticket. Please try again later.";
        readonly backToEvents: "Back to my events";
        readonly primaryActionDefault: "Back to my events";
    };
    readonly aria: {
        readonly cardLabel: "E-ticket for «{event}», number {number}";
        readonly qrTitle: "Entry QR for ticket {number}";
    };
};
//# sourceMappingURL=ticket.d.ts.map