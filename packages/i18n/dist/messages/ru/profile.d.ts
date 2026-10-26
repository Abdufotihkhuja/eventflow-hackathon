export declare const profile: {
    readonly page: {
        readonly accountKicker: "Аккаунт";
        readonly memberTitle: "Мой профиль";
        readonly memberDescription: "Управляйте персональными данными";
        readonly organizationTitle: "Профиль организации";
        readonly organizationDescription: "Управляйте данными вашей организации";
    };
    readonly status: {
        readonly active: "Активен";
        readonly inactive: "Неактивен";
        readonly pending: "Ожидание";
    };
    readonly cards: {
        readonly photoAndContacts: "Фото и контакты";
        readonly photoAndContactsDescription: "Загрузите фото профиля и проверьте контактные данные";
        readonly logoAndContacts: "Логотип и контакты";
        readonly logoAndContactsDescription: "Загрузите логотип и укажите контактную информацию";
        readonly organization: "Организация";
        readonly organizationDescription: "Информация о вашей организации";
        readonly organizationInfo: "Информация об организации";
        readonly organizationInfoDescription: "Обновите данные вашей организации. Эти данные отображаются публично.";
        readonly privacy: "Приватность";
        readonly privacyDescription: "Настройки видимости профиля";
        readonly permissions: "Права доступа";
        readonly permissionsDescription: "Ваши права в системе ({count})";
        readonly noPermissions: "Нет назначенных прав";
        readonly personalData: "Личные данные";
        readonly personalDataDescription: "Обновите ваши персональные данные";
    };
    readonly fields: {
        readonly organizationName: "Название организации";
        readonly description: "Описание";
        readonly phone: "Телефон";
        readonly inn: "ИНН организации";
        readonly industry: "Отрасль";
        readonly companySize: "Количество сотрудников";
        readonly firstName: "Имя";
        readonly lastName: "Фамилия";
        readonly position: "Должность";
        readonly department: "Отдел";
        readonly website: "Веб-сайт";
        readonly address: "Адрес";
        readonly bio: "О себе";
        readonly location: "Местоположение";
    };
    readonly placeholders: {
        readonly organizationName: "Введите название организации";
        readonly description: "Расскажите о вашей организации...";
        readonly industry: "Например: IT, Образование, Медицина";
        readonly companySize: "Например: 10";
        readonly firstName: "Введите имя";
        readonly lastName: "Введите фамилию";
        readonly position: "Например: Менеджер";
        readonly department: "Например: Маркетинг";
        readonly website: "Например: https://example.com";
        readonly address: "Город, улица, дом";
        readonly bio: "Расскажите немного о себе...";
        readonly location: "Например: Ташкент, Узбекистан";
    };
    readonly descriptions: {
        readonly organizationDescription: "Краткая информация об организации (макс. 500 символов)";
        readonly innRequired: "ИНН необходим для входа сотрудников в систему";
        readonly website: "Ссылка на сайт вашей организации";
    };
    readonly visibility: {
        readonly publicProfile: "Публичный профиль";
        readonly showEmail: "Показывать email";
        readonly showPhone: "Показывать телефон";
        readonly yes: "Да";
        readonly no: "Нет";
        readonly emailVisible: "Email виден";
        readonly emailHidden: "Email скрыт";
        readonly phoneVisible: "Телефон виден";
        readonly phoneHidden: "Телефон скрыт";
        readonly publicProfileHint: "Виден другим сотрудникам организации";
        readonly showEmailHint: "Показывать email другим сотрудникам";
        readonly showPhoneHint: "Показывать телефон другим сотрудникам";
    };
    readonly misc: {
        readonly notSpecified: "Не указана";
        readonly registered: "Зарегистрирован: {date}";
    };
    readonly dialogs: {
        readonly deletePhotoTitle: "Удалить фото?";
        readonly deleteLogoTitle: "Удалить логотип?";
        readonly irreversible: "Это действие нельзя отменить.";
    };
    readonly crop: {
        readonly photoTitle: "Обрезка фото";
        readonly photoDescription: "Выберите область для фото профиля";
        readonly logoTitle: "Обрезка логотипа";
        readonly logoDescription: "Выберите область для логотипа организации";
    };
    readonly emailVerification: {
        readonly title: "Подтверждение почты";
        readonly description: "Ваша почта не подтверждена. Отправьте код на {email} и введите его ниже.";
        readonly sendCode: "Отправить код";
        readonly codePlaceholder: "6-значный код";
        readonly verify: "Подтвердить";
        readonly resendCode: "Переотправить код";
    };
    readonly verification: {
        readonly title: "Статус верификации";
        readonly description: "Статус проверки вашей организации";
        readonly verified: "Верифицирована";
        readonly verifiedDescription: "Ваша организация успешно прошла верификацию";
        readonly rejected: "Отклонена";
        readonly rejectedDescription: "Верификация была отклонена";
        readonly pending: "На рассмотрении";
        readonly pendingDescription: "Ваша заявка находится на рассмотрении";
        readonly unknown: "Неизвестно";
        readonly verifiedAt: "Верифицирована: {date}";
        readonly rejectionReason: "Причина отказа:";
        readonly pendingHint: "Ваша заявка находится на рассмотрении. Мы уведомим вас о результате по email.";
        readonly emailVerified: "Email подтверждён";
    };
    readonly errors: {
        readonly loadProfile: "Ошибка загрузки профиля";
    };
    readonly validation: {
        readonly organizationNameMin: "Название должно содержать минимум 2 символа";
        readonly organizationNameMax: "Название не должно превышать 100 символов";
        readonly descriptionMax: "Описание не должно превышать 500 символов";
        readonly invalidPhone: "Некорректный номер телефона";
        readonly innDigits: "ИНН должен содержать от 9 до 20 цифр";
        readonly max100: "Не более 100 символов";
        readonly digitsOnly: "Только цифры";
        readonly firstNameMin: "Имя должно содержать минимум 2 символа";
        readonly firstNameMax: "Имя не должно превышать 50 символов";
        readonly lastNameMin: "Фамилия должна содержать минимум 2 символа";
        readonly lastNameMax: "Фамилия не должна превышать 50 символов";
        readonly positionMax: "Должность не должна превышать 100 символов";
        readonly departmentMax: "Отдел не должен превышать 100 символов";
        readonly max500: "Не более 500 символов";
        readonly invalidWebsite: "Некорректный адрес сайта";
        readonly bioMax: "Не более 2000 символов";
        readonly locationMax: "Не более 255 символов";
    };
    readonly companyInfo: {
        readonly title: "Заполните доп. поля";
        readonly description: "Укажите данные о компании, чтобы участники лучше узнали вашу организацию.";
        readonly rootError: "Заполните хотя бы одно поле, прежде чем продолжить.";
    };
    readonly actions: {
        readonly upload: "Загрузить";
        readonly uploadPhoto: "Загрузить фото";
        readonly saving: "Сохранение...";
        readonly saveChanges: "Сохранить изменения";
        readonly completeSetup: "Завершить настройку";
    };
    readonly onboarding: {
        readonly title: "Завершить настройку профиля";
        readonly memberDescription: "Подтвердите, что вы заполнили все персональные данные";
        readonly organizationDescription: "Подтвердите, что вы заполнили все необходимые данные";
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