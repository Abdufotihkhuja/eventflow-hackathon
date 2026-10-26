/**
 * Ommaviy /pricing sahifasi (P-4). Matn manbai:
 * docs/monetization/10-decisions.md §1 + qabul qilingan qarorlar — prognoz/SLA
 * vaʼdalarisiz (B-4), "blokcheyn"siz (B-7: "tasdiqlanadigan sertifikatlar"),
 * START QR — faqat kirishda (E-4), AI qoʻngʻiroqlar — halol "tez orada" (E-3),
 * reklama D-2 boʻyicha (SMS — "tez orada").
 */
export const pricing = {
    meta: {
        title: "Tashkilotchilar uchun tariflar",
        description: "EVENTFLOW tariflari: bepul START — 12% komissiya, PRO — 5 ta tadbirga / 90 kunga $599 va 8%, EXCLUSIVE — 10 ta tadbirga / 90 kunga $999 va 6%. Toʻlov — Oʻzbekiston soʻmida.",
    },
    nav: {
        label: "Tariflar",
    },
    hero: {
        eyebrow: "Tariflar",
        title: "Tadbir paketlari va",
        titleAccent: "halol komissiya",
        intro: "Bepul boshlang va komissiyani faqat sotilgan chiptalardan toʻlang. Pullik paketlar komissiyani kamaytiradi hamda jamoa oʻrinlari, tadbir sigʻimi va generatsiya kvotalarini qoʻshadi. Narxlar AQSH dollarida moʻljal sifatida koʻrsatilgan; toʻlov — Oʻzbekiston soʻmida.",
    },
    currency: {
        paymentNote: "Toʻlov Oʻzbekiston soʻmida amalga oshiriladi; aniq narx toʻlov ishga tushganda eʼlon qilinadi.",
        uzsPending: "soʻmdagi narx keyinroq eʼlon qilinadi",
    },
    commission: {
        label: "Komissiya",
        perTicket: "har bir sotilgan chiptadan {percent}%",
        appliesNote: "Komissiya platformada chipta sotuvi ishga tushgach qoʻllanadi.",
    },
    plans: {
        popularBadge: "Ommabop",
        start: {
            name: "Start",
            tagline: "Ilk tadbirlar va kichik uchrashuvlar uchun",
            priceFree: "Bepul",
            cta: "Bepul boshlash",
            ctaAria: "Bepul Start tarifida roʻyxatdan oʻtish",
        },
        pro: {
            name: "Pro",
            tagline: "Muntazam tadbirlar va oʻsayotgan jamoa uchun",
            cta: "Pro tarifini tanlash",
            ctaAria: "Roʻyxatdan oʻtib, Pro tarifini soʻrash",
        },
        exclusive: {
            name: "Exclusive",
            tagline: "Zich taqvim va katta maydonlar uchun",
            cta: "Exclusive tarifini tanlash",
            ctaAria: "Roʻyxatdan oʻtib, Exclusive tarifini soʻrash",
        },
    },
    card: {
        includedHeading: "Nimalar kiradi",
    },
    facts: {
        events: "Tadbirlar",
        validity: "Amal qilish muddati",
        commission: "Komissiya",
        participants: "Tadbir sigʻimi",
        seats: "Jamoa",
        generations: "Sertifikat va beyjlar",
        eventsUnlimited: "cheklovsiz",
        upTo: "{value}gacha",
        perMonth: "oyiga {value}",
        perPack: "paket davriga {value}",
        seatSingle: "1 foydalanuvchi",
    },
    features: {
        qrStart: "QR check-in — faqat kirishda",
        qrPaid: "QR check-in",
        stats: "Tadbirlar statistikasi",
        verifiedCerts: "Tasdiqlanadigan sertifikatlar va beyjlar",
        taskBoard: "Jamoa uchun vazifalar doskasi",
        aiCallsSoon: "AI qoʻngʻiroqlar — oyiga {minutes} (tez orada)",
        prioritySupport: "Shartnoma boʻyicha ustuvor qoʻllab-quvvatlash",
    },
    footnotes: {
        validity: "Tadbir kreditlari faollashtirilgandan soʻng 90 kun amal qiladi; uzaytirilganda yangi toʻplam beriladi — ishlatilmagan kreditlar keyingi davrga oʻtmaydi.",
    },
    coins: {
        heading: "Qoʻshimcha kvotalar uchun koinlar",
        intro: "Istalgan tarif ustiga toʻldirish paketlari.",
        drainOrder: "Koinlar tarif kvotasidan keyin sarflanadi va muddati tugamaydi.",
        comingSoon: "Tez orada",
        aiPack: {
            title: "100 daqiqa AI qoʻngʻiroqlar",
        },
        genPack: {
            title: "100 ta generatsiya (sertifikat va beyjlar)",
        },
    },
    ads: {
        heading: "Reklama",
        intro: "Platformadagi tadbirlar uchun reklama formatlari.",
        fromPrice: "{price} dan",
        perWeek: "bir haftaga",
        perCampaign: "bir kampaniyaga",
        comingSoon: "Tez orada",
        featured: {
            title: "Featured joylashuv",
            description: "Tadbiringiz bosh sahifadagi tanlangan blokda.",
        },
        email: {
            title: "Email-kampaniya",
            description: "Tadbir ishtirokchilari auditoriyasiga yuboriladigan xat.",
        },
        sms: {
            title: "SMS-kampaniya",
            description: "Ishtirokchilarga SMS yuborish.",
        },
    },
};
//# sourceMappingURL=pricing.js.map