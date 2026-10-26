/**
 * Ommaviy chipta chekauti (P-15, M-4 ustida). Matn manbai:
 * docs/monetization/10-decisions.md — halol managed-ohang: onlayn
 * provayderlar tashqi geyt ortida (M-5/M-16), toʻlovni EventFlow operatori
 * qoʻlda tasdiqlaydi; soxta karta formalari va boʻlmagʻur vaʼdalarsiz.
 */
export const checkout = {
    ticket: {
        eyebrow: "Chipta",
        regionAria: "Chipta toʻlovi",
        intro: "Bu pullik tadbir — chipta toʻlangach joyingiz tasdiqlanadi.",
        amountLabel: "Toʻlov summasi",
        cta: "Chipta uchun hisob yaratish",
        creating: "Hisob yaratilmoqda…",
        pendingTitle: "Hisob yaratildi — toʻlov kutilmoqda",
        holdUntil: "Joy {time} gacha band qilingan",
        holdLeft: "taxminan {minutes} daqiqa qoldi",
        managedNotice: "Karta orqali onlayn toʻlov provayderlar ulangach ishga tushadi. Hozircha toʻlovni EventFlow operatori tasdiqlaydi — rekvizitlarni elektron pochtangizga yuboramiz, tasdiqdan soʻng holat avtomatik yangilanadi.",
        refreshCta: "Holatni yangilash",
        refreshing: "Tekshirilmoqda…",
        paidTitle: "Chipta toʻlandi",
        paidNote: "Joyingiz tasdiqlandi. Elektron chipta profilingizda mavjud.",
        expiredTitle: "Bron muddati tugadi",
        expiredNote: "Avvalgi hisob muddati tugadi. Joyni qayta band qilish uchun yangi hisob yarating.",
        retryCta: "Yangi hisob yaratish",
        cancelledNote: "Avvalgi buyurtma bekor qilindi. Yangi hisob yaratishingiz mumkin.",
        refundedNote: "Avvalgi buyurtma uchun toʻlov qaytarildi. Yangi hisob yaratishingiz mumkin.",
        error: "Hisob yaratib boʻlmadi. Qayta urinib koʻring.",
        via: {
            notice: "VIA orqali onlayn toʻlang (UZCARD / HUMO). Siz VIA'ning himoyalangan toʻlov sahifasiga oʻtasiz — karta maʼlumotlari bizga yetib bormaydi.",
            payCta: "VIA orqali onlayn toʻlash",
            redirecting: "Toʻlov sahifasi ochilmoqda…",
            error: "Toʻlovni boshlab boʻlmadi. Qayta urinib koʻring.",
            returnMetaTitle: "Toʻlovni tekshirish",
            returnMetaDescription: "EventFlow tadbiri uchun VIA orqali chipta toʻlovini tekshiryapmiz.",
            verifying: "Toʻlov tekshirilmoqda…",
            paidTitle: "Toʻlov tasdiqlandi",
            paidBody: "Chipta toʻlandi, joyingiz tasdiqlandi. Elektron chipta profilingizda mavjud.",
            openTicket: "Chiptani ochish",
            myEvents: "Mening tadbirlarim",
            pendingTitle: "Toʻlov hali tasdiqlanmadi",
            pendingBody: "Bank toʻlovni oʻtkazishi biroz vaqt olishi mumkin. Bir daqiqadan soʻng qayta tekshiring — VIA tasdiqlagach holat avtomatik yangilanadi.",
            recheck: "Qayta tekshirish",
            closedTitle: "Hisob yopilgan",
            closedBody: "Bu hisob muddati tugagan yoki bekor qilingan. Yangi hisobni tadbir sahifasida yaratishingiz mumkin.",
            invalidLinkTitle: "Notoʻgʻri havola",
            invalidLinkBody: "Toʻlovni tekshirish havolasi buzilgan yoki toʻliq emas.",
            browseEvents: "Tadbirlar afishasi",
            loginTitle: "Davom etish uchun tizimga kiring",
            loginBody: "Toʻlovni tekshirish uchun roʻyxatdan oʻtishda ishlatilgan hisob bilan kiring.",
            loginCta: "Kirish",
            errorTitle: "Toʻlovni tekshirib boʻlmadi",
            errorBody: "Hozircha toʻlovni tekshirib boʻlmadi. Pulingiz xavfsiz — bir daqiqadan soʻng qayta urinib koʻring.",
        },
    },
};
//# sourceMappingURL=checkout.js.map