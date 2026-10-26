/**
 * Ommaviy chipta chekauti (P-15, M-4 ustida). Matn manbai:
 * docs/monetization/10-decisions.md — halol managed-ohang: onlayn
 * provayderlar tashqi geyt ortida (M-5/M-16), toʻlovni EventFlow operatori
 * qoʻlda tasdiqlaydi; soxta karta formalari va boʻlmagʻur vaʼdalarsiz.
 */
export declare const checkout: {
    readonly ticket: {
        readonly eyebrow: "Chipta";
        readonly regionAria: "Chipta toʻlovi";
        readonly intro: "Bu pullik tadbir — chipta toʻlangach joyingiz tasdiqlanadi.";
        readonly amountLabel: "Toʻlov summasi";
        readonly cta: "Chipta uchun hisob yaratish";
        readonly creating: "Hisob yaratilmoqda…";
        readonly pendingTitle: "Hisob yaratildi — toʻlov kutilmoqda";
        readonly holdUntil: "Joy {time} gacha band qilingan";
        readonly holdLeft: "taxminan {minutes} daqiqa qoldi";
        readonly managedNotice: "Karta orqali onlayn toʻlov provayderlar ulangach ishga tushadi. Hozircha toʻlovni EventFlow operatori tasdiqlaydi — rekvizitlarni elektron pochtangizga yuboramiz, tasdiqdan soʻng holat avtomatik yangilanadi.";
        readonly refreshCta: "Holatni yangilash";
        readonly refreshing: "Tekshirilmoqda…";
        readonly paidTitle: "Chipta toʻlandi";
        readonly paidNote: "Joyingiz tasdiqlandi. Elektron chipta profilingizda mavjud.";
        readonly expiredTitle: "Bron muddati tugadi";
        readonly expiredNote: "Avvalgi hisob muddati tugadi. Joyni qayta band qilish uchun yangi hisob yarating.";
        readonly retryCta: "Yangi hisob yaratish";
        readonly cancelledNote: "Avvalgi buyurtma bekor qilindi. Yangi hisob yaratishingiz mumkin.";
        readonly refundedNote: "Avvalgi buyurtma uchun toʻlov qaytarildi. Yangi hisob yaratishingiz mumkin.";
        readonly error: "Hisob yaratib boʻlmadi. Qayta urinib koʻring.";
        readonly via: {
            readonly notice: "VIA orqali onlayn toʻlang (UZCARD / HUMO). Siz VIA'ning himoyalangan toʻlov sahifasiga oʻtasiz — karta maʼlumotlari bizga yetib bormaydi.";
            readonly payCta: "VIA orqali onlayn toʻlash";
            readonly redirecting: "Toʻlov sahifasi ochilmoqda…";
            readonly error: "Toʻlovni boshlab boʻlmadi. Qayta urinib koʻring.";
            readonly returnMetaTitle: "Toʻlovni tekshirish";
            readonly returnMetaDescription: "EventFlow tadbiri uchun VIA orqali chipta toʻlovini tekshiryapmiz.";
            readonly verifying: "Toʻlov tekshirilmoqda…";
            readonly paidTitle: "Toʻlov tasdiqlandi";
            readonly paidBody: "Chipta toʻlandi, joyingiz tasdiqlandi. Elektron chipta profilingizda mavjud.";
            readonly openTicket: "Chiptani ochish";
            readonly myEvents: "Mening tadbirlarim";
            readonly pendingTitle: "Toʻlov hali tasdiqlanmadi";
            readonly pendingBody: "Bank toʻlovni oʻtkazishi biroz vaqt olishi mumkin. Bir daqiqadan soʻng qayta tekshiring — VIA tasdiqlagach holat avtomatik yangilanadi.";
            readonly recheck: "Qayta tekshirish";
            readonly closedTitle: "Hisob yopilgan";
            readonly closedBody: "Bu hisob muddati tugagan yoki bekor qilingan. Yangi hisobni tadbir sahifasida yaratishingiz mumkin.";
            readonly invalidLinkTitle: "Notoʻgʻri havola";
            readonly invalidLinkBody: "Toʻlovni tekshirish havolasi buzilgan yoki toʻliq emas.";
            readonly browseEvents: "Tadbirlar afishasi";
            readonly loginTitle: "Davom etish uchun tizimga kiring";
            readonly loginBody: "Toʻlovni tekshirish uchun roʻyxatdan oʻtishda ishlatilgan hisob bilan kiring.";
            readonly loginCta: "Kirish";
            readonly errorTitle: "Toʻlovni tekshirib boʻlmadi";
            readonly errorBody: "Hozircha toʻlovni tekshirib boʻlmadi. Pulingiz xavfsiz — bir daqiqadan soʻng qayta urinib koʻring.";
        };
    };
};
//# sourceMappingURL=checkout.d.ts.map