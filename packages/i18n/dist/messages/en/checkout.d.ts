/**
 * Public ticket checkout (P-15 over M-4). Copy authority:
 * docs/monetization/10-decisions.md — honest managed-payment tone: online
 * providers are an external gate (M-5/M-16), so an EventFlow operator
 * confirms payment manually; no fake card forms, no promises we can't keep.
 */
export declare const checkout: {
    readonly ticket: {
        readonly eyebrow: "Ticket";
        readonly regionAria: "Ticket payment";
        readonly intro: "This is a paid event — your spot is confirmed once the ticket is paid.";
        readonly amountLabel: "Amount due";
        readonly cta: "Request a ticket invoice";
        readonly creating: "Creating the invoice…";
        readonly pendingTitle: "Invoice created — awaiting payment";
        readonly holdUntil: "Seat held until {time}";
        readonly holdLeft: "about {minutes} min left";
        readonly managedNotice: "Online card payment will be available once providers are connected. For now an EventFlow operator confirms each payment — we will email you the payment details, and the status updates automatically after confirmation.";
        readonly refreshCta: "Refresh status";
        readonly refreshing: "Checking…";
        readonly paidTitle: "Ticket paid";
        readonly paidNote: "Your spot is confirmed. The e-ticket is available in your profile.";
        readonly expiredTitle: "The hold has expired";
        readonly expiredNote: "The previous invoice has expired. Create a new one to hold your spot again.";
        readonly retryCta: "Create a new invoice";
        readonly cancelledNote: "The previous order was cancelled. You can create a new invoice.";
        readonly refundedNote: "The payment for the previous order was refunded. You can create a new invoice.";
        readonly error: "Could not create the invoice. Please try again.";
        readonly via: {
            readonly notice: "Pay online via VIA (UZCARD / HUMO). You will be redirected to the secure VIA payment page; we never see your card details.";
            readonly payCta: "Pay online via VIA";
            readonly redirecting: "Opening the payment page…";
            readonly error: "Could not start the payment. Please try again.";
            readonly returnMetaTitle: "Payment verification";
            readonly returnMetaDescription: "Verifying your VIA ticket payment for an EventFlow event.";
            readonly verifying: "Verifying your payment…";
            readonly paidTitle: "Payment confirmed";
            readonly paidBody: "Your ticket is paid and your spot is confirmed. The e-ticket is available in your profile.";
            readonly openTicket: "Open my ticket";
            readonly myEvents: "My events";
            readonly pendingTitle: "Payment not confirmed yet";
            readonly pendingBody: "The bank may take a moment to process the payment. Check again in a minute — the status updates automatically once VIA confirms it.";
            readonly recheck: "Check again";
            readonly closedTitle: "The invoice is closed";
            readonly closedBody: "This payment invoice has expired or was cancelled. You can create a new one from the event page.";
            readonly invalidLinkTitle: "Invalid payment link";
            readonly invalidLinkBody: "This payment verification link is malformed or incomplete.";
            readonly browseEvents: "Browse events";
            readonly loginTitle: "Sign in to continue";
            readonly loginBody: "Sign in with the account you used for the registration to verify the payment.";
            readonly loginCta: "Sign in";
            readonly errorTitle: "Verification failed";
            readonly errorBody: "We could not verify the payment right now. Your money is safe — try again in a moment.";
        };
    };
};
//# sourceMappingURL=checkout.d.ts.map