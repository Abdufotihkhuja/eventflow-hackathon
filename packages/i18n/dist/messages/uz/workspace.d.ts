export declare const workspace: {
    readonly layout: {
        readonly navigationGroups: {
            readonly management: "Ish maydoni kataloglari";
            readonly organization: "Tashkilot";
            readonly account: "Hisob";
            readonly system: "Tizim";
        };
        readonly navigation: {
            readonly dashboard: "Panel";
            readonly myEvents: "Tadbirlar";
            readonly checkIn: "Chek-in";
            readonly myBlog: "Mening blogim";
            readonly users: "Xodimlar";
            readonly followers: "Obunachilar";
            readonly contacts: "Aloqa so'rovlari";
            readonly placesCatalog: "Maydonchalar katalogi";
            readonly myPlaces: "Mening maydonchalarim";
            readonly tasks: "Vazifalar";
            readonly board: "Doska";
            readonly profile: "Profil";
            readonly settings: "Sozlamalar";
            readonly billing: "Tariflar";
            readonly security: "Xavfsizlik";
        };
        readonly routes: {
            readonly home: "Bosh sahifa";
            readonly dashboard: {
                readonly title: "Boshqaruv paneli";
                readonly description: "Asosiy ko'rsatkichlar xulosasi";
            };
            readonly myEvents: {
                readonly title: "Mening tadbirlarim";
                readonly description: "Tadbirlarni boshqarish";
            };
            readonly users: {
                readonly title: "Xodimlar";
                readonly description: "Tashkilot xodimlarini boshqarish";
            };
            readonly boards: {
                readonly title: "Mening doskalarim";
                readonly description: "Vazifalar doskalarini boshqarish";
            };
            readonly profile: {
                readonly title: "Profil";
                readonly description: "Profilni boshqarish";
            };
            readonly settings: {
                readonly title: "Sozlamalar";
                readonly description: "Tizim konfiguratsiyasi";
            };
            readonly billing: {
                readonly title: "Tariflar va obuna";
                readonly description: "Tarif, narxlar va to'lov holati";
            };
            readonly security: {
                readonly title: "Xavfsizlik";
                readonly description: "Akkaunt xavfsizligini boshqarish";
            };
            readonly myBlog: {
                readonly title: "Mening blogim";
                readonly description: "Blog maqolalarini boshqarish";
            };
            readonly followers: {
                readonly title: "Obunachilar";
                readonly description: "Tashkilotga obuna bo'lgan foydalanuvchilar";
            };
            readonly contacts: {
                readonly title: "Aloqa so'rovlari";
                readonly description: "Foydalanuvchilarning tashkilot bilan aloqa so'rovlari";
            };
            readonly myPlaces: {
                readonly title: "Mening maydonchalarim";
                readonly description: "Ijara maydonchalaringiz katalogi";
            };
            readonly places: {
                readonly title: "Maydonchalar katalogi";
                readonly description: "Tadbirlar uchun maydonchalar";
            };
            readonly place: {
                readonly title: "Maydoncha";
                readonly description: "Maydoncha tafsilotlari";
            };
            readonly event: {
                readonly title: "Tadbir";
                readonly description: "Tadbir boshqaruv markazi";
            };
            readonly blogPost: {
                readonly title: "Maqola";
                readonly description: "Maqolani boshqarish";
            };
            readonly page: {
                readonly title: "Sahifa";
            };
        };
        readonly sidebar: {
            readonly collapse: "Yig'ish";
            readonly expand: "Yoyish";
            readonly inviteTitle: "Jamoangizni taklif qiling";
            readonly inviteBody: "Muharrirlar, eshik xodimlari va moliya — rollar ruxsatni belgilaydi.";
            readonly inviteCta: "Odamlarni taklif qilish";
            readonly logout: "Chiqish";
            readonly tipTitle: "Kun maslahati";
            readonly tipHotkeys: "Tez harakatlanish uchun klaviatura yorliqlaridan foydalaning";
        };
        readonly navbar: {
            readonly menu: "Menyu";
            readonly organizationInn: "Tashkilot STIRi";
            readonly inn: "STIR:";
            readonly notifications: "Bildirishnomalar";
            readonly viewPublicProfile: "Ommaviy profilni ochish";
            readonly language: "Til";
            readonly profile: "Profil";
            readonly personalCabinet: "Ishtirokchi shaxsiy kabineti";
            readonly settings: "Sozlamalar";
            readonly logout: "Chiqish";
            readonly defaultUser: "Foydalanuvchi";
            readonly adminUser: "Administrator";
        };
        readonly loading: {
            readonly page: "Sahifa yuklanmoqda...";
        };
        readonly home: {
            readonly title: "EventFlow'ga xush kelibsiz!";
            readonly description: "Tizimga muvaffaqiyatli kirdingiz.";
        };
        readonly theme: {
            readonly toggle: "Mavzuni almashtirish";
            readonly light: "Yorug'";
            readonly dark: "Qorong'i";
            readonly system: "Tizim";
        };
        readonly actions: {
            readonly createEvent: "Tadbir yaratish";
        };
    };
    readonly notifications: {
        readonly title: "Bildirishnomalar";
        readonly unreadCount: "O'qilmagan: {count}";
        readonly allRead: "Hammasi o'qilgan";
        readonly markAllRead: "Hammasini o'qilgan deb belgilash";
        readonly emptyTitle: "Hozircha bildirishnomalar yo'q";
        readonly emptyDescription: "Bu yerda jamoa voqealari chiqadi: arizalar, moderatsiya, takliflarga javoblar";
        readonly types: {
            readonly fallback: "Tashkilotda yangi voqea";
            readonly MEMBER_JOINED: "{personName} taklifni qabul qildi va jamoaga qo'shildi";
            readonly MEMBER_INVITE_DECLINED: "{personName} «{roleName}» roli bo'yicha taklifni rad etdi";
            readonly REGISTRATION_CREATED: "Tadbirga yangi ariza";
            readonly REGISTRATION_FIRST: "Tadbirga birinchi ro'yxatdan o'tish";
            readonly REGISTRATION_APPROVED: "Ariza tasdiqlandi";
            readonly REGISTRATION_REJECTED: "Ariza rad etildi";
            readonly EVENT_SUBMITTED: "Tadbir moderatsiyaga yuborildi";
            readonly EVENT_PUBLISHED: "Tadbir chop etildi";
            readonly EVENT_REJECTED: "Tadbir moderatsiyada rad etildi";
            readonly EVENT_CHANGES_REQUESTED: "Moderatsiya tadbir bo'yicha tuzatish so'radi";
            readonly CAPACITY_THRESHOLD: "Tadbir to'ldirilishi: {threshold}%";
            readonly TICKET_REFUND: "Chipta qaytarildi";
            readonly REGISTRATION_CLOSED: "Tadbirga ro'yxatdan o'tish yopildi";
            readonly EVENT_SUMMARY: "Tadbir yakunlari tayyor";
            readonly ORG_VERIFIED: "Tashkilot tasdiqlandi";
            readonly ORG_VERIFICATION_REJECTED: "Tashkilot tekshiruvi rad etildi";
        };
    };
    readonly access: {
        readonly checking: "Kirish tekshirilmoqda...";
        readonly deniedTitle: "Huquqlar yetarli emas";
        readonly deniedDescription: "Akkountingizda bu bo'limga kirish huquqi yo'q. Ish uchun kerak bo'lsa, tashkilot egasiga murojaat qiling.";
    };
    readonly footer: {
        readonly copyright: "© EventFlow - Tadbirlarni boshqarish platformasi";
    };
    readonly followers: {
        readonly title: "Obunachilar";
        readonly description: "Tashkilotingizga obuna bo'lgan foydalanuvchilar";
        readonly statsTotal: "Jami obunachilar";
        readonly searchPlaceholder: "Ism bo'yicha qidirish...";
        readonly emptyTitle: "Hozircha obunachilar yo'q";
        readonly emptyDescription: "Tashkilotga obuna bo'lgan foydalanuvchilar shu yerda ko'rinadi";
        readonly unnamed: "Ismsiz";
        readonly followedAt: "Obuna: {date}";
        readonly pageInfo: "Sahifa {page} / {total}";
        readonly colSubscriber: "Obunachi";
        readonly colFollowed: "Obuna sanasi";
        readonly export: "Eksport";
        readonly exporting: "Eksport qilinmoqda…";
        readonly exportEmpty: "Eksport uchun obunachilar yo'q";
        readonly exportError: "Obunachilarni eksport qilib bo'lmadi";
    };
    readonly places: {
        readonly access: {
            readonly ownerOnlyTitle: "Maydonchalar moduli faqat tashkilotchilar uchun mavjud";
            readonly ownerOnlyDescription: "Xodimlar tadbirlar va vazifalar bilan ishlashi mumkin, maydonchalarni boshqarish esa tashkilot egasida qoladi.";
            readonly editorOwnerOnlyTitle: "Maydonchalarni tahrirlash faqat tashkilotchilar uchun mavjud";
            readonly featureDisabledBadge: "Maydonchalar moduli hozircha o'chirilgan";
            readonly featureDisabledTitle: "Super-admin kirishni yoqqanda, bu yerda ijaraga beriladigan maydonchalar ish maydoni paydo bo'ladi";
            readonly featureDisabledDescription: "Faollashtirilgandan so'ng o'z maydonchalaringiz katalogini yaratish, kartalarni chop etish va boshqa tashkilotchilardan so'rovlar olish mumkin bo'ladi.";
            readonly openCatalog: "Ommaviy katalogni ochish";
            readonly platformSetupTitle: "Platforma tomonida nima tayyorlangan";
            readonly platformSetupDescription: "Swagger tashkilot uchun alohida `placesFeatureEnabled` bayrog'ini tasdiqlaydi. Tashkilotchi maydoncha yaratishi va chop etishi mumkinligini aynan shu belgilaydi.";
            readonly editorFeatureDisabledTitle: "Maydonchalar moduli tashkilotingiz uchun o'chirilgan";
            readonly editorFeatureDisabledDescription: "Tashkilot profilida `placesFeatureEnabled` ni yoqish uchun super-admin bilan bog'laning.";
        };
        readonly list: {
            readonly badge: "Rental places workspace";
            readonly colVenue: "Maydoncha";
            readonly colStatus: "Holat";
            readonly colAddress: "Manzil";
            readonly colCapacity: "Sig'im";
            readonly colPrice: "Narx";
            readonly showingCount: "{total} tadan {shown} ta maydoncha ko'rsatilmoqda";
            readonly tryChangingFilters: "Qidiruv yoki holat filtrini o'zgartiring";
            readonly title: "Mening maydonchalarim";
            readonly description: "Tashkilotchiga tez qaror qilishga yordam beradigan vitrina yarating: tushunarli suratlar, ochiq narx, manzil, sig'im va tez so'rov oqimi.";
            readonly add: "Maydoncha qo'shish";
            readonly searchPlaceholder: "Nomi, manzili yoki shahri bo'yicha qidirish";
            readonly statusPlaceholder: "Holat";
            readonly loading: "Maydonchalar yuklanmoqda...";
            readonly loadError: "Maydonchalarni yuklab bo'lmadi: {message}";
            readonly unknownError: "noma'lum xatolik";
            readonly emptyTitle: "Hozircha maydoncha yo'q";
            readonly emptyDescription: "Bitta kuchli kartadan boshlang: suratlar, haqiqiy sig'im, qulayliklar va aniq narx.";
            readonly createFirst: "Birinchi maydonchani yaratish";
            readonly viewCatalog: "Katalogni ko'rish";
            readonly emptyTipCover: "Kuchli muqova qo'shing";
            readonly emptyTipCapacity: "Haqiqiy sig'imni ko'rsating";
            readonly emptyTipAmenities: "Qulayliklarni aniq tasvirlang";
            readonly noImage: "Rasm yo'q";
            readonly fromPrice: "{price}{suffix} dan";
            readonly guestsUpTo: "{capacity} nafargacha mehmon";
            readonly noPrice: "Narx ko'rsatilmagan";
            readonly pageInfo: "{page}-sahifa / {total}";
            readonly deleteTitle: "Maydonchani o'chirish?";
            readonly deleteDescription: "«{title}» maydonchasi tiklab bo'lmaydigan qilib o'chiriladi.";
            readonly deleteFallbackDescription: "Maydoncha tiklab bo'lmaydigan qilib o'chiriladi.";
        };
        readonly stats: {
            readonly total: "Jami maydonchalar";
            readonly published: "Chop etilgan";
            readonly drafts: "Qoralamalar";
            readonly archived: "Arxivda";
        };
        readonly statusFilter: {
            readonly all: "Barcha holatlar";
            readonly draft: "Qoralamalar";
            readonly published: "Chop etilgan";
            readonly archived: "Arxiv";
        };
        readonly catalog: {
            readonly badge: "EventFlow places";
            readonly title: "Taqqoslash oson va tez bron qilinadigan tadbir maydonchalari";
            readonly description: "Katalog amaliy qarorlar atrofida qurilgan: aniq suratlar, ochiq narx, aniq manzil, sig'im va tez so'rovga o'tish.";
            readonly searchPlaceholder: "Nomi yoki tumani bo'yicha qidirish";
            readonly cityPlaceholder: "Shahar";
            readonly currencyPlaceholder: "Valyuta";
            readonly allCurrencies: "Barcha valyutalar";
            readonly sortPlaceholder: "Saralash";
            readonly nearby: "Yaqin";
            readonly minPrice: "Narx dan";
            readonly maxPrice: "Narx gacha";
            readonly found: "Topilgan maydonchalar: {count}";
            readonly geolocationUnavailable: "Bu brauzerda geolokatsiya mavjud emas";
            readonly geolocationError: "Joylashuvingizni aniqlab bo'lmadi";
            readonly loading: "Katalog yuklanmoqda...";
            readonly loadError: "Katalogni yuklab bo'lmadi: {message}";
            readonly emptyTitle: "Maydonchalar hozircha topilmadi";
            readonly emptyDescription: "Filtrlarni kengaytirib ko'ring yoki saralashni o'zgartiring. Katalog live API ga ulangan va chop etilgan maydonchalar bilan to'lib boradi.";
            readonly noPhoto: "Rasm yo'q";
            readonly defaultCity: "O'zbekiston";
            readonly perHour: "/soat";
            readonly perDay: "/kun";
        };
        readonly sort: {
            readonly newest: "Avval yangilari";
            readonly priceAsc: "Avval arzonlari";
            readonly priceDesc: "Avval qimmatroqlari";
            readonly nearest: "Menga yaqin";
        };
        readonly editor: {
            readonly backToList: "Ro'yxatga qaytish";
            readonly badgeEdit: "Kartani nozik sozlash";
            readonly badgeNew: "Yangi maydoncha";
            readonly titleEditFallback: "Maydonchani tahrirlash";
            readonly titleCreate: "Maydoncha yaratish";
            readonly description: "Kartani amaliy qiling: kuchli birinchi surat, ochiq narx, tushunarli sig'im va aniq geolokatsiya.";
            readonly publicCard: "Ommaviy karta";
            readonly publish: "Chop etish";
            readonly archive: "Arxivga";
            readonly save: "Saqlash";
            readonly loading: "Maydoncha yuklanmoqda...";
            readonly uploadImagesError: "Rasmlarni yuklab bo'lmadi";
            readonly saveError: "Maydonchani saqlab bo'lmadi";
            readonly fields: {
                readonly title: "Maydoncha nomi";
                readonly slug: "Slug";
                readonly city: "Shahar";
                readonly shortDescription: "Qisqa tavsif";
                readonly fullDescription: "To'liq tavsif";
                readonly currency: "Valyuta";
                readonly capacity: "Sig'im";
                readonly address: "Manzil";
                readonly addressNotes: "Mo'ljal va kirish tafsilotlari";
            };
            readonly placeholders: {
                readonly city: "Toshkent";
                readonly shortDescription: "Tashkilotchi 10 soniyada maydoncha haqida nimani tushunadi";
                readonly fullDescription: "Muhit, foydalanish ssenariylari, cheklovlar, texnik baza va qo'shimcha shartlarni tasvirlang";
                readonly hourlyConditions: "Kamida 2 soat. Keyingi har bir soat alohida to'lanadi.";
                readonly dailyConditions: "Kirish 14:00 dan, chiqish keyingi kuni 12:00 gacha.";
                readonly address: "Toshkent sh., Navoiy ko'chasi, 12";
                readonly addressNotes: "Masalan: 3-qavat, avtoturargoh tomondan kirish";
            };
            readonly validation: {
                readonly titleRequired: "Maydoncha nomini kiriting";
                readonly invalidSlug: "Slug faqat a-z, 0-9 va defisdan iborat bo'lishi mumkin";
                readonly priceRequired: "Kamida bitta narxni kiriting: soatbay yoki kunlik";
                readonly addressRequired: "Manzilni kiriting";
                readonly mapPointRequired: "Xaritada nuqtani tanlang";
                readonly imageRequired: "Kamida bitta rasm qo'shing";
            };
            readonly pricing: {
                readonly title: "Ijara tariflari";
                readonly description: "Kamida bitta tarif kiriting. Ikkalasini ham berish mumkin; ijarachi so'rov yuborishda tanlaydi.";
                readonly hourly: "Soatbay ijara";
                readonly pricePerHour: "Bir soat narxi";
                readonly daily: "Kunlik ijara";
                readonly pricePerDay: "Bir sutka narxi";
                readonly conditions: "Shartlar";
                readonly optional: "(ixtiyoriy)";
            };
            readonly photos: {
                readonly title: "Rasmlar";
                readonly description: "Birinchi rasm katalog muqovasi sifatida ishlatiladi.";
                readonly upload: "Yuklash";
                readonly dropzone: "Rasmlarni tashlang yoki fayllarni tanlang";
                readonly alt: "Maydoncha rasmi {index}";
                readonly cover: "Muqova";
                readonly photo: "Rasm {index}";
            };
            readonly amenities: {
                readonly title: "Qulayliklar";
                readonly description: "Maydonchada haqiqatan mavjud bo'lganlarini tanlang.";
            };
            readonly location: {
                readonly title: "Xaritadagi joylashuv";
                readonly description: "Bu karta va yaqin atrof qidiruviga ta'sir qiladi.";
            };
            readonly preview: {
                readonly title: "Karta prevyusi";
                readonly coverPlaceholder: "Muqova shu yerda paydo bo'ladi";
                readonly titlePlaceholder: "Maydoncha nomi";
                readonly cityPlaceholder: "Shahar";
                readonly guestsUpTo: "{capacity} nafargacha mehmon";
                readonly perHour: "/soat";
                readonly perDay: "/kun";
                readonly noPrice: "Narx ko'rsatilmagan";
                readonly descriptionPlaceholder: "Qisqa tavsif maydonchaning kuchli tomonlarini tezroq tushunishga yordam beradi.";
                readonly addressPlaceholder: "Manzil to'ldirilgandan keyin paydo bo'ladi";
            };
            readonly delete: "Maydonchani o'chirish";
            readonly deleteTitle: "Maydonchani o'chirish?";
            readonly unnamed: "nomsiz";
        };
    };
};
//# sourceMappingURL=workspace.d.ts.map