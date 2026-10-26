/**
 * Public /pricing page (P-4). Copy authority: docs/monetization/10-decisions.md
 * §1 + adopted defaults — no forecasting/SLA claims (B-4), no "blockchain"
 * (B-7: "verified certificates"), START QR is arrival-only (E-4), AI calling
 * is honest "coming soon" (E-3), ads per D-2 (SMS coming soon).
 */
export const pricing = {
    meta: {
        title: "Pricing for organizers",
        description: "EVENTFLOW plans for event organizers: free START with a 12% commission, PRO — $599 per 5 events / 90 days at 8%, EXCLUSIVE — $999 per 10 events / 90 days at 6%. Payment in Uzbek soums.",
    },
    nav: {
        label: "Pricing",
    },
    hero: {
        eyebrow: "Pricing",
        title: "Event packs with",
        titleAccent: "an honest commission",
        intro: "Start free and pay commission only on sold tickets. Paid packs lower the commission and add team seats, event capacity, and generation quotas. Prices are anchored in US dollars; billing is in Uzbek soums.",
    },
    currency: {
        paymentNote: "Payment is made in Uzbek soums; the exact price will be announced when payments go live.",
        uzsPending: "UZS price to be announced",
    },
    commission: {
        label: "Commission",
        perTicket: "{percent}% per sold ticket",
        appliesNote: "Commission applies once ticket sales launch on the platform.",
    },
    plans: {
        popularBadge: "Popular",
        start: {
            name: "Start",
            tagline: "For first events and small meetups",
            priceFree: "Free",
            cta: "Start free",
            ctaAria: "Sign up on the free Start plan",
        },
        pro: {
            name: "Pro",
            tagline: "For regular events and a growing team",
            cta: "Choose Pro",
            ctaAria: "Sign up and request the Pro plan",
        },
        exclusive: {
            name: "Exclusive",
            tagline: "For a packed calendar and bigger venues",
            cta: "Choose Exclusive",
            ctaAria: "Sign up and request the Exclusive plan",
        },
    },
    card: {
        includedHeading: "What's included",
    },
    facts: {
        events: "Events",
        validity: "Validity",
        commission: "Commission",
        participants: "Capacity per event",
        seats: "Team",
        generations: "Certificates & badges",
        eventsUnlimited: "unlimited",
        upTo: "up to {value}",
        perMonth: "{value} per month",
        perPack: "{value} per pack period",
        seatSingle: "1 user",
    },
    features: {
        qrStart: "QR check-in — at the door only",
        qrPaid: "QR check-in",
        stats: "Event statistics",
        verifiedCerts: "Verified certificates and badges",
        taskBoard: "Task Board for the team",
        aiCallsSoon: "AI calling — {minutes} per month (coming soon)",
        prioritySupport: "Priority support under contract",
    },
    footnotes: {
        validity: "Event credits are valid for 90 days from activation; renewal grants a fresh set — unused credits do not roll over.",
    },
    coins: {
        heading: "Coins for extra quota",
        intro: "Top-up packs on top of any plan.",
        drainOrder: "Coins are spent after your plan quota and never expire.",
        comingSoon: "Coming soon",
        aiPack: {
            title: "100 minutes of AI calling",
        },
        genPack: {
            title: "100 generations (certificates and badges)",
        },
    },
    ads: {
        heading: "Promotion",
        intro: "Advertising formats for events on the platform.",
        fromPrice: "from {price}",
        perWeek: "per week",
        perCampaign: "per campaign",
        comingSoon: "Coming soon",
        featured: {
            title: "Featured placement",
            description: "Your event in the featured block on the home page.",
        },
        email: {
            title: "Email campaign",
            description: "A mailing to the event-participants audience.",
        },
        sms: {
            title: "SMS campaign",
            description: "An SMS mailing to participants.",
        },
    },
};
//# sourceMappingURL=pricing.js.map