export declare const billing: {
    readonly eyebrow: "Organization";
    readonly title: "Billing & subscription";
    readonly description: "Your plan, pricing and payment status. Eventflow is free to start — you only pay a per-ticket commission.";
    readonly tabs: {
        readonly overview: "Overview";
        readonly plans: "Plans";
        readonly addons: "Add-ons";
        readonly invoices: "Invoices";
    };
    readonly manage: {
        readonly viewOnlyTooltip: "You can view billing, but sending requests needs the “Manage billing” permission — ask your organization owner.";
    };
    readonly common: {
        readonly loadErrorTitle: "Couldn't load billing data";
        readonly loadErrorBody: "Check your connection and try again.";
        readonly retry: "Retry";
    };
    readonly tiers: {
        readonly START: "Start";
        readonly PRO: "Pro";
        readonly EXCLUSIVE: "Exclusive";
    };
    readonly notEnabled: {
        readonly title: "The plan system isn't switched on yet";
        readonly body: "EventFlow currently runs without plan enforcement: no limits apply and nothing is charged. The details below describe what will take effect once the plan system goes live.";
    };
    readonly suspended: {
        readonly title: "Organization suspended";
        readonly body: "Your organization has been suspended by the EventFlow team: the workspace is read-only and new registrations are paused. Contact support@eventflow.uz.";
    };
    readonly managedNotice: {
        readonly title: "Plans are managed by the Eventflow team";
        readonly body: "Online payments and self-service upgrades aren't enabled yet. Plan changes are arranged with the Eventflow team — send a request and we'll contact you.";
    };
    readonly overview: {
        readonly currentPlan: "Current plan";
        readonly currentBadge: "Current";
        readonly freeBadge: "Free";
        readonly startSummary: "Every organization starts on the Start plan. There's no monthly fee — you only pay a commission on each ticket you sell.";
        readonly packSummary: "Your plan runs as a 90-day pack. Renewal starts a new period with a fresh credit grant; unused credits don't carry over.";
        readonly sourcePurchase: "Active pack";
        readonly sourceDefault: "Default plan";
        readonly commissionLabel: "Commission";
        readonly commissionValue: "{percent}% per ticket";
        readonly commissionTicketsNote: "Applies once ticket sales launch on the platform.";
        readonly commissionOverrideHint: "Custom rate for your organization";
        readonly packTitle: "Event pack";
        readonly activatedOn: "Activated on {date}";
        readonly awaitingActivation: "Awaiting activation";
        readonly creditsLabel: "Event credits";
        readonly creditsValue: "{remaining} of {granted} left";
        readonly expiresOn: "Valid until {date}";
        readonly expired: "Period ended";
        readonly noExpiry: "No end date";
        readonly renewCta: "Renew plan";
        readonly renewResetNote: "Renewing starts a new 90-day period with a fresh credit grant. Unused credits don't carry over.";
        readonly comparePlans: "Compare plans";
        readonly paymentTitle: "Payment method";
        readonly paymentNotEnabled: "Online payments aren't enabled yet";
        readonly paymentNotEnabledBody: "Card and local payment providers (Click, Payme) aren't connected. Plan activations and payments are arranged manually with the Eventflow team.";
    };
    readonly plans: {
        readonly intro: "What each plan includes — live from the catalog. Start is free; paid plans are 90-day packs with event credits, team seats and AI tools.";
        readonly current: "Current plan";
        readonly freePrice: "Free";
        readonly pricePeriod: "per {days}";
        readonly usdAnchorNote: "Reference price. Billing is in UZS — the final price is confirmed by the EventFlow team.";
        readonly managedRow: "Activated by the EventFlow team";
        readonly requestCta: "Request this plan";
        readonly requestAria: "Request the {plan} plan";
        readonly pendingBadge: "Request sent";
        readonly pendingNotice: "You have a pending plan request from {date}. The EventFlow team will contact you within 2 business days.";
        readonly featureCommission: "{percent}% commission per ticket";
        readonly featureGenerationsMonth: "{count} per month";
        readonly featureGenerationsPack: "{count} per pack period";
        readonly featureAiMinutes: "{count} per month";
        readonly featureTaskBoard: "Task Board";
        readonly featureQrArrival: "QR check-in (arrival only)";
        readonly featureQrExtended: "QR check-in (extended modes)";
        readonly featureStatsBasic: "Basic statistics";
        readonly featureStatsForecast: "Statistics & forecasting";
        readonly featureStatsSla: "Statistics, forecasting & SLA";
    };
    readonly addons: {
        readonly description: "Coin packs and promotion products on top of any plan. Requests are processed by the EventFlow team.";
        readonly unavailable: "Not available yet";
        readonly comingSoon: "Coming soon";
        readonly requestCta: "Request";
        readonly usdAnchorNote: "billed in UZS, price to be confirmed";
        readonly units: {
            readonly PER_WEEK: "per week";
            readonly PER_CAMPAIGN: "per campaign";
            readonly PER_MESSAGE: "per message";
        };
        readonly skus: {
            readonly COIN_AI_100MIN: {
                readonly title: "AI minutes — 100";
                readonly description: "A coin pack of 100 AI voice-agent minutes. Coins don't expire.";
            };
            readonly COIN_GEN_100: {
                readonly title: "Generations — 100";
                readonly description: "A coin pack of 100 image and certificate generations. Coins don't expire.";
            };
            readonly AD_FEATURED_WEEK: {
                readonly title: "Featured placement";
                readonly description: "Your event in the featured block of the public catalog.";
            };
            readonly AD_EMAIL_CAMPAIGN: {
                readonly title: "Email campaign";
                readonly description: "An email campaign to your event participants.";
            };
            readonly AD_SMS_CAMPAIGN: {
                readonly title: "SMS campaign";
                readonly description: "SMS campaigns will be available once an SMS provider is connected.";
            };
        };
    };
    readonly chip: {
        readonly aria: "Plan & billing — open the billing page";
        readonly credits: "{remaining}/{granted} credits";
        readonly expiresIn: "expires in {days} d.";
    };
    readonly wallet: {
        readonly title: "Coin wallet";
        readonly drainOrder: "Coins are spent after your plan quota and never expire.";
        readonly aiBalance: "AI minutes";
        readonly genBalance: "Generations";
        readonly minutesShort: "min";
        readonly buyPack: "Buy a pack";
        readonly historyTitle: "Coin history";
        readonly colDate: "Date";
        readonly colKind: "Type";
        readonly colMetric: "Metric";
        readonly colDelta: "Change";
        readonly colBalance: "Balance";
        readonly colReason: "Note";
        readonly kinds: {
            readonly PURCHASE: "Purchase";
            readonly COMP_GRANT: "Grant";
            readonly CONSUMPTION: "Spend";
            readonly REVERSAL: "Reversal";
        };
        readonly metrics: {
            readonly AI_SECONDS: "AI minutes";
            readonly GENERATION_UNITS: "Generations";
        };
        readonly emptyTitle: "No ledger entries yet";
        readonly emptyBody: "Coin pack purchases, grants and spending will appear here.";
    };
    readonly usage: {
        readonly title: "Usage";
        readonly subtitle: "Live counters for your plan's quota windows.";
        readonly windowMonth: "this month";
        readonly windowPack: "per pack period";
        readonly generationsLabel: "Generations (certificates & badges)";
        readonly aiMinutesLabel: "AI minutes";
        readonly aiComingSoonTitle: "AI agent — coming soon";
        readonly aiComingSoonBody: "Included in your plan. Minutes will activate when the voice agent launches.";
        readonly seatsLabel: "Team seats";
        readonly manageTeam: "Manage team";
        readonly unlimited: "No limit";
        readonly valueOf: "{used} / {limit}";
        readonly atLimit: "Limit reached";
        readonly upgradeCta: "Upgrade plan";
    };
    readonly requestDialog: {
        readonly titleUpgrade: "Request the {plan} plan";
        readonly titleRenew: "Renew the {plan} plan";
        readonly titleAddon: "Request: {title}";
        readonly bodyPlan: "We'll register your request and the EventFlow team will contact you to arrange payment and activation. Nothing is charged automatically.";
        readonly renewResetNote: "Renewal starts a new 90-day period with a fresh credit grant — unused credits are reset, they don't carry over.";
        readonly confirm: "Send request";
        readonly cancel: "Cancel";
        readonly close: "Close";
        readonly successTitle: "Request sent";
        readonly successBody: "The EventFlow team will contact you within 2 business days.";
        readonly duplicateTitle: "There's already a pending request";
        readonly duplicateBody: "Your request from {date} is in the queue — the EventFlow team will contact you within 2 business days.";
        readonly duplicateBodyNoDate: "Your earlier request is in the queue — the EventFlow team will contact you within 2 business days.";
        readonly errorBody: "Couldn't send the request. Try again.";
    };
    readonly invoices: {
        readonly title: "Invoices";
        readonly description: "Requests, orders and receipts for paid plans and add-ons appear here.";
        readonly emptyTitle: "No invoices yet";
        readonly emptyBody: "There's nothing billed yet. Your plan and add-on requests, orders and receipts will appear here.";
        readonly historyTitle: "Requests & orders";
        readonly colDate: "Date";
        readonly colKind: "Type";
        readonly colStatus: "Status";
        readonly colAmount: "Amount";
        readonly kinds: {
            readonly PLAN: "Plan";
            readonly COIN_PACK: "Coin pack";
            readonly ADVERTISING: "Advertising";
            readonly TICKET_SALE: "Ticket sales";
        };
        readonly statuses: {
            readonly REQUESTED: "Requested";
            readonly PENDING_PAYMENT: "Awaiting payment";
            readonly PAID: "Paid";
            readonly CANCELLED: "Cancelled";
            readonly EXPIRED: "Expired";
            readonly REFUNDED: "Refunded";
        };
    };
    readonly seats: {
        readonly chip: "{used} of {seats} taken";
        readonly requestUpgrade: "Request an upgrade";
    };
    readonly publish: {
        readonly willConsume: "Publishing will use 1 event credit — {left} of {granted} will remain.";
        readonly lastCredit: "This is your last event credit: once it's spent, the organization moves to Start terms until you renew the pack.";
        readonly noCredits: "Your pack's event credits are used up — new publications run on Start terms until you renew.";
        readonly republishFree: "Re-publishing the same event doesn't use a credit.";
    };
    readonly gate: {
        readonly boardsLockedTitle: "Task Board isn't part of your plan";
        readonly boardsLockedBody: "Kanban boards for planning event work — columns, tasks, assignees and deadlines. Included in the Pro and Exclusive plans.";
        readonly boardsReadOnlyTitle: "Boards are read-only on your plan";
        readonly boardsReadOnlyBody: "Viewing and export stay available — nothing is deleted. To edit boards again, upgrade your plan.";
    };
    readonly errors: {
        readonly quotaTitle: "Plan limit reached";
        readonly quotaGenerationsBody: "Generations used: {used} of {limit} {window}.";
        readonly quotaAiBody: "AI minutes used: {used} of {limit} {window}.";
        readonly capStaffTitle: "Team seat limit reached";
        readonly capStaffBody: "Your plan includes {seats} (members and pending invites both take a seat); occupied now: {current}.";
        readonly capParticipantsTitle: "Participant limit reached";
        readonly capParticipantsBody: "Your plan allows {participants}.";
        readonly creditsTitle: "Event credits used up";
        readonly creditsBody: "All {granted} credits of your pack are spent. Renew or upgrade the plan to publish more events.";
        readonly featureTitle: "Not included in your plan";
        readonly featureTaskBoardBody: "Task Board isn't included in the {tier} plan.";
        readonly featureStatsBody: "Advanced statistics aren't included in the {tier} plan.";
        readonly featureQrBody: "Extended QR modes aren't included in the {tier} plan.";
        readonly suspendedTitle: "Organization suspended";
        readonly suspendedBody: "Your organization is suspended by the EventFlow team. Contact support@eventflow.uz.";
        readonly upgradeCta: "View plans";
        readonly dismiss: "Dismiss";
    };
    readonly settingsLink: {
        readonly title: "Billing & subscription";
        readonly description: "View your plan, pricing and payment status.";
        readonly cta: "Open billing";
    };
};
//# sourceMappingURL=billing.d.ts.map