export const billing = {
  eyebrow: "Tashkilot",
  title: "Tariflar va obuna",
  description:
    "Tarifingiz, narxlar va to'lov holati. Eventflow'da boshlash bepul — siz faqat har bir chiptadan komissiya to'laysiz.",
  tabs: {
    overview: "Umumiy",
    plans: "Tariflar",
    addons: "Qo'shimchalar",
    invoices: "Hisoblar",
  },
  manage: {
    viewOnlyTooltip:
      "Siz tariflarni ko'ra olasiz, lekin so'rov yuborish uchun «Tariflarni boshqarish» huquqi kerak — tashkilot egasiga murojaat qiling.",
  },
  common: {
    loadErrorTitle: "Tarif ma'lumotlarini yuklab bo'lmadi",
    loadErrorBody: "Ulanishni tekshirib, qayta urinib ko'ring.",
    retry: "Qayta urinish",
  },
  tiers: {
    START: "Start",
    PRO: "Pro",
    EXCLUSIVE: "Exclusive",
  },
  notEnabled: {
    title: "Tarif tizimi hali yoqilmagan",
    body: "Hozircha EventFlow tarif cheklovlarisiz ishlaydi: limitlar qo'llanilmaydi va hech narsa yechilmaydi. Quyidagi ma'lumotlar tarif tizimi yoqilgach nima amal qilishini ko'rsatadi.",
  },
  suspended: {
    title: "Tashkilot faoliyati to'xtatilgan",
    body: "Tashkilotingiz EventFlow jamoasi tomonidan to'xtatilgan: ish maydoni faqat o'qish rejimida, yangi ro'yxatdan o'tishlar to'xtatilgan. support@eventflow.uz ga yozing.",
  },
  managedNotice: {
    title: "Tariflarni Eventflow jamoasi boshqaradi",
    body: "Onlayn to'lov va mustaqil ravishda pullik tarifga o'tish hali yoqilmagan. Tarifni o'zgartirish Eventflow jamoasi orqali rasmiylashtiriladi — so'rov yuboring, biz siz bilan bog'lanamiz.",
  },
  overview: {
    currentPlan: "Joriy tarif",
    currentBadge: "Joriy",
    freeBadge: "Bepul",
    startSummary:
      "Barcha tashkilotlar «Start» tarifidan boshlaydi. Oylik to'lov yo'q — siz faqat sotilgan har bir chiptadan komissiya to'laysiz.",
    packSummary:
      "Tarifingiz 90 kunlik paket sifatida amal qiladi. Uzaytirish yangi davrni yangi kreditlar bilan ochadi; ishlatilmagan kreditlar o'tkazilmaydi.",
    sourcePurchase: "Faol paket",
    sourceDefault: "Asosiy tarif",
    commissionLabel: "Komissiya",
    commissionValue: "har bir chiptadan {percent}%",
    commissionTicketsNote: "Platformada chipta sotuvi ishga tushgach qo'llaniladi.",
    commissionOverrideHint: "Tashkilotingiz uchun alohida stavka",
    packTitle: "Tadbirlar paketi",
    activatedOn: "{date} da faollashtirilgan",
    awaitingActivation: "Faollashtirish kutilmoqda",
    creditsLabel: "E'lon kreditlari",
    creditsValue: "{granted} tadan {remaining} tasi qoldi",
    expiresOn: "{date} gacha amal qiladi",
    expired: "Davr tugadi",
    noExpiry: "Tugash sanasi yo'q",
    renewCta: "Tarifni uzaytirish",
    renewResetNote:
      "Uzaytirish yangi 90 kunlik davrni yangi kreditlar bilan ochadi. Ishlatilmagan kreditlar o'tkazilmaydi.",
    comparePlans: "Tariflarni solishtirish",
    paymentTitle: "To'lov usuli",
    paymentNotEnabled: "Onlayn to'lov hali yoqilmagan",
    paymentNotEnabledBody:
      "Karta va mahalliy to'lov tizimlari (Click, Payme) ulanmagan. Tarifni faollashtirish va to'lov Eventflow jamoasi orqali qo'lda rasmiylashtiriladi.",
  },
  plans: {
    intro:
      "Har bir tarifga nimalar kirishi — jonli katalogdan. «Start» bepul; pullik tariflar — e'lon kreditlari, jamoa o'rinlari va AI vositalari bilan 90 kunlik paketlar.",
    current: "Joriy tarif",
    freePrice: "Bepul",
    pricePeriod: "{days} uchun",
    usdAnchorNote:
      "Taxminiy narx. To'lov UZS da — yakuniy narxni EventFlow jamoasi tasdiqlaydi.",
    managedRow: "EventFlow jamoasi orqali faollashtiriladi",
    requestCta: "Tarifni so'rash",
    requestAria: "«{plan}» tarifini so'rash",
    pendingBadge: "So'rov yuborildi",
    pendingNotice:
      "Sizda {date} dagi ko'rib chiqilmagan tarif so'rovi bor. EventFlow jamoasi 2 ish kuni ichida siz bilan bog'lanadi.",
    featureCommission: "Har bir chiptadan {percent}% komissiya",
    featureGenerationsMonth: "oyiga {count}",
    featureGenerationsPack: "paket davri uchun {count}",
    featureAiMinutes: "oyiga {count}",
    featureTaskBoard: "Vazifalar doskasi",
    featureQrArrival: "QR check-in (faqat kirish)",
    featureQrExtended: "QR check-in (kengaytirilgan rejimlar)",
    featureStatsBasic: "Asosiy statistika",
    featureStatsForecast: "Statistika va prognozlar",
    featureStatsSla: "Statistika, prognozlar va SLA",
  },
  addons: {
    description:
      "Istalgan tarif ustiga koin paketlari va reklama mahsulotlari. So'rovlarni EventFlow jamoasi ko'rib chiqadi.",
    unavailable: "Hali mavjud emas",
    comingSoon: "Tez kunda",
    requestCta: "So'rash",
    usdAnchorNote: "to'lov UZS da, narx aniqlanmoqda",
    units: {
      PER_WEEK: "haftasiga",
      PER_CAMPAIGN: "kampaniya uchun",
      PER_MESSAGE: "xabar uchun",
    },
    skus: {
      COIN_AI_100MIN: {
        title: "AI daqiqalari — 100",
        description: "AI ovozli agent uchun 100 daqiqalik koin paketi. Koinlar muddatsiz.",
      },
      COIN_GEN_100: {
        title: "Generatsiyalar — 100",
        description:
          "Rasm va sertifikat generatsiyasi uchun 100 talik koin paketi. Koinlar muddatsiz.",
      },
      AD_FEATURED_WEEK: {
        title: "Featured joylashuv",
        description: "Tadbiringiz ommaviy katalogning featured blokida.",
      },
      AD_EMAIL_CAMPAIGN: {
        title: "Email tarqatma",
        description: "Tadbiringiz ishtirokchilariga email kampaniyasi.",
      },
      AD_SMS_CAMPAIGN: {
        title: "SMS tarqatma",
        description: "SMS kampaniyalari SMS provayderi ulangach ochiladi.",
      },
    },
  },
  chip: {
    aria: "Tarif va obuna — billing sahifasini ochish",
    credits: "{remaining}/{granted} kredit",
    expiresIn: "{days} kundan keyin tugaydi",
  },
  wallet: {
    title: "Koin hamyoni",
    drainOrder: "Koinlar tarif kvotasidan keyin sarflanadi va muddati tugamaydi.",
    aiBalance: "AI daqiqalari",
    genBalance: "Generatsiyalar",
    minutesShort: "daq",
    buyPack: "Paket sotib olish",
    historyTitle: "Koinlar tarixi",
    colDate: "Sana",
    colKind: "Turi",
    colMetric: "Metrika",
    colDelta: "O'zgarish",
    colBalance: "Qoldiq",
    colReason: "Izoh",
    kinds: {
      PURCHASE: "Xarid",
      COMP_GRANT: "Hisoblab berish",
      CONSUMPTION: "Sarflash",
      REVERSAL: "Storno",
    },
    metrics: {
      AI_SECONDS: "AI daqiqalari",
      GENERATION_UNITS: "Generatsiyalar",
    },
    emptyTitle: "Hozircha yozuvlar yo'q",
    emptyBody: "Bu yerda koin paketlari xaridlari, hisoblab berishlar va sarflar ko'rinadi.",
  },
  usage: {
    title: "Foydalanish",
    subtitle: "Tarifingiz kvota oynalarining jonli hisoblagichlari.",
    windowMonth: "shu oyda",
    windowPack: "paket davri uchun",
    generationsLabel: "Generatsiyalar (sertifikatlar va beydjlar)",
    aiMinutesLabel: "AI daqiqalari",
    aiComingSoonTitle: "AI agent — tez kunda",
    aiComingSoonBody:
      "Tarifingizga kiritilgan. Daqiqalar ovozli agent ishga tushishi bilan faollashadi.",
    seatsLabel: "Jamoa o'rinlari",
    manageTeam: "Jamoani boshqarish",
    unlimited: "Cheklovsiz",
    valueOf: "{used} / {limit}",
    atLimit: "Limit tugadi",
    upgradeCta: "Tarifni yaxshilash",
  },
  requestDialog: {
    titleUpgrade: "«{plan}» tarifiga so'rov",
    titleRenew: "«{plan}» tarifini uzaytirish",
    titleAddon: "So'rov: {title}",
    bodyPlan:
      "So'rovingizni ro'yxatga olamiz, EventFlow jamoasi to'lov va faollashtirish bo'yicha siz bilan bog'lanadi. Hech narsa avtomatik yechilmaydi.",
    renewResetNote:
      "Uzaytirish yangi 90 kunlik davrni yangi kreditlar bilan ochadi — ishlatilmagan kreditlar nolga tushadi, o'tkazilmaydi.",
    confirm: "So'rov yuborish",
    cancel: "Bekor qilish",
    close: "Yopish",
    successTitle: "So'rov yuborildi",
    successBody: "EventFlow jamoasi 2 ish kuni ichida siz bilan bog'lanadi.",
    duplicateTitle: "Ko'rib chiqilmagan so'rov allaqachon bor",
    duplicateBody:
      "{date} dagi so'rovingiz navbatda — EventFlow jamoasi 2 ish kuni ichida siz bilan bog'lanadi.",
    duplicateBodyNoDate:
      "Avvalgi so'rovingiz navbatda — EventFlow jamoasi 2 ish kuni ichida siz bilan bog'lanadi.",
    errorBody: "So'rovni yuborib bo'lmadi. Qayta urinib ko'ring.",
  },
  invoices: {
    title: "Hisoblar",
    description:
      "Pullik tariflar va qo'shimchalar bo'yicha so'rovlar, buyurtmalar va cheklar shu yerda chiqadi.",
    emptyTitle: "Hozircha hisoblar yo'q",
    emptyBody:
      "Hozircha to'lovlar bo'lmagan. Tarif va qo'shimchalar bo'yicha so'rovlaringiz, buyurtmalar va cheklar shu yerda paydo bo'ladi.",
    historyTitle: "So'rovlar va buyurtmalar",
    colDate: "Sana",
    colKind: "Turi",
    colStatus: "Holat",
    colAmount: "Summa",
    kinds: {
      PLAN: "Tarif",
      COIN_PACK: "Koin paketi",
      ADVERTISING: "Reklama",
      TICKET_SALE: "Chipta sotuvi",
    },
    statuses: {
      REQUESTED: "So'rov",
      PENDING_PAYMENT: "To'lov kutilmoqda",
      PAID: "To'langan",
      CANCELLED: "Bekor qilingan",
      EXPIRED: "Muddati o'tgan",
      REFUNDED: "Qaytarilgan",
    },
  },
  seats: {
    chip: "{seats}dan {used} tasi band",
    requestUpgrade: "Yaxshilashni so'rash",
  },
  publish: {
    willConsume: "E'lon qilish 1 kreditni ishlatadi — {granted} tadan {left} tasi qoladi.",
    lastCredit:
      "Bu oxirgi kredit: u ishlatilgach, tashkilot paket uzaytirilguncha «Start» shartlariga o'tadi.",
    noCredits:
      "Paketning e'lon kreditlari tugagan — yangi e'lonlar paket uzaytirilguncha «Start» shartlarida chiqadi.",
    republishFree: "Xuddi shu tadbirni qayta e'lon qilish kredit ishlatmaydi.",
  },
  gate: {
    boardsLockedTitle: "Vazifalar doskasi tarifingizga kirmaydi",
    boardsLockedBody:
      "Tadbir ishini rejalashtirish uchun kanban doskalari — ustunlar, vazifalar, mas'ullar va muddatlar. Pro va Exclusive tariflariga kiradi.",
    boardsReadOnlyTitle: "Doskalar tarifingizda faqat o'qish rejimida",
    boardsReadOnlyBody:
      "Ko'rish va eksport ochiq — ma'lumotlar o'chirilmaydi. Doskalarni yana tahrirlash uchun tarifni yaxshilang.",
  },
  errors: {
    quotaTitle: "Tarif limiti tugadi",
    quotaGenerationsBody: "Ishlatilgan generatsiyalar: {limit} tadan {used} tasi {window}.",
    quotaAiBody: "Ishlatilgan AI daqiqalari: {limit} tadan {used} tasi {window}.",
    capStaffTitle: "Jamoa o'rinlari limiti tugadi",
    capStaffBody:
      "Tarifingizga {seats} kiradi (o'rinni xodimlar ham, kutilayotgan takliflar ham egallaydi); hozir band: {current}.",
    capParticipantsTitle: "Ishtirokchilar limiti tugadi",
    capParticipantsBody: "Tarifingiz {participants} ga ruxsat beradi.",
    creditsTitle: "E'lon kreditlari tugadi",
    creditsBody:
      "Paketning barcha {granted} krediti ishlatilgan. Yangi tadbirlar e'lon qilish uchun tarifni uzaytiring yoki yaxshilang.",
    featureTitle: "Tarifingizga kirmaydi",
    featureTaskBoardBody: "Vazifalar doskasi «{tier}» tarifiga kirmaydi.",
    featureStatsBody: "Kengaytirilgan statistika «{tier}» tarifiga kirmaydi.",
    featureQrBody: "Kengaytirilgan QR rejimlari «{tier}» tarifiga kirmaydi.",
    suspendedTitle: "Tashkilot faoliyati to'xtatilgan",
    suspendedBody:
      "Tashkilotingiz EventFlow jamoasi tomonidan to'xtatilgan. support@eventflow.uz ga yozing.",
    upgradeCta: "Tariflarni ochish",
    dismiss: "Yopish",
  },
  settingsLink: {
    title: "Tariflar va obuna",
    description: "Tarif, narxlar va to'lov holatini ko'rish.",
    cta: "Tariflarni ochish",
  },
} as const;
