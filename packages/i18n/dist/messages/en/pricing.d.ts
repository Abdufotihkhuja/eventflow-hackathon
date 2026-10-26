/**
 * Public /pricing page (P-4). Copy authority: docs/monetization/10-decisions.md
 * §1 + adopted defaults — no forecasting/SLA claims (B-4), no "blockchain"
 * (B-7: "verified certificates"), START QR is arrival-only (E-4), AI calling
 * is honest "coming soon" (E-3), ads per D-2 (SMS coming soon).
 */
export declare const pricing: {
    readonly meta: {
        readonly title: "Pricing for organizers";
        readonly description: "EVENTFLOW plans for event organizers: free START with a 12% commission, PRO — $599 per 5 events / 90 days at 8%, EXCLUSIVE — $999 per 10 events / 90 days at 6%. Payment in Uzbek soums.";
    };
    readonly nav: {
        readonly label: "Pricing";
    };
    readonly hero: {
        readonly eyebrow: "Pricing";
        readonly title: "Event packs with";
        readonly titleAccent: "an honest commission";
        readonly intro: "Start free and pay commission only on sold tickets. Paid packs lower the commission and add team seats, event capacity, and generation quotas. Prices are anchored in US dollars; billing is in Uzbek soums.";
    };
    readonly currency: {
        readonly paymentNote: "Payment is made in Uzbek soums; the exact price will be announced when payments go live.";
        readonly uzsPending: "UZS price to be announced";
    };
    readonly commission: {
        readonly label: "Commission";
        readonly perTicket: "{percent}% per sold ticket";
        readonly appliesNote: "Commission applies once ticket sales launch on the platform.";
    };
    readonly plans: {
        readonly popularBadge: "Popular";
        readonly start: {
            readonly name: "Start";
            readonly tagline: "For first events and small meetups";
            readonly priceFree: "Free";
            readonly cta: "Start free";
            readonly ctaAria: "Sign up on the free Start plan";
        };
        readonly pro: {
            readonly name: "Pro";
            readonly tagline: "For regular events and a growing team";
            readonly cta: "Choose Pro";
            readonly ctaAria: "Sign up and request the Pro plan";
        };
        readonly exclusive: {
            readonly name: "Exclusive";
            readonly tagline: "For a packed calendar and bigger venues";
            readonly cta: "Choose Exclusive";
            readonly ctaAria: "Sign up and request the Exclusive plan";
        };
    };
    readonly card: {
        readonly includedHeading: "What's included";
    };
    readonly facts: {
        readonly events: "Events";
        readonly validity: "Validity";
        readonly commission: "Commission";
        readonly participants: "Capacity per event";
        readonly seats: "Team";
        readonly generations: "Certificates & badges";
        readonly eventsUnlimited: "unlimited";
        readonly upTo: "up to {value}";
        readonly perMonth: "{value} per month";
        readonly perPack: "{value} per pack period";
        readonly seatSingle: "1 user";
    };
    readonly features: {
        readonly qrStart: "QR check-in — at the door only";
        readonly qrPaid: "QR check-in";
        readonly stats: "Event statistics";
        readonly verifiedCerts: "Verified certificates and badges";
        readonly taskBoard: "Task Board for the team";
        readonly aiCallsSoon: "AI calling — {minutes} per month (coming soon)";
        readonly prioritySupport: "Priority support under contract";
    };
    readonly footnotes: {
        readonly validity: "Event credits are valid for 90 days from activation; renewal grants a fresh set — unused credits do not roll over.";
    };
    readonly coins: {
        readonly heading: "Coins for extra quota";
        readonly intro: "Top-up packs on top of any plan.";
        readonly drainOrder: "Coins are spent after your plan quota and never expire.";
        readonly comingSoon: "Coming soon";
        readonly aiPack: {
            readonly title: "100 minutes of AI calling";
        };
        readonly genPack: {
            readonly title: "100 generations (certificates and badges)";
        };
    };
    readonly ads: {
        readonly heading: "Promotion";
        readonly intro: "Advertising formats for events on the platform.";
        readonly fromPrice: "from {price}";
        readonly perWeek: "per week";
        readonly perCampaign: "per campaign";
        readonly comingSoon: "Coming soon";
        readonly featured: {
            readonly title: "Featured placement";
            readonly description: "Your event in the featured block on the home page.";
        };
        readonly email: {
            readonly title: "Email campaign";
            readonly description: "A mailing to the event-participants audience.";
        };
        readonly sms: {
            readonly title: "SMS campaign";
            readonly description: "An SMS mailing to participants.";
        };
    };
};
//# sourceMappingURL=pricing.d.ts.map