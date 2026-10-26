export declare const profile: {
    readonly page: {
        readonly accountKicker: "Account";
        readonly memberTitle: "My profile";
        readonly memberDescription: "Manage personal details";
        readonly organizationTitle: "Organization profile";
        readonly organizationDescription: "Manage your organization data";
    };
    readonly status: {
        readonly active: "Active";
        readonly inactive: "Inactive";
        readonly pending: "Pending";
    };
    readonly cards: {
        readonly photoAndContacts: "Photo and contacts";
        readonly photoAndContactsDescription: "Upload a profile photo and check contact details";
        readonly logoAndContacts: "Logo and contacts";
        readonly logoAndContactsDescription: "Upload a logo and provide contact details";
        readonly organization: "Organization";
        readonly organizationDescription: "Information about your organization";
        readonly organizationInfo: "Organization information";
        readonly organizationInfoDescription: "Update your organization details. This information is shown publicly.";
        readonly privacy: "Privacy";
        readonly privacyDescription: "Profile visibility settings";
        readonly permissions: "Permissions";
        readonly permissionsDescription: "Your system permissions ({count})";
        readonly noPermissions: "No permissions assigned";
        readonly personalData: "Personal data";
        readonly personalDataDescription: "Update your personal data";
    };
    readonly fields: {
        readonly organizationName: "Organization name";
        readonly description: "Description";
        readonly phone: "Phone";
        readonly inn: "Organization TIN";
        readonly industry: "Industry";
        readonly companySize: "Company size";
        readonly firstName: "First name";
        readonly lastName: "Last name";
        readonly position: "Position";
        readonly department: "Department";
        readonly website: "Website";
        readonly address: "Address";
        readonly bio: "About";
        readonly location: "Location";
    };
    readonly placeholders: {
        readonly organizationName: "Enter organization name";
        readonly description: "Tell people about your organization...";
        readonly industry: "For example: IT, Education, Healthcare";
        readonly companySize: "For example: 10";
        readonly firstName: "Enter first name";
        readonly lastName: "Enter last name";
        readonly position: "For example: Manager";
        readonly department: "For example: Marketing";
        readonly website: "For example: https://example.com";
        readonly address: "City, street, building";
        readonly bio: "Tell colleagues a little about yourself...";
        readonly location: "For example: Tashkent, Uzbekistan";
    };
    readonly descriptions: {
        readonly organizationDescription: "Short organization summary (max. 500 characters)";
        readonly innRequired: "TIN is required for employee sign-in";
        readonly website: "A link to your organization's website";
    };
    readonly visibility: {
        readonly publicProfile: "Public profile";
        readonly showEmail: "Show email";
        readonly showPhone: "Show phone";
        readonly yes: "Yes";
        readonly no: "No";
        readonly emailVisible: "Email visible";
        readonly emailHidden: "Email hidden";
        readonly phoneVisible: "Phone visible";
        readonly phoneHidden: "Phone hidden";
        readonly publicProfileHint: "Visible to other members of your organization";
        readonly showEmailHint: "Show your email to other members";
        readonly showPhoneHint: "Show your phone to other members";
    };
    readonly misc: {
        readonly notSpecified: "Not specified";
        readonly registered: "Registered: {date}";
    };
    readonly dialogs: {
        readonly deletePhotoTitle: "Delete photo?";
        readonly deleteLogoTitle: "Delete logo?";
        readonly irreversible: "This action cannot be undone.";
    };
    readonly crop: {
        readonly photoTitle: "Crop photo";
        readonly photoDescription: "Select the area for the profile photo";
        readonly logoTitle: "Crop logo";
        readonly logoDescription: "Select the area for the organization logo";
    };
    readonly emailVerification: {
        readonly title: "Email verification";
        readonly description: "Your email is not verified. Send a code to {email} and enter it below.";
        readonly sendCode: "Send code";
        readonly codePlaceholder: "6-digit code";
        readonly verify: "Verify";
        readonly resendCode: "Resend code";
    };
    readonly verification: {
        readonly title: "Verification status";
        readonly description: "Your organization verification status";
        readonly verified: "Verified";
        readonly verifiedDescription: "Your organization has successfully passed verification";
        readonly rejected: "Rejected";
        readonly rejectedDescription: "Verification was rejected";
        readonly pending: "In review";
        readonly pendingDescription: "Your request is being reviewed";
        readonly unknown: "Unknown";
        readonly verifiedAt: "Verified: {date}";
        readonly rejectionReason: "Rejection reason:";
        readonly pendingHint: "Your request is being reviewed. We will notify you of the result by email.";
        readonly emailVerified: "Email verified";
    };
    readonly errors: {
        readonly loadProfile: "Failed to load profile";
    };
    readonly validation: {
        readonly organizationNameMin: "Name must contain at least 2 characters";
        readonly organizationNameMax: "Name must not exceed 100 characters";
        readonly descriptionMax: "Description must not exceed 500 characters";
        readonly invalidPhone: "Invalid phone number";
        readonly innDigits: "TIN must contain 9 to 20 digits";
        readonly max100: "Maximum 100 characters";
        readonly digitsOnly: "Digits only";
        readonly firstNameMin: "First name must contain at least 2 characters";
        readonly firstNameMax: "First name must not exceed 50 characters";
        readonly lastNameMin: "Last name must contain at least 2 characters";
        readonly lastNameMax: "Last name must not exceed 50 characters";
        readonly positionMax: "Position must not exceed 100 characters";
        readonly departmentMax: "Department must not exceed 100 characters";
        readonly max500: "Maximum 500 characters";
        readonly invalidWebsite: "Invalid website address";
        readonly bioMax: "Maximum 2000 characters";
        readonly locationMax: "Maximum 255 characters";
    };
    readonly companyInfo: {
        readonly title: "Complete company details";
        readonly description: "Add company details so participants can learn more about your organization.";
        readonly rootError: "Fill in at least one field before continuing.";
    };
    readonly actions: {
        readonly upload: "Upload";
        readonly uploadPhoto: "Upload photo";
        readonly saving: "Saving...";
        readonly saveChanges: "Save changes";
        readonly completeSetup: "Complete setup";
    };
    readonly onboarding: {
        readonly title: "Complete profile setup";
        readonly memberDescription: "Confirm that all personal data is filled in";
        readonly organizationDescription: "Confirm that all required details are filled in";
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