export declare const billing: {
    readonly eyebrow: "Tashkilot";
    readonly title: "Tariflar va obuna";
    readonly description: "Tarifingiz, narxlar va to'lov holati. Eventflow'da boshlash bepul — siz faqat har bir chiptadan komissiya to'laysiz.";
    readonly tabs: {
        readonly overview: "Umumiy";
        readonly plans: "Tariflar";
        readonly addons: "Qo'shimchalar";
        readonly invoices: "Hisoblar";
    };
    readonly manage: {
        readonly viewOnlyTooltip: "Siz tariflarni ko'ra olasiz, lekin so'rov yuborish uchun «Tariflarni boshqarish» huquqi kerak — tashkilot egasiga murojaat qiling.";
    };
    readonly common: {
        readonly loadErrorTitle: "Tarif ma'lumotlarini yuklab bo'lmadi";
        readonly loadErrorBody: "Ulanishni tekshirib, qayta urinib ko'ring.";
        readonly retry: "Qayta urinish";
    };
    readonly tiers: {
        readonly START: "Start";
        readonly PRO: "Pro";
        readonly EXCLUSIVE: "Exclusive";
    };
    readonly notEnabled: {
        readonly title: "Tarif tizimi hali yoqilmagan";
        readonly body: "Hozircha EventFlow tarif cheklovlarisiz ishlaydi: limitlar qo'llanilmaydi va hech narsa yechilmaydi. Quyidagi ma'lumotlar tarif tizimi yoqilgach nima amal qilishini ko'rsatadi.";
    };
    readonly suspended: {
        readonly title: "Tashkilot faoliyati to'xtatilgan";
        readonly body: "Tashkilotingiz EventFlow jamoasi tomonidan to'xtatilgan: ish maydoni faqat o'qish rejimida, yangi ro'yxatdan o'tishlar to'xtatilgan. support@eventflow.uz ga yozing.";
    };
    readonly managedNotice: {
        readonly title: "Tariflarni Eventflow jamoasi boshqaradi";
        readonly body: "Onlayn to'lov va mustaqil ravishda pullik tarifga o'tish hali yoqilmagan. Tarifni o'zgartirish Eventflow jamoasi orqali rasmiylashtiriladi — so'rov yuboring, biz siz bilan bog'lanamiz.";
    };
    readonly overview: {
        readonly currentPlan: "Joriy tarif";
        readonly currentBadge: "Joriy";
        readonly freeBadge: "Bepul";
        readonly startSummary: "Barcha tashkilotlar «Start» tarifidan boshlaydi. Oylik to'lov yo'q — siz faqat sotilgan har bir chiptadan komissiya to'laysiz.";
        readonly packSummary: "Tarifingiz 90 kunlik paket sifatida amal qiladi. Uzaytirish yangi davrni yangi kreditlar bilan ochadi; ishlatilmagan kreditlar o'tkazilmaydi.";
        readonly sourcePurchase: "Faol paket";
        readonly sourceDefault: "Asosiy tarif";
        readonly commissionLabel: "Komissiya";
        readonly commissionValue: "har bir chiptadan {percent}%";
        readonly commissionTicketsNote: "Platformada chipta sotuvi ishga tushgach qo'llaniladi.";
        readonly commissionOverrideHint: "Tashkilotingiz uchun alohida stavka";
        readonly packTitle: "Tadbirlar paketi";
        readonly activatedOn: "{date} da faollashtirilgan";
        readonly awaitingActivation: "Faollashtirish kutilmoqda";
        readonly creditsLabel: "E'lon kreditlari";
        readonly creditsValue: "{granted} tadan {remaining} tasi qoldi";
        readonly expiresOn: "{date} gacha amal qiladi";
        readonly expired: "Davr tugadi";
        readonly noExpiry: "Tugash sanasi yo'q";
        readonly renewCta: "Tarifni uzaytirish";
        readonly renewResetNote: "Uzaytirish yangi 90 kunlik davrni yangi kreditlar bilan ochadi. Ishlatilmagan kreditlar o'tkazilmaydi.";
        readonly comparePlans: "Tariflarni solishtirish";
        readonly paymentTitle: "To'lov usuli";
        readonly paymentNotEnabled: "Onlayn to'lov hali yoqilmagan";
        readonly paymentNotEnabledBody: "Karta va mahalliy to'lov tizimlari (Click, Payme) ulanmagan. Tarifni faollashtirish va to'lov Eventflow jamoasi orqali qo'lda rasmiylashtiriladi.";
    };
    readonly plans: {
        readonly intro: "Har bir tarifga nimalar kirishi — jonli katalogdan. «Start» bepul; pullik tariflar — e'lon kreditlari, jamoa o'rinlari va AI vositalari bilan 90 kunlik paketlar.";
        readonly current: "Joriy tarif";
        readonly freePrice: "Bepul";
        readonly pricePeriod: "{days} uchun";
        readonly usdAnchorNote: "Taxminiy narx. To'lov UZS da — yakuniy narxni EventFlow jamoasi tasdiqlaydi.";
        readonly managedRow: "EventFlow jamoasi orqali faollashtiriladi";
        readonly requestCta: "Tarifni so'rash";
        readonly requestAria: "«{plan}» tarifini so'rash";
        readonly pendingBadge: "So'rov yuborildi";
        readonly pendingNotice: "Sizda {date} dagi ko'rib chiqilmagan tarif so'rovi bor. EventFlow jamoasi 2 ish kuni ichida siz bilan bog'lanadi.";
        readonly featureCommission: "Har bir chiptadan {percent}% komissiya";
        readonly featureGenerationsMonth: "oyiga {count}";
        readonly featureGenerationsPack: "paket davri uchun {count}";
        readonly featureAiMinutes: "oyiga {count}";
        readonly featureTaskBoard: "Vazifalar doskasi";
        readonly featureQrArrival: "QR check-in (faqat kirish)";
        readonly featureQrExtended: "QR check-in (kengaytirilgan rejimlar)";
        readonly featureStatsBasic: "Asosiy statistika";
        readonly featureStatsForecast: "Statistika va prognozlar";
        readonly featureStatsSla: "Statistika, prognozlar va SLA";
    };
    readonly addons: {
        readonly description: "Istalgan tarif ustiga koin paketlari va reklama mahsulotlari. So'rovlarni EventFlow jamoasi ko'rib chiqadi.";
        readonly unavailable: "Hali mavjud emas";
        readonly comingSoon: "Tez kunda";
        readonly requestCta: "So'rash";
        readonly usdAnchorNote: "to'lov UZS da, narx aniqlanmoqda";
        readonly units: {
            readonly PER_WEEK: "haftasiga";
            readonly PER_CAMPAIGN: "kampaniya uchun";
            readonly PER_MESSAGE: "xabar uchun";
        };
        readonly skus: {
            readonly COIN_AI_100MIN: {
                readonly title: "AI daqiqalari — 100";
                readonly description: "AI ovozli agent uchun 100 daqiqalik koin paketi. Koinlar muddatsiz.";
            };
            readonly COIN_GEN_100: {
                readonly title: "Generatsiyalar — 100";
                readonly description: "Rasm va sertifikat generatsiyasi uchun 100 talik koin paketi. Koinlar muddatsiz.";
            };
            readonly AD_FEATURED_WEEK: {
                readonly title: "Featured joylashuv";
                readonly description: "Tadbiringiz ommaviy katalogning featured blokida.";
            };
            readonly AD_EMAIL_CAMPAIGN: {
                readonly title: "Email tarqatma";
                readonly description: "Tadbiringiz ishtirokchilariga email kampaniyasi.";
            };
            readonly AD_SMS_CAMPAIGN: {
                readonly title: "SMS tarqatma";
                readonly description: "SMS kampaniyalari SMS provayderi ulangach ochiladi.";
            };
        };
    };
    readonly chip: {
        readonly aria: "Tarif va obuna — billing sahifasini ochish";
        readonly credits: "{remaining}/{granted} kredit";
        readonly expiresIn: "{days} kundan keyin tugaydi";
    };
    readonly wallet: {
        readonly title: "Koin hamyoni";
        readonly drainOrder: "Koinlar tarif kvotasidan keyin sarflanadi va muddati tugamaydi.";
        readonly aiBalance: "AI daqiqalari";
        readonly genBalance: "Generatsiyalar";
        readonly minutesShort: "daq";
        readonly buyPack: "Paket sotib olish";
        readonly historyTitle: "Koinlar tarixi";
        readonly colDate: "Sana";
        readonly colKind: "Turi";
        readonly colMetric: "Metrika";
        readonly colDelta: "O'zgarish";
        readonly colBalance: "Qoldiq";
        readonly colReason: "Izoh";
        readonly kinds: {
            readonly PURCHASE: "Xarid";
            readonly COMP_GRANT: "Hisoblab berish";
            readonly CONSUMPTION: "Sarflash";
            readonly REVERSAL: "Storno";
        };
        readonly metrics: {
            readonly AI_SECONDS: "AI daqiqalari";
            readonly GENERATION_UNITS: "Generatsiyalar";
        };
        readonly emptyTitle: "Hozircha yozuvlar yo'q";
        readonly emptyBody: "Bu yerda koin paketlari xaridlari, hisoblab berishlar va sarflar ko'rinadi.";
    };
    readonly usage: {
        readonly title: "Foydalanish";
        readonly subtitle: "Tarifingiz kvota oynalarining jonli hisoblagichlari.";
        readonly windowMonth: "shu oyda";
        readonly windowPack: "paket davri uchun";
        readonly generationsLabel: "Generatsiyalar (sertifikatlar va beydjlar)";
        readonly aiMinutesLabel: "AI daqiqalari";
        readonly aiComingSoonTitle: "AI agent — tez kunda";
        readonly aiComingSoonBody: "Tarifingizga kiritilgan. Daqiqalar ovozli agent ishga tushishi bilan faollashadi.";
        readonly seatsLabel: "Jamoa o'rinlari";
        readonly manageTeam: "Jamoani boshqarish";
        readonly unlimited: "Cheklovsiz";
        readonly valueOf: "{used} / {limit}";
        readonly atLimit: "Limit tugadi";
        readonly upgradeCta: "Tarifni yaxshilash";
    };
    readonly requestDialog: {
        readonly titleUpgrade: "«{plan}» tarifiga so'rov";
        readonly titleRenew: "«{plan}» tarifini uzaytirish";
        readonly titleAddon: "So'rov: {title}";
        readonly bodyPlan: "So'rovingizni ro'yxatga olamiz, EventFlow jamoasi to'lov va faollashtirish bo'yicha siz bilan bog'lanadi. Hech narsa avtomatik yechilmaydi.";
        readonly renewResetNote: "Uzaytirish yangi 90 kunlik davrni yangi kreditlar bilan ochadi — ishlatilmagan kreditlar nolga tushadi, o'tkazilmaydi.";
        readonly confirm: "So'rov yuborish";
        readonly cancel: "Bekor qilish";
        readonly close: "Yopish";
        readonly successTitle: "So'rov yuborildi";
        readonly successBody: "EventFlow jamoasi 2 ish kuni ichida siz bilan bog'lanadi.";
        readonly duplicateTitle: "Ko'rib chiqilmagan so'rov allaqachon bor";
        readonly duplicateBody: "{date} dagi so'rovingiz navbatda — EventFlow jamoasi 2 ish kuni ichida siz bilan bog'lanadi.";
        readonly duplicateBodyNoDate: "Avvalgi so'rovingiz navbatda — EventFlow jamoasi 2 ish kuni ichida siz bilan bog'lanadi.";
        readonly errorBody: "So'rovni yuborib bo'lmadi. Qayta urinib ko'ring.";
    };
    readonly invoices: {
        readonly title: "Hisoblar";
        readonly description: "Pullik tariflar va qo'shimchalar bo'yicha so'rovlar, buyurtmalar va cheklar shu yerda chiqadi.";
        readonly emptyTitle: "Hozircha hisoblar yo'q";
        readonly emptyBody: "Hozircha to'lovlar bo'lmagan. Tarif va qo'shimchalar bo'yicha so'rovlaringiz, buyurtmalar va cheklar shu yerda paydo bo'ladi.";
        readonly historyTitle: "So'rovlar va buyurtmalar";
        readonly colDate: "Sana";
        readonly colKind: "Turi";
        readonly colStatus: "Holat";
        readonly colAmount: "Summa";
        readonly kinds: {
            readonly PLAN: "Tarif";
            readonly COIN_PACK: "Koin paketi";
            readonly ADVERTISING: "Reklama";
            readonly TICKET_SALE: "Chipta sotuvi";
        };
        readonly statuses: {
            readonly REQUESTED: "So'rov";
            readonly PENDING_PAYMENT: "To'lov kutilmoqda";
            readonly PAID: "To'langan";
            readonly CANCELLED: "Bekor qilingan";
            readonly EXPIRED: "Muddati o'tgan";
            readonly REFUNDED: "Qaytarilgan";
        };
    };
    readonly seats: {
        readonly chip: "{seats}dan {used} tasi band";
        readonly requestUpgrade: "Yaxshilashni so'rash";
    };
    readonly publish: {
        readonly willConsume: "E'lon qilish 1 kreditni ishlatadi — {granted} tadan {left} tasi qoladi.";
        readonly lastCredit: "Bu oxirgi kredit: u ishlatilgach, tashkilot paket uzaytirilguncha «Start» shartlariga o'tadi.";
        readonly noCredits: "Paketning e'lon kreditlari tugagan — yangi e'lonlar paket uzaytirilguncha «Start» shartlarida chiqadi.";
        readonly republishFree: "Xuddi shu tadbirni qayta e'lon qilish kredit ishlatmaydi.";
    };
    readonly gate: {
        readonly boardsLockedTitle: "Vazifalar doskasi tarifingizga kirmaydi";
        readonly boardsLockedBody: "Tadbir ishini rejalashtirish uchun kanban doskalari — ustunlar, vazifalar, mas'ullar va muddatlar. Pro va Exclusive tariflariga kiradi.";
        readonly boardsReadOnlyTitle: "Doskalar tarifingizda faqat o'qish rejimida";
        readonly boardsReadOnlyBody: "Ko'rish va eksport ochiq — ma'lumotlar o'chirilmaydi. Doskalarni yana tahrirlash uchun tarifni yaxshilang.";
    };
    readonly errors: {
        readonly quotaTitle: "Tarif limiti tugadi";
        readonly quotaGenerationsBody: "Ishlatilgan generatsiyalar: {limit} tadan {used} tasi {window}.";
        readonly quotaAiBody: "Ishlatilgan AI daqiqalari: {limit} tadan {used} tasi {window}.";
        readonly capStaffTitle: "Jamoa o'rinlari limiti tugadi";
        readonly capStaffBody: "Tarifingizga {seats} kiradi (o'rinni xodimlar ham, kutilayotgan takliflar ham egallaydi); hozir band: {current}.";
        readonly capParticipantsTitle: "Ishtirokchilar limiti tugadi";
        readonly capParticipantsBody: "Tarifingiz {participants} ga ruxsat beradi.";
        readonly creditsTitle: "E'lon kreditlari tugadi";
        readonly creditsBody: "Paketning barcha {granted} krediti ishlatilgan. Yangi tadbirlar e'lon qilish uchun tarifni uzaytiring yoki yaxshilang.";
        readonly featureTitle: "Tarifingizga kirmaydi";
        readonly featureTaskBoardBody: "Vazifalar doskasi «{tier}» tarifiga kirmaydi.";
        readonly featureStatsBody: "Kengaytirilgan statistika «{tier}» tarifiga kirmaydi.";
        readonly featureQrBody: "Kengaytirilgan QR rejimlari «{tier}» tarifiga kirmaydi.";
        readonly suspendedTitle: "Tashkilot faoliyati to'xtatilgan";
        readonly suspendedBody: "Tashkilotingiz EventFlow jamoasi tomonidan to'xtatilgan. support@eventflow.uz ga yozing.";
        readonly upgradeCta: "Tariflarni ochish";
        readonly dismiss: "Yopish";
    };
    readonly settingsLink: {
        readonly title: "Tariflar va obuna";
        readonly description: "Tarif, narxlar va to'lov holatini ko'rish.";
        readonly cta: "Tariflarni ochish";
    };
};
//# sourceMappingURL=billing.d.ts.map