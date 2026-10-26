export const billing = {
  eyebrow: "Organization",
  title: "Billing & subscription",
  description:
    "Your plan, pricing and payment status. Eventflow is free to start — you only pay a per-ticket commission.",
  tabs: {
    overview: "Overview",
    plans: "Plans",
    addons: "Add-ons",
    invoices: "Invoices",
  },
  manage: {
    viewOnlyTooltip:
      "You can view billing, but sending requests needs the “Manage billing” permission — ask your organization owner.",
  },
  common: {
    loadErrorTitle: "Couldn't load billing data",
    loadErrorBody: "Check your connection and try again.",
    retry: "Retry",
  },
  tiers: {
    START: "Start",
    PRO: "Pro",
    EXCLUSIVE: "Exclusive",
  },
  notEnabled: {
    title: "The plan system isn't switched on yet",
    body: "EventFlow currently runs without plan enforcement: no limits apply and nothing is charged. The details below describe what will take effect once the plan system goes live.",
  },
  suspended: {
    title: "Organization suspended",
    body: "Your organization has been suspended by the EventFlow team: the workspace is read-only and new registrations are paused. Contact support@eventflow.uz.",
  },
  managedNotice: {
    title: "Plans are managed by the Eventflow team",
    body: "Online payments and self-service upgrades aren't enabled yet. Plan changes are arranged with the Eventflow team — send a request and we'll contact you.",
  },
  overview: {
    currentPlan: "Current plan",
    currentBadge: "Current",
    freeBadge: "Free",
    startSummary:
      "Every organization starts on the Start plan. There's no monthly fee — you only pay a commission on each ticket you sell.",
    packSummary:
      "Your plan runs as a 90-day pack. Renewal starts a new period with a fresh credit grant; unused credits don't carry over.",
    sourcePurchase: "Active pack",
    sourceDefault: "Default plan",
    commissionLabel: "Commission",
    commissionValue: "{percent}% per ticket",
    commissionTicketsNote: "Applies once ticket sales launch on the platform.",
    commissionOverrideHint: "Custom rate for your organization",
    packTitle: "Event pack",
    activatedOn: "Activated on {date}",
    awaitingActivation: "Awaiting activation",
    creditsLabel: "Event credits",
    creditsValue: "{remaining} of {granted} left",
    expiresOn: "Valid until {date}",
    expired: "Period ended",
    noExpiry: "No end date",
    renewCta: "Renew plan",
    renewResetNote:
      "Renewing starts a new 90-day period with a fresh credit grant. Unused credits don't carry over.",
    comparePlans: "Compare plans",
    paymentTitle: "Payment method",
    paymentNotEnabled: "Online payments aren't enabled yet",
    paymentNotEnabledBody:
      "Card and local payment providers (Click, Payme) aren't connected. Plan activations and payments are arranged manually with the Eventflow team.",
  },
  plans: {
    intro:
      "What each plan includes — live from the catalog. Start is free; paid plans are 90-day packs with event credits, team seats and AI tools.",
    current: "Current plan",
    freePrice: "Free",
    pricePeriod: "per {days}",
    usdAnchorNote:
      "Reference price. Billing is in UZS — the final price is confirmed by the EventFlow team.",
    managedRow: "Activated by the EventFlow team",
    requestCta: "Request this plan",
    requestAria: "Request the {plan} plan",
    pendingBadge: "Request sent",
    pendingNotice:
      "You have a pending plan request from {date}. The EventFlow team will contact you within 2 business days.",
    featureCommission: "{percent}% commission per ticket",
    featureGenerationsMonth: "{count} per month",
    featureGenerationsPack: "{count} per pack period",
    featureAiMinutes: "{count} per month",
    featureTaskBoard: "Task Board",
    featureQrArrival: "QR check-in (arrival only)",
    featureQrExtended: "QR check-in (extended modes)",
    featureStatsBasic: "Basic statistics",
    featureStatsForecast: "Statistics & forecasting",
    featureStatsSla: "Statistics, forecasting & SLA",
  },
  addons: {
    description:
      "Coin packs and promotion products on top of any plan. Requests are processed by the EventFlow team.",
    unavailable: "Not available yet",
    comingSoon: "Coming soon",
    requestCta: "Request",
    usdAnchorNote: "billed in UZS, price to be confirmed",
    units: {
      PER_WEEK: "per week",
      PER_CAMPAIGN: "per campaign",
      PER_MESSAGE: "per message",
    },
    skus: {
      COIN_AI_100MIN: {
        title: "AI minutes — 100",
        description: "A coin pack of 100 AI voice-agent minutes. Coins don't expire.",
      },
      COIN_GEN_100: {
        title: "Generations — 100",
        description: "A coin pack of 100 image and certificate generations. Coins don't expire.",
      },
      AD_FEATURED_WEEK: {
        title: "Featured placement",
        description: "Your event in the featured block of the public catalog.",
      },
      AD_EMAIL_CAMPAIGN: {
        title: "Email campaign",
        description: "An email campaign to your event participants.",
      },
      AD_SMS_CAMPAIGN: {
        title: "SMS campaign",
        description: "SMS campaigns will be available once an SMS provider is connected.",
      },
    },
  },
  chip: {
    aria: "Plan & billing — open the billing page",
    credits: "{remaining}/{granted} credits",
    expiresIn: "expires in {days} d.",
  },
  wallet: {
    title: "Coin wallet",
    drainOrder: "Coins are spent after your plan quota and never expire.",
    aiBalance: "AI minutes",
    genBalance: "Generations",
    minutesShort: "min",
    buyPack: "Buy a pack",
    historyTitle: "Coin history",
    colDate: "Date",
    colKind: "Type",
    colMetric: "Metric",
    colDelta: "Change",
    colBalance: "Balance",
    colReason: "Note",
    kinds: {
      PURCHASE: "Purchase",
      COMP_GRANT: "Grant",
      CONSUMPTION: "Spend",
      REVERSAL: "Reversal",
    },
    metrics: {
      AI_SECONDS: "AI minutes",
      GENERATION_UNITS: "Generations",
    },
    emptyTitle: "No ledger entries yet",
    emptyBody: "Coin pack purchases, grants and spending will appear here.",
  },
  usage: {
    title: "Usage",
    subtitle: "Live counters for your plan's quota windows.",
    windowMonth: "this month",
    windowPack: "per pack period",
    generationsLabel: "Generations (certificates & badges)",
    aiMinutesLabel: "AI minutes",
    aiComingSoonTitle: "AI agent — coming soon",
    aiComingSoonBody:
      "Included in your plan. Minutes will activate when the voice agent launches.",
    seatsLabel: "Team seats",
    manageTeam: "Manage team",
    unlimited: "No limit",
    valueOf: "{used} / {limit}",
    atLimit: "Limit reached",
    upgradeCta: "Upgrade plan",
  },
  requestDialog: {
    titleUpgrade: "Request the {plan} plan",
    titleRenew: "Renew the {plan} plan",
    titleAddon: "Request: {title}",
    bodyPlan:
      "We'll register your request and the EventFlow team will contact you to arrange payment and activation. Nothing is charged automatically.",
    renewResetNote:
      "Renewal starts a new 90-day period with a fresh credit grant — unused credits are reset, they don't carry over.",
    confirm: "Send request",
    cancel: "Cancel",
    close: "Close",
    successTitle: "Request sent",
    successBody: "The EventFlow team will contact you within 2 business days.",
    duplicateTitle: "There's already a pending request",
    duplicateBody:
      "Your request from {date} is in the queue — the EventFlow team will contact you within 2 business days.",
    duplicateBodyNoDate:
      "Your earlier request is in the queue — the EventFlow team will contact you within 2 business days.",
    errorBody: "Couldn't send the request. Try again.",
  },
  invoices: {
    title: "Invoices",
    description: "Requests, orders and receipts for paid plans and add-ons appear here.",
    emptyTitle: "No invoices yet",
    emptyBody:
      "There's nothing billed yet. Your plan and add-on requests, orders and receipts will appear here.",
    historyTitle: "Requests & orders",
    colDate: "Date",
    colKind: "Type",
    colStatus: "Status",
    colAmount: "Amount",
    kinds: {
      PLAN: "Plan",
      COIN_PACK: "Coin pack",
      ADVERTISING: "Advertising",
      TICKET_SALE: "Ticket sales",
    },
    statuses: {
      REQUESTED: "Requested",
      PENDING_PAYMENT: "Awaiting payment",
      PAID: "Paid",
      CANCELLED: "Cancelled",
      EXPIRED: "Expired",
      REFUNDED: "Refunded",
    },
  },
  seats: {
    chip: "{used} of {seats} taken",
    requestUpgrade: "Request an upgrade",
  },
  publish: {
    willConsume: "Publishing will use 1 event credit — {left} of {granted} will remain.",
    lastCredit:
      "This is your last event credit: once it's spent, the organization moves to Start terms until you renew the pack.",
    noCredits:
      "Your pack's event credits are used up — new publications run on Start terms until you renew.",
    republishFree: "Re-publishing the same event doesn't use a credit.",
  },
  gate: {
    boardsLockedTitle: "Task Board isn't part of your plan",
    boardsLockedBody:
      "Kanban boards for planning event work — columns, tasks, assignees and deadlines. Included in the Pro and Exclusive plans.",
    boardsReadOnlyTitle: "Boards are read-only on your plan",
    boardsReadOnlyBody:
      "Viewing and export stay available — nothing is deleted. To edit boards again, upgrade your plan.",
  },
  errors: {
    quotaTitle: "Plan limit reached",
    quotaGenerationsBody: "Generations used: {used} of {limit} {window}.",
    quotaAiBody: "AI minutes used: {used} of {limit} {window}.",
    capStaffTitle: "Team seat limit reached",
    capStaffBody:
      "Your plan includes {seats} (members and pending invites both take a seat); occupied now: {current}.",
    capParticipantsTitle: "Participant limit reached",
    capParticipantsBody: "Your plan allows {participants}.",
    creditsTitle: "Event credits used up",
    creditsBody:
      "All {granted} credits of your pack are spent. Renew or upgrade the plan to publish more events.",
    featureTitle: "Not included in your plan",
    featureTaskBoardBody: "Task Board isn't included in the {tier} plan.",
    featureStatsBody: "Advanced statistics aren't included in the {tier} plan.",
    featureQrBody: "Extended QR modes aren't included in the {tier} plan.",
    suspendedTitle: "Organization suspended",
    suspendedBody:
      "Your organization is suspended by the EventFlow team. Contact support@eventflow.uz.",
    upgradeCta: "View plans",
    dismiss: "Dismiss",
  },
  settingsLink: {
    title: "Billing & subscription",
    description: "View your plan, pricing and payment status.",
    cta: "Open billing",
  },
} as const;
