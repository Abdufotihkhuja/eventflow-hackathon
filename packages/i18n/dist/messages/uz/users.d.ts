export declare const users: {
    readonly title: "Foydalanuvchilar";
    readonly role: {
        readonly owner: "Egasi";
        readonly admin: "Administrator";
        readonly eventManager: "Tadbirlar menejeri";
        readonly eventCoordinator: "Tadbirlar koordinatori";
        readonly support: "Qo'llab-quvvatlash";
        readonly viewer: "Kuzatuvchi";
    };
    readonly roleDescription: {
        readonly owner: "Tizimning barcha funksiyalariga to'liq kirish";
        readonly admin: "Tadbirlar, foydalanuvchilar va sozlamalarni boshqarish";
        readonly eventManager: "Tadbirlar yaratish va tahrirlash, ishtirokchilarni boshqarish";
        readonly eventCoordinator: "Ishtirokchilarni boshqarish va tadbirlarni muvofiqlashtirish";
        readonly support: "Ma'lumotlarni ko'rish va foydalanuvchilarga yordam berish";
        readonly viewer: "Statistika va tadbir ma'lumotlarini ko'rish";
    };
    readonly status: {
        readonly active: "Faol";
        readonly inactive: "Nofaol";
        readonly invited: "Taklif qilingan";
        readonly suspended: "To'xtatilgan";
    };
    readonly page: {
        readonly kicker: "Tashkilot";
        readonly title: "Jamoa";
        readonly invitePeople: "Odamlarni taklif qilish";
        readonly you: "Siz";
        readonly tabAll: "Barchasi";
        readonly colName: "Ism";
        readonly colEmail: "Email";
        readonly colRole: "Rol";
        readonly colAdded: "Qo'shilgan";
        readonly colStatus: "Holat";
        readonly pendingTitle: "Kutilayotgan takliflar: {count}";
        readonly pendingNames: "{names} hali taklifni qabul qilmadi";
        readonly resendAll: "Qayta yuborish";
        readonly pendingSubtitle: "Taklif qabul qilinishini kutmoqda";
        readonly declinedTitle: "Rad etganlar: {count}";
        readonly declinedSubtitle: "Taklif rad etildi — keyinroq yoki boshqa odamni taklif qilish mumkin";
        readonly declinedNoReason: "Izohsiz";
        readonly revoke: "Bekor qilish";
        readonly invitesResent: "{count} ta taklif qayta yuborildi";
        readonly rolesTitle: "Rollar va ruxsatlar";
        readonly rolesDescription: "Har bir rol tashkilotda nima qila oladi";
        readonly capability: "Imkoniyat";
        readonly permFull: "To'liq";
        readonly permPartial: "Qisman";
        readonly noAccessTitle: "Jamoaga kirish yo'q";
        readonly noAccessDescription: "Sizda jamoa a'zolarini ko'rish yoki boshqarish huquqi yo'q.";
        readonly notSpecified: "Ko'rsatilmagan";
        readonly configureAccess: "Kirishni sozlash";
        readonly resendInvite: "Taklifni qayta yuborish";
        readonly unblock: "Blokdan chiqarish";
        readonly block: "Bloklash";
        readonly added: "Qo'shilgan";
        readonly statsTotal: "Jami";
        readonly statsActive: "Faol";
        readonly statsInvited: "Taklif qilingan";
        readonly statsSuspended: "To'xtatilgan";
        readonly innRequiredTitle: "Tashkilot STIR talab qilinadi";
        readonly innRequiredDescription: "Xodimlarni qo'shish uchun profilda tashkilot STIRini kiriting. Xodimlarga tizimga kirish uchun STIR kerak.";
        readonly goToProfile: "Profilga o'tish";
        readonly teamManagement: "Jamoani boshqarish";
        readonly teamDescription: "Xodimlarni qo'shing va kirish huquqlarini sozlang";
        readonly addEmployee: "Xodim qo'shish";
        readonly allRoles: "Barcha rollar";
        readonly noEmployees: "Xodimlar topilmadi";
        readonly tryChangingFilters: "Filtrlarni o'zgartirib ko'ring";
        readonly addFirstEmployee: "Birinchi xodimni qo'shing";
        readonly filters: "Filtrlar:";
        readonly searchPlaceholder: "Ism yoki email bo'yicha qidirish...";
        readonly allStatuses: "Barcha holatlar";
        readonly editEmployee: "Xodimni tahrirlash";
        readonly addEmployeeTitle: "Xodim qo'shish";
        readonly editEmployeeDescription: "Xodim ma'lumotlarini o'zgartiring";
        readonly addEmployeeDescription: "Yangi xodim uchun ma'lumotlarni to'ldiring";
        readonly deleteTitle: "Xodim o'chirilsinmi?";
        readonly deleteDescription: "Haqiqatan ham {name} xodimini o'chirmoqchimisiz?";
        readonly manageAccess: "Kirishni boshqarish";
        readonly manageAccessDescription: "{name} uchun individual huquqlarni sozlang";
        readonly openMenu: "Menyuni ochish";
        readonly configureAccessAction: "Kirishni sozlash";
        readonly sendInviteAgain: "Taklifni qayta yuborish";
    };
    readonly form: {
        readonly email: "Email";
        readonly emailPlaceholder: "user@example.com";
        readonly emailDescription: "Kirish va bildirishnomalar uchun email";
        readonly password: "Parol";
        readonly passwordPlaceholder: "Kamida 8 ta belgi";
        readonly passwordDescription: "Tizimga kirish paroli (kamida 8 ta belgi)";
        readonly firstName: "Ism";
        readonly firstNamePlaceholder: "Ali";
        readonly lastName: "Familiya";
        readonly lastNamePlaceholder: "Valiyev";
        readonly role: "Rol";
        readonly selectRole: "Rolni tanlang";
        readonly phone: "Telefon";
        readonly position: "Lavozim";
        readonly positionPlaceholder: "Event Manager";
        readonly department: "Bo'lim";
        readonly departmentPlaceholder: "Marketing";
        readonly sendInvitation: "Emailga taklif yuborish";
        readonly sendInvitationDescription: "Xodim akkauntni faollashtirish bo'yicha ko'rsatmalar bilan xat oladi";
        readonly saveChanges: "O'zgarishlarni saqlash";
        readonly createEmployee: "Xodim yaratish";
        readonly validation: {
            readonly emailRequired: "Email majburiy";
            readonly invalidEmail: "Email formati noto'g'ri";
            readonly firstNameRequired: "Ism majburiy";
            readonly lastNameRequired: "Familiya majburiy";
            readonly invalidPhone: "Telefon formati noto'g'ri";
            readonly roleRequired: "Rolni tanlang";
            readonly passwordRequired: "Taklif yuborilmasa, parol majburiy (kamida 8 ta belgi)";
        };
    };
    readonly permissionEditor: {
        readonly baseRole: "Asosiy rol: {role}";
        readonly baseRoleDescription: "Roldan kelgan huquqlar qalqon belgisi bilan belgilangan va o'chirib bo'lmaydi. Quyida qo'shimcha huquqlar (yashil) qo'shishingiz mumkin.";
        readonly rolePermission: "\"{role}\" rolidan huquq";
        readonly savingChanges: "O'zgarishlar saqlanmoqda...";
        readonly roleRights: "Rol huquqlari";
        readonly individualRights: "Individual huquqlar";
        readonly resources: {
            readonly dashboard: "Panel";
            readonly events: "Tadbirlar";
            readonly speakers: "Ma'ruzachilar";
            readonly agenda: "Dastur";
            readonly questions: "Ro'yxatdan o'tish savollari";
            readonly tickets: "Chiptalar";
            readonly certificates: "Sertifikatlar";
            readonly artifact_recipients: "Artefakt oluvchilar";
            readonly recipient_roles: "Oluvchi rollari";
            readonly mail: "Pochta yuborish";
            readonly registrations: "Ro'yxatga olishlar";
            readonly attendance: "Davomat";
            readonly boards: "Doskalar";
            readonly columns: "Ustunlar";
            readonly tasks: "Vazifalar";
            readonly comments: "Izohlar";
            readonly checklists: "Nazorat ro'yxatlari";
            readonly tags: "Teglar";
            readonly attachments: "Ilovalar";
            readonly blog: "Blog";
            readonly followers: "Obunachilar";
            readonly contacts: "Bog'lanish so'rovlari";
            readonly places: "Maydonchalar";
            readonly members: "Xodimlar";
            readonly roles: "Rollar";
            readonly settings: "Sozlamalar";
            readonly organization: "Tashkilot";
            readonly uploads: "Yuklamalar";
            readonly billing: "Tariflar";
            readonly analytics: "Analitika";
        };
        readonly loadErrorTitle: "Huquqlar katalogini yuklab bo'lmadi";
        readonly loadErrorDescription: "Ulanishni tekshiring yoki qayta urinib ko'ring. Texnik sabab:";
        readonly emptyCatalogTitle: "Huquqlar katalogi bo'sh";
        readonly emptyCatalogDescription: "Tizimda huquqlar sozlanmagan. Kirishni boshqarishdan oldin migratsiya va seed ni ishga tushiring.";
        readonly retry: "Qayta urinish";
        readonly actions: {
            readonly create: "Yaratish";
            readonly read: "Ko'rish";
            readonly update: "Tahrirlash";
            readonly delete: "O'chirish";
            readonly manage: "Boshqarish";
            readonly view: "Ko'rish";
            readonly edit: "Tahrirlash";
            readonly publish: "Chop etish";
            readonly approve: "Tasdiqlash";
            readonly reject: "Rad etish";
            readonly send: "Yuborish";
            readonly export: "Eksport";
            readonly import: "Import";
            readonly checkin: "Check-in";
            readonly generate: "Generatsiya";
            readonly archive: "Arxivlash";
            readonly assign: "Tayinlash";
            readonly move: "Ko'chirish";
            readonly invite: "Taklif";
        };
        readonly modules: {
            readonly dashboard: "Panel";
            readonly events: "Tadbirlar";
            readonly participants: "Ishtirokchilar";
            readonly checkin: "Check-in";
            readonly board: "Doska";
            readonly blog: "Blog";
            readonly followers: "Obunachilar";
            readonly requests: "So'rovlar";
            readonly places: "Maydonlar";
            readonly users: "Foydalanuvchilar";
            readonly billing: "Tariflar/To'lov";
            readonly members: "Xodimlar";
            readonly roles: "Rollar";
            readonly registrations: "Ro'yxatdan o'tishlar";
            readonly attendance: "Davomat";
            readonly certificates: "Sertifikatlar";
            readonly speakers: "Spikerlar";
            readonly agenda: "Dastur";
            readonly mail: "Xabarlar";
            readonly boards: "Doskalar";
            readonly tasks: "Vazifalar";
            readonly organization: "Tashkilot";
            readonly analytics: "Analitika";
            readonly settings: "Sozlamalar";
            readonly questions: "Ro'yxatdan o'tish savollari";
            readonly tickets: "Chiptalar";
            readonly columns: "Ustunlar";
            readonly comments: "Izohlar";
            readonly checklists: "Cheklistlar";
            readonly tags: "Teglar";
            readonly attachments: "Biriktirmalar";
            readonly uploads: "Yuklamalar";
        };
        readonly moduleDescriptions: {
            readonly dashboard: "Tashkilotchi bosh paneliga kirish";
            readonly events: "Tadbirlarni yaratish va boshqarish";
            readonly participants: "Ro'yxatdan o'tishlar, ishtirokchilar va eksport";
            readonly checkin: "QR check-in va davomat hisobotlari";
            readonly board: "Doskalar, vazifalar, izohlar va biriktirmalar";
            readonly blog: "Tashkilot maqolalari va blog chop etish";
            readonly followers: "Tashkilot ommaviy profiliga obunachilar";
            readonly requests: "Tashkilotga yuborilgan aloqa so'rovlari";
            readonly places: "Maydonlar katalogi va ijara so'rovlari";
            readonly users: "Xodimlar, rollar va kirishni boshqarish";
            readonly billing: "Tariflar, to'lovlar va pullik qo'shimchalar";
            readonly members: "Tashkilot xodimlarini boshqarish";
            readonly roles: "Rollar va kirish huquqlarini sozlash";
            readonly registrations: "Ishtirokchilar ro'yxatdan o'tishlari bilan ishlash";
            readonly attendance: "Tadbirlarda davomatni belgilash";
            readonly certificates: "Sertifikatlarni yaratish va boshqarish";
            readonly speakers: "Tadbir spikerlarini boshqarish";
            readonly agenda: "Tadbir dasturini sozlash";
            readonly mail: "Ishtirokchilarga xabarlar yuborish";
            readonly boards: "Vazifalarni boshqarish doskalari";
            readonly tasks: "Doskalardagi vazifalar bilan ishlash";
            readonly organization: "Tashkilot sozlamalari";
            readonly analytics: "Statistika va hisobotlarni ko'rish";
            readonly settings: "Tizim sozlamalari";
            readonly questions: "Ro'yxatdan o'tish formasi savollari";
            readonly tickets: "Chipta turlarini boshqarish";
            readonly columns: "Doska ustunlarini boshqarish";
            readonly comments: "Vazifa izohlari";
            readonly checklists: "Vazifa cheklistlari";
            readonly tags: "Vazifa teglari";
            readonly attachments: "Vazifa biriktirmalari";
            readonly uploads: "Tizimga fayl yuklash";
        };
    };
    readonly permissions: {
        readonly groups: {
            readonly events: {
                readonly label: "Tadbirlar";
                readonly description: "Tadbirlarni boshqarish";
            };
            readonly participants: {
                readonly label: "Ishtirokchilar";
                readonly description: "Tadbir ishtirokchilari bilan ishlash";
            };
            readonly analytics: {
                readonly label: "Analitika";
                readonly description: "Statistika va hisobotlarga kirish";
            };
            readonly users: {
                readonly label: "Foydalanuvchilar";
                readonly description: "Jamoani boshqarish";
            };
            readonly settings: {
                readonly label: "Sozlamalar";
                readonly description: "Tizim konfiguratsiyasi";
            };
        };
        readonly items: {
            readonly eventsView: {
                readonly label: "Tadbirlarni ko'rish";
                readonly description: "Tadbirlar ro'yxati va tafsilotlarini ko'rish";
            };
            readonly eventsCreate: {
                readonly label: "Tadbirlar yaratish";
                readonly description: "Yangi tadbirlar yaratish";
            };
            readonly eventsEdit: {
                readonly label: "Tadbirlarni tahrirlash";
                readonly description: "Mavjud tadbirlarni o'zgartirish";
            };
            readonly eventsPublish: {
                readonly label: "Tadbirlarni chop etish";
                readonly description: "Tadbir qoralamalarini chop etish";
            };
            readonly eventsDelete: {
                readonly label: "Tadbirlarni o'chirish";
                readonly description: "Tadbirlarni o'chirish";
            };
            readonly participantsView: {
                readonly label: "Ishtirokchilarni ko'rish";
                readonly description: "Ishtirokchilar ro'yxatini ko'rish";
            };
            readonly participantsManage: {
                readonly label: "Ishtirokchilarni boshqarish";
                readonly description: "Ishtirokchilarni qo'shish, tahrirlash va o'chirish";
            };
            readonly participantsExport: {
                readonly label: "Ishtirokchilarni eksport qilish";
                readonly description: "Ishtirokchilar ro'yxatini eksport qilish";
            };
            readonly analyticsView: {
                readonly label: "Analitikani ko'rish";
                readonly description: "Dashboard va statistikaga kirish";
            };
            readonly analyticsExport: {
                readonly label: "Hisobotlarni eksport qilish";
                readonly description: "Ma'lumotlar va hisobotlarni eksport qilish";
            };
            readonly usersView: {
                readonly label: "Foydalanuvchilarni ko'rish";
                readonly description: "Jamoa ro'yxatini ko'rish";
            };
            readonly usersInvite: {
                readonly label: "Foydalanuvchilarni taklif qilish";
                readonly description: "Yangi foydalanuvchilarga taklif yuborish";
            };
            readonly usersManage: {
                readonly label: "Foydalanuvchilarni boshqarish";
                readonly description: "Foydalanuvchilar va huquqlarni to'liq boshqarish";
            };
            readonly settingsView: {
                readonly label: "Sozlamalarni ko'rish";
                readonly description: "Tizim sozlamalarini ko'rish";
            };
            readonly settingsManage: {
                readonly label: "Sozlamalarni boshqarish";
                readonly description: "Tizim sozlamalarini o'zgartirish";
            };
        };
    };
};
//# sourceMappingURL=users.d.ts.map