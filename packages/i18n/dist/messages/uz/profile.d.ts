export declare const profile: {
    readonly page: {
        readonly accountKicker: "Hisob";
        readonly memberTitle: "Mening profilim";
        readonly memberDescription: "Shaxsiy ma'lumotlarni boshqarish";
        readonly organizationTitle: "Tashkilot profili";
        readonly organizationDescription: "Tashkilotingiz ma'lumotlarini boshqarish";
    };
    readonly status: {
        readonly active: "Faol";
        readonly inactive: "Nofaol";
        readonly pending: "Kutilmoqda";
    };
    readonly cards: {
        readonly photoAndContacts: "Foto va kontaktlar";
        readonly photoAndContactsDescription: "Profil fotosini yuklang va kontaktlarni tekshiring";
        readonly logoAndContacts: "Logotip va kontaktlar";
        readonly logoAndContactsDescription: "Logotip yuklang va kontakt ma'lumotlarini kiriting";
        readonly organization: "Tashkilot";
        readonly organizationDescription: "Tashkilotingiz haqida ma'lumot";
        readonly organizationInfo: "Tashkilot ma'lumotlari";
        readonly organizationInfoDescription: "Tashkilot ma'lumotlarini yangilang. Bu ma'lumotlar ommaga ko'rinadi.";
        readonly privacy: "Maxfiylik";
        readonly privacyDescription: "Profil ko'rinish sozlamalari";
        readonly permissions: "Ruxsatlar";
        readonly permissionsDescription: "Tizimdagi ruxsatlaringiz ({count})";
        readonly noPermissions: "Ruxsatlar tayinlanmagan";
        readonly personalData: "Shaxsiy ma'lumotlar";
        readonly personalDataDescription: "Shaxsiy ma'lumotlaringizni yangilang";
    };
    readonly fields: {
        readonly organizationName: "Tashkilot nomi";
        readonly description: "Tavsif";
        readonly phone: "Telefon";
        readonly inn: "Tashkilot STIRi";
        readonly industry: "Soha";
        readonly companySize: "Xodimlar soni";
        readonly firstName: "Ism";
        readonly lastName: "Familiya";
        readonly position: "Lavozim";
        readonly department: "Bo'lim";
        readonly website: "Veb-sayt";
        readonly address: "Manzil";
        readonly bio: "O'zim haqimda";
        readonly location: "Joylashuv";
    };
    readonly placeholders: {
        readonly organizationName: "Tashkilot nomini kiriting";
        readonly description: "Tashkilotingiz haqida yozing...";
        readonly industry: "Masalan: IT, Ta'lim, Tibbiyot";
        readonly companySize: "Masalan: 10";
        readonly firstName: "Ismni kiriting";
        readonly lastName: "Familiyani kiriting";
        readonly position: "Masalan: Menejer";
        readonly department: "Masalan: Marketing";
        readonly website: "Masalan: https://example.com";
        readonly address: "Shahar, ko'cha, uy";
        readonly bio: "O'zingiz haqingizda qisqacha yozing...";
        readonly location: "Masalan: Toshkent, O'zbekiston";
    };
    readonly descriptions: {
        readonly organizationDescription: "Tashkilot haqida qisqa ma'lumot (maks. 500 belgi)";
        readonly innRequired: "Xodimlar tizimga kirishi uchun STIR kerak";
        readonly website: "Tashkilotingiz veb-saytiga havola";
    };
    readonly visibility: {
        readonly publicProfile: "Ommaviy profil";
        readonly showEmail: "Emailni ko'rsatish";
        readonly showPhone: "Telefonni ko'rsatish";
        readonly yes: "Ha";
        readonly no: "Yo'q";
        readonly emailVisible: "Email ko'rinadi";
        readonly emailHidden: "Email yashirilgan";
        readonly phoneVisible: "Telefon ko'rinadi";
        readonly phoneHidden: "Telefon yashirilgan";
        readonly publicProfileHint: "Tashkilotning boshqa xodimlariga ko'rinadi";
        readonly showEmailHint: "Emailni boshqa xodimlarga ko'rsatish";
        readonly showPhoneHint: "Telefonni boshqa xodimlarga ko'rsatish";
    };
    readonly misc: {
        readonly notSpecified: "Ko'rsatilmagan";
        readonly registered: "Ro'yxatdan o'tgan: {date}";
    };
    readonly dialogs: {
        readonly deletePhotoTitle: "Foto o'chirilsinmi?";
        readonly deleteLogoTitle: "Logotip o'chirilsinmi?";
        readonly irreversible: "Bu amalni ortga qaytarib bo'lmaydi.";
    };
    readonly crop: {
        readonly photoTitle: "Fotoni kesish";
        readonly photoDescription: "Profil fotosi uchun maydonni tanlang";
        readonly logoTitle: "Logotipni kesish";
        readonly logoDescription: "Tashkilot logotipi uchun maydonni tanlang";
    };
    readonly emailVerification: {
        readonly title: "Emailni tasdiqlash";
        readonly description: "Emailingiz tasdiqlanmagan. {email} manziliga kod yuboring va uni kiriting.";
        readonly sendCode: "Kod yuborish";
        readonly codePlaceholder: "6 xonali kod";
        readonly verify: "Tasdiqlash";
        readonly resendCode: "Kodni qayta yuborish";
    };
    readonly verification: {
        readonly title: "Tasdiqlash statusi";
        readonly description: "Tashkilotingiz tekshiruv statusi";
        readonly verified: "Tasdiqlangan";
        readonly verifiedDescription: "Tashkilotingiz tekshiruvdan muvaffaqiyatli o'tdi";
        readonly rejected: "Rad etilgan";
        readonly rejectedDescription: "Tekshiruv rad etildi";
        readonly pending: "Ko'rib chiqilmoqda";
        readonly pendingDescription: "So'rovingiz ko'rib chiqilmoqda";
        readonly unknown: "Noma'lum";
        readonly verifiedAt: "Tasdiqlangan: {date}";
        readonly rejectionReason: "Rad etish sababi:";
        readonly pendingHint: "So'rovingiz ko'rib chiqilmoqda. Natijani email orqali yuboramiz.";
        readonly emailVerified: "Email tasdiqlangan";
    };
    readonly errors: {
        readonly loadProfile: "Profilni yuklab bo'lmadi";
    };
    readonly validation: {
        readonly organizationNameMin: "Nom kamida 2 belgidan iborat bo'lishi kerak";
        readonly organizationNameMax: "Nom 100 belgidan oshmasligi kerak";
        readonly descriptionMax: "Tavsif 500 belgidan oshmasligi kerak";
        readonly invalidPhone: "Telefon raqami noto'g'ri";
        readonly innDigits: "STIR 9 dan 20 tagacha raqamdan iborat bo'lishi kerak";
        readonly max100: "Ko'pi bilan 100 belgi";
        readonly digitsOnly: "Faqat raqamlar";
        readonly firstNameMin: "Ism kamida 2 belgidan iborat bo'lishi kerak";
        readonly firstNameMax: "Ism 50 belgidan oshmasligi kerak";
        readonly lastNameMin: "Familiya kamida 2 belgidan iborat bo'lishi kerak";
        readonly lastNameMax: "Familiya 50 belgidan oshmasligi kerak";
        readonly positionMax: "Lavozim 100 belgidan oshmasligi kerak";
        readonly departmentMax: "Bo'lim 100 belgidan oshmasligi kerak";
        readonly max500: "Ko'pi bilan 500 belgi";
        readonly invalidWebsite: "Veb-sayt manzili noto'g'ri";
        readonly bioMax: "Ko'pi bilan 2000 belgi";
        readonly locationMax: "Ko'pi bilan 255 belgi";
    };
    readonly companyInfo: {
        readonly title: "Kompaniya ma'lumotlarini to'ldiring";
        readonly description: "Ishtirokchilar tashkilotingiz haqida ko'proq bilishi uchun kompaniya ma'lumotlarini kiriting.";
        readonly rootError: "Davom etishdan oldin kamida bitta maydonni to'ldiring.";
    };
    readonly actions: {
        readonly upload: "Yuklash";
        readonly uploadPhoto: "Foto yuklash";
        readonly saving: "Saqlanmoqda...";
        readonly saveChanges: "O'zgarishlarni saqlash";
        readonly completeSetup: "Sozlashni yakunlash";
    };
    readonly onboarding: {
        readonly title: "Profil sozlashni yakunlash";
        readonly memberDescription: "Barcha shaxsiy ma'lumotlar to'ldirilganini tasdiqlang";
        readonly organizationDescription: "Barcha kerakli ma'lumotlar to'ldirilganini tasdiqlang";
    };
    readonly batch1: {
        readonly memberProfileView: {
            readonly s001: "Профиль обновлён";
            readonly s002: "Не удалось обновить";
            readonly s003: "Фото загружено";
            readonly s004: "Не удалось загрузить";
            readonly s005: "Фото удалено";
            readonly s006: "Не удалось удалить";
            readonly s007: "Настройка завершена";
            readonly s008: "Ошибка";
            readonly s009: "Выберите изображение";
            readonly s010: "Максимальный размер — 5 МБ";
            readonly s011: "Активен";
            readonly s012: "Неактивен";
            readonly s013: "Ожидание";
            readonly s014: "Мой профиль";
            readonly s015: "Управляйте персональными данными";
            readonly s016: "Фото и контакты";
            readonly s017: "Загрузите фото профиля и проверьте контактные данные";
            readonly s018: "Email виден";
            readonly s019: "Email скрыт";
            readonly s020: "Телефон виден";
            readonly s021: "Телефон скрыт";
            readonly s022: "Не указана";
            readonly s023: "Зарегистрирован:";
            readonly s024: "Загрузить фото";
            readonly s025: "Удалить фото?";
            readonly s026: "Это действие нельзя отменить.";
            readonly s027: "Отмена";
            readonly s028: "Удалить";
            readonly s029: "Организация";
            readonly s030: "Информация о вашей организации";
            readonly s031: "Приватность";
            readonly s032: "Настройки видимости профиля";
            readonly s033: "Публичный профиль";
            readonly s034: "Да";
            readonly s035: "Нет";
            readonly s036: "Показывать email";
            readonly s037: "Показывать телефон";
            readonly s038: "Права доступа";
            readonly s039: "Ваши права в системе (";
            readonly s040: "Нет назначенных прав";
            readonly s041: "Личные данные";
            readonly s042: "Обновите ваши персональные данные";
            readonly s043: "Завершить настройку профиля";
            readonly s044: "Подтвердите, что вы заполнили все персональные данные";
            readonly s045: "Завершить настройку";
            readonly s046: "Обрезка фото";
            readonly s047: "Выберите область для фото профиля";
        };
    };
};
//# sourceMappingURL=profile.d.ts.map