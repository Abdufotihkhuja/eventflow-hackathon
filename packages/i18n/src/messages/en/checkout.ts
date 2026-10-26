/**
 * Public ticket checkout (P-15 over M-4). Copy authority:
 * docs/monetization/10-decisions.md — honest managed-payment tone: online
 * providers are an external gate (M-5/M-16), so an EventFlow operator
 * confirms payment manually; no fake card forms, no promises we can't keep.
 */
export const checkout = {
  ticket: {
    eyebrow: "Ticket",
    regionAria: "Ticket payment",
    intro:
      "This is a paid event — your spot is confirmed once the ticket is paid.",
    amountLabel: "Amount due",
    cta: "Request a ticket invoice",
    creating: "Creating the invoice…",
    pendingTitle: "Invoice created — awaiting payment",
    holdUntil: "Seat held until {time}",
    holdLeft: "about {minutes} min left",
    managedNotice:
      "Online card payment will be available once providers are connected. For now an EventFlow operator confirms each payment — we will email you the payment details, and the status updates automatically after confirmation.",
    refreshCta: "Refresh status",
    refreshing: "Checking…",
    paidTitle: "Ticket paid",
    paidNote: "Your spot is confirmed. The e-ticket is available in your profile.",
    expiredTitle: "The hold has expired",
    expiredNote:
      "The previous invoice has expired. Create a new one to hold your spot again.",
    retryCta: "Create a new invoice",
    cancelledNote: "The previous order was cancelled. You can create a new invoice.",
    refundedNote:
      "The payment for the previous order was refunded. You can create a new invoice.",
    error: "Could not create the invoice. Please try again.",
    via: {
      notice:
        "Pay online via VIA (UZCARD / HUMO). You will be redirected to the secure VIA payment page; we never see your card details.",
      payCta: "Pay online via VIA",
      redirecting: "Opening the payment page…",
      error: "Could not start the payment. Please try again.",
      returnMetaTitle: "Payment verification",
      returnMetaDescription:
        "Verifying your VIA ticket payment for an EventFlow event.",
      verifying: "Verifying your payment…",
      paidTitle: "Payment confirmed",
      paidBody:
        "Your ticket is paid and your spot is confirmed. The e-ticket is available in your profile.",
      openTicket: "Open my ticket",
      myEvents: "My events",
      pendingTitle: "Payment not confirmed yet",
      pendingBody:
        "The bank may take a moment to process the payment. Check again in a minute — the status updates automatically once VIA confirms it.",
      recheck: "Check again",
      closedTitle: "The invoice is closed",
      closedBody:
        "This payment invoice has expired or was cancelled. You can create a new one from the event page.",
      invalidLinkTitle: "Invalid payment link",
      invalidLinkBody:
        "This payment verification link is malformed or incomplete.",
      browseEvents: "Browse events",
      loginTitle: "Sign in to continue",
      loginBody:
        "Sign in with the account you used for the registration to verify the payment.",
      loginCta: "Sign in",
      errorTitle: "Verification failed",
      errorBody:
        "We could not verify the payment right now. Your money is safe — try again in a moment.",
    },
  },
} as const;
