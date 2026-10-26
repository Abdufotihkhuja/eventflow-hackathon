/**
 * Ommaviy /pricing sahifasi (P-4). Matn manbai:
 * docs/monetization/10-decisions.md §1 + qabul qilingan qarorlar — prognoz/SLA
 * vaʼdalarisiz (B-4), "blokcheyn"siz (B-7: "tasdiqlanadigan sertifikatlar"),
 * START QR — faqat kirishda (E-4), AI qoʻngʻiroqlar — halol "tez orada" (E-3),
 * reklama D-2 boʻyicha (SMS — "tez orada").
 */
export declare const pricing: {
    readonly meta: {
        readonly title: "Tashkilotchilar uchun tariflar";
        readonly description: "EVENTFLOW tariflari: bepul START — 12% komissiya, PRO — 5 ta tadbirga / 90 kunga $599 va 8%, EXCLUSIVE — 10 ta tadbirga / 90 kunga $999 va 6%. Toʻlov — Oʻzbekiston soʻmida.";
    };
    readonly nav: {
        readonly label: "Tariflar";
    };
    readonly hero: {
        readonly eyebrow: "Tariflar";
        readonly title: "Tadbir paketlari va";
        readonly titleAccent: "halol komissiya";
        readonly intro: "Bepul boshlang va komissiyani faqat sotilgan chiptalardan toʻlang. Pullik paketlar komissiyani kamaytiradi hamda jamoa oʻrinlari, tadbir sigʻimi va generatsiya kvotalarini qoʻshadi. Narxlar AQSH dollarida moʻljal sifatida koʻrsatilgan; toʻlov — Oʻzbekiston soʻmida.";
    };
    readonly currency: {
        readonly paymentNote: "Toʻlov Oʻzbekiston soʻmida amalga oshiriladi; aniq narx toʻlov ishga tushganda eʼlon qilinadi.";
        readonly uzsPending: "soʻmdagi narx keyinroq eʼlon qilinadi";
    };
    readonly commission: {
        readonly label: "Komissiya";
        readonly perTicket: "har bir sotilgan chiptadan {percent}%";
        readonly appliesNote: "Komissiya platformada chipta sotuvi ishga tushgach qoʻllanadi.";
    };
    readonly plans: {
        readonly popularBadge: "Ommabop";
        readonly start: {
            readonly name: "Start";
            readonly tagline: "Ilk tadbirlar va kichik uchrashuvlar uchun";
            readonly priceFree: "Bepul";
            readonly cta: "Bepul boshlash";
            readonly ctaAria: "Bepul Start tarifida roʻyxatdan oʻtish";
        };
        readonly pro: {
            readonly name: "Pro";
            readonly tagline: "Muntazam tadbirlar va oʻsayotgan jamoa uchun";
            readonly cta: "Pro tarifini tanlash";
            readonly ctaAria: "Roʻyxatdan oʻtib, Pro tarifini soʻrash";
        };
        readonly exclusive: {
            readonly name: "Exclusive";
            readonly tagline: "Zich taqvim va katta maydonlar uchun";
            readonly cta: "Exclusive tarifini tanlash";
            readonly ctaAria: "Roʻyxatdan oʻtib, Exclusive tarifini soʻrash";
        };
    };
    readonly card: {
        readonly includedHeading: "Nimalar kiradi";
    };
    readonly facts: {
        readonly events: "Tadbirlar";
        readonly validity: "Amal qilish muddati";
        readonly commission: "Komissiya";
        readonly participants: "Tadbir sigʻimi";
        readonly seats: "Jamoa";
        readonly generations: "Sertifikat va beyjlar";
        readonly eventsUnlimited: "cheklovsiz";
        readonly upTo: "{value}gacha";
        readonly perMonth: "oyiga {value}";
        readonly perPack: "paket davriga {value}";
        readonly seatSingle: "1 foydalanuvchi";
    };
    readonly features: {
        readonly qrStart: "QR check-in — faqat kirishda";
        readonly qrPaid: "QR check-in";
        readonly stats: "Tadbirlar statistikasi";
        readonly verifiedCerts: "Tasdiqlanadigan sertifikatlar va beyjlar";
        readonly taskBoard: "Jamoa uchun vazifalar doskasi";
        readonly aiCallsSoon: "AI qoʻngʻiroqlar — oyiga {minutes} (tez orada)";
        readonly prioritySupport: "Shartnoma boʻyicha ustuvor qoʻllab-quvvatlash";
    };
    readonly footnotes: {
        readonly validity: "Tadbir kreditlari faollashtirilgandan soʻng 90 kun amal qiladi; uzaytirilganda yangi toʻplam beriladi — ishlatilmagan kreditlar keyingi davrga oʻtmaydi.";
    };
    readonly coins: {
        readonly heading: "Qoʻshimcha kvotalar uchun koinlar";
        readonly intro: "Istalgan tarif ustiga toʻldirish paketlari.";
        readonly drainOrder: "Koinlar tarif kvotasidan keyin sarflanadi va muddati tugamaydi.";
        readonly comingSoon: "Tez orada";
        readonly aiPack: {
            readonly title: "100 daqiqa AI qoʻngʻiroqlar";
        };
        readonly genPack: {
            readonly title: "100 ta generatsiya (sertifikat va beyjlar)";
        };
    };
    readonly ads: {
        readonly heading: "Reklama";
        readonly intro: "Platformadagi tadbirlar uchun reklama formatlari.";
        readonly fromPrice: "{price} dan";
        readonly perWeek: "bir haftaga";
        readonly perCampaign: "bir kampaniyaga";
        readonly comingSoon: "Tez orada";
        readonly featured: {
            readonly title: "Featured joylashuv";
            readonly description: "Tadbiringiz bosh sahifadagi tanlangan blokda.";
        };
        readonly email: {
            readonly title: "Email-kampaniya";
            readonly description: "Tadbir ishtirokchilari auditoriyasiga yuboriladigan xat.";
        };
        readonly sms: {
            readonly title: "SMS-kampaniya";
            readonly description: "Ishtirokchilarga SMS yuborish.";
        };
    };
};
//# sourceMappingURL=pricing.d.ts.map