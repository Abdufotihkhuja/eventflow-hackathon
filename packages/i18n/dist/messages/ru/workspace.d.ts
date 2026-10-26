export declare const workspace: {
    readonly layout: {
        readonly navigationGroups: {
            readonly management: "Каталоги пространства";
            readonly organization: "Организация";
            readonly account: "Аккаунт";
            readonly system: "Система";
        };
        readonly navigation: {
            readonly dashboard: "Панель";
            readonly myEvents: "События";
            readonly checkIn: "Чек-ин";
            readonly myBlog: "Мой блог";
            readonly users: "Сотрудники";
            readonly followers: "Подписчики";
            readonly contacts: "Заявки на связь";
            readonly placesCatalog: "Каталог площадок";
            readonly myPlaces: "Мои площадки";
            readonly tasks: "Задачи";
            readonly board: "Доска";
            readonly profile: "Профиль";
            readonly settings: "Настройки";
            readonly billing: "Тарифы";
            readonly security: "Безопасность";
        };
        readonly routes: {
            readonly home: "Главная";
            readonly dashboard: {
                readonly title: "Панель управления";
                readonly description: "Сводка ключевых показателей";
            };
            readonly myEvents: {
                readonly title: "Мои события";
                readonly description: "Управление мероприятиями";
            };
            readonly users: {
                readonly title: "Сотрудники";
                readonly description: "Управление сотрудниками организации";
            };
            readonly boards: {
                readonly title: "Мои доски";
                readonly description: "Управление досками задач";
            };
            readonly profile: {
                readonly title: "Профиль";
                readonly description: "Управление профилем";
            };
            readonly settings: {
                readonly title: "Настройки";
                readonly description: "Конфигурация системы";
            };
            readonly billing: {
                readonly title: "Тарифы и подписка";
                readonly description: "Тариф, цены и статус оплаты";
            };
            readonly security: {
                readonly title: "Безопасность";
                readonly description: "Управление безопасностью аккаунта";
            };
            readonly myBlog: {
                readonly title: "Мой блог";
                readonly description: "Управление статьями блога";
            };
            readonly followers: {
                readonly title: "Подписчики";
                readonly description: "Пользователи, подписавшиеся на организацию";
            };
            readonly contacts: {
                readonly title: "Заявки на связь";
                readonly description: "Заявки пользователей на связь с организацией";
            };
            readonly myPlaces: {
                readonly title: "Мои площадки";
                readonly description: "Каталог ваших площадок для аренды";
            };
            readonly places: {
                readonly title: "Каталог площадок";
                readonly description: "Площадки для мероприятий";
            };
            readonly place: {
                readonly title: "Площадка";
                readonly description: "Детали площадки";
            };
            readonly event: {
                readonly title: "Событие";
                readonly description: "Командный центр события";
            };
            readonly blogPost: {
                readonly title: "Статья";
                readonly description: "Управление статьёй";
            };
            readonly page: {
                readonly title: "Страница";
            };
        };
        readonly sidebar: {
            readonly collapse: "Свернуть";
            readonly expand: "Развернуть";
            readonly inviteTitle: "Пригласите команду";
            readonly inviteBody: "Редакторы, контроль на входе и финансы — роли определяют доступ.";
            readonly inviteCta: "Пригласить людей";
            readonly logout: "Выйти";
            readonly tipTitle: "Подсказка дня";
            readonly tipHotkeys: "Используйте горячие клавиши для быстрой навигации";
        };
        readonly navbar: {
            readonly menu: "Меню";
            readonly organizationInn: "ИНН организации";
            readonly inn: "ИНН:";
            readonly notifications: "Уведомления";
            readonly viewPublicProfile: "Открыть публичный профиль";
            readonly language: "Язык";
            readonly profile: "Профиль";
            readonly personalCabinet: "Личный кабинет участника";
            readonly settings: "Настройки";
            readonly logout: "Выйти";
            readonly defaultUser: "Пользователь";
            readonly adminUser: "Администратор";
        };
        readonly loading: {
            readonly page: "Загружаем страницу...";
        };
        readonly home: {
            readonly title: "Добро пожаловать в EventFlow!";
            readonly description: "Вы успешно вошли в систему.";
        };
        readonly theme: {
            readonly toggle: "Переключить тему";
            readonly light: "Светлая";
            readonly dark: "Темная";
            readonly system: "Системная";
        };
        readonly actions: {
            readonly createEvent: "Создать событие";
        };
    };
    readonly notifications: {
        readonly title: "Уведомления";
        readonly unreadCount: "Непрочитанных: {count}";
        readonly allRead: "Всё прочитано";
        readonly markAllRead: "Отметить все прочитанными";
        readonly emptyTitle: "Уведомлений пока нет";
        readonly emptyDescription: "Здесь появятся события команды: заявки, модерация, ответы на приглашения";
        readonly types: {
            readonly fallback: "Новое событие в организации";
            readonly MEMBER_JOINED: "{personName} принял приглашение и присоединился к команде";
            readonly MEMBER_INVITE_DECLINED: "{personName} отказался от приглашения на роль «{roleName}»";
            readonly REGISTRATION_CREATED: "Новая заявка на событие";
            readonly REGISTRATION_FIRST: "Первая регистрация на событие";
            readonly REGISTRATION_APPROVED: "Заявка одобрена";
            readonly REGISTRATION_REJECTED: "Заявка отклонена";
            readonly EVENT_SUBMITTED: "Событие отправлено на модерацию";
            readonly EVENT_PUBLISHED: "Событие опубликовано";
            readonly EVENT_REJECTED: "Событие отклонено модерацией";
            readonly EVENT_CHANGES_REQUESTED: "Модерация запросила правки по событию";
            readonly CAPACITY_THRESHOLD: "Заполненность события: {threshold}%";
            readonly TICKET_REFUND: "Возврат билета";
            readonly REGISTRATION_CLOSED: "Регистрация на событие закрыта";
            readonly EVENT_SUMMARY: "Итоги события готовы";
            readonly ORG_VERIFIED: "Организация подтверждена";
            readonly ORG_VERIFICATION_REJECTED: "Верификация организации отклонена";
        };
    };
    readonly access: {
        readonly checking: "Проверяем доступ...";
        readonly deniedTitle: "Недостаточно прав";
        readonly deniedDescription: "У вашего аккаунта нет доступа к этому разделу. Обратитесь к владельцу организации, если доступ нужен для работы.";
    };
    readonly footer: {
        readonly copyright: "© EventFlow - Платформа для управления мероприятиями";
    };
    readonly followers: {
        readonly title: "Подписчики";
        readonly description: "Пользователи, подписавшиеся на вашу организацию";
        readonly statsTotal: "Всего подписчиков";
        readonly searchPlaceholder: "Поиск по имени...";
        readonly emptyTitle: "Подписчиков пока нет";
        readonly emptyDescription: "Здесь появятся пользователи, подписавшиеся на организацию";
        readonly unnamed: "Без имени";
        readonly followedAt: "Подписка: {date}";
        readonly pageInfo: "Страница {page} из {total}";
        readonly colSubscriber: "Подписчик";
        readonly colFollowed: "Подписан";
        readonly export: "Экспорт";
        readonly exporting: "Экспорт…";
        readonly exportEmpty: "Нет подписчиков для экспорта";
        readonly exportError: "Не удалось экспортировать подписчиков";
    };
    readonly places: {
        readonly access: {
            readonly ownerOnlyTitle: "Модуль площадок доступен только организатору";
            readonly ownerOnlyDescription: "Сотрудники могут работать с событиями и задачами, а управление площадками остаётся у владельца организации.";
            readonly editorOwnerOnlyTitle: "Редактирование площадок доступно только организатору";
            readonly featureDisabledBadge: "Модуль площадок пока выключен";
            readonly featureDisabledTitle: "Когда super-admin включит доступ, здесь появится рабочее пространство для арендуемых площадок";
            readonly featureDisabledDescription: "После активации вы сможете создать каталог собственных площадок, публиковать карточки и получать заявки от других организаторов.";
            readonly openCatalog: "Открыть публичный каталог";
            readonly platformSetupTitle: "Что сделано со стороны платформы";
            readonly platformSetupDescription: "В Swagger подтверждён отдельный флаг организации `placesFeatureEnabled`. Именно он решает, может ли организатор создавать и публиковать площадки.";
            readonly editorFeatureDisabledTitle: "Модуль площадок выключен для вашей организации";
            readonly editorFeatureDisabledDescription: "Обратитесь к super-admin, чтобы включить `placesFeatureEnabled` для профиля организации.";
        };
        readonly list: {
            readonly badge: "Rental places workspace";
            readonly colVenue: "Площадка";
            readonly colStatus: "Статус";
            readonly colAddress: "Адрес";
            readonly colCapacity: "Вместимость";
            readonly colPrice: "Цена";
            readonly showingCount: "Показано {shown} из {total} площадок";
            readonly tryChangingFilters: "Измените поиск или фильтр статуса";
            readonly title: "Мои площадки";
            readonly description: "Соберите витрину площадок так, чтобы организатору было легко принять решение: понятные фото, прозрачная цена, адрес, вместимость и быстрый сценарий заявки.";
            readonly add: "Добавить площадку";
            readonly searchPlaceholder: "Поиск по названию, адресу или городу";
            readonly statusPlaceholder: "Статус";
            readonly loading: "Загружаем площадки...";
            readonly loadError: "Не удалось загрузить площадки: {message}";
            readonly unknownError: "неизвестная ошибка";
            readonly emptyTitle: "Пока ни одной площадки";
            readonly emptyDescription: "Начните с одной сильной карточки: фото, реальная вместимость, удобства и чёткая цена.";
            readonly createFirst: "Создать первую площадку";
            readonly viewCatalog: "Смотреть каталог";
            readonly emptyTipCover: "Добавьте сильную обложку";
            readonly emptyTipCapacity: "Укажите реальную вместимость";
            readonly emptyTipAmenities: "Опишите удобства без воды";
            readonly noImage: "Нет изображения";
            readonly fromPrice: "от {price}{suffix}";
            readonly guestsUpTo: "До {capacity} гостей";
            readonly noPrice: "Цена не указана";
            readonly pageInfo: "Страница {page} из {total}";
            readonly deleteTitle: "Удалить площадку?";
            readonly deleteDescription: "Площадка «{title}» будет удалена без возможности восстановления.";
            readonly deleteFallbackDescription: "Площадка будет удалена без возможности восстановления.";
        };
        readonly stats: {
            readonly total: "Всего площадок";
            readonly published: "Опубликованы";
            readonly drafts: "Черновики";
            readonly archived: "В архиве";
        };
        readonly statusFilter: {
            readonly all: "Все статусы";
            readonly draft: "Черновики";
            readonly published: "Опубликованные";
            readonly archived: "Архив";
        };
        readonly catalog: {
            readonly badge: "EventFlow places";
            readonly title: "Площадки для мероприятий, которые легко сравнивать и быстро бронировать";
            readonly description: "Каталог построен вокруг практичных решений: фото без шума, прозрачная цена, точный адрес, вместимость и быстрый переход к заявке.";
            readonly searchPlaceholder: "Поиск по названию или району";
            readonly cityPlaceholder: "Город";
            readonly currencyPlaceholder: "Валюта";
            readonly allCurrencies: "Все валюты";
            readonly sortPlaceholder: "Сортировка";
            readonly nearby: "Рядом";
            readonly minPrice: "Цена от";
            readonly maxPrice: "Цена до";
            readonly found: "Найдено площадок: {count}";
            readonly geolocationUnavailable: "Геолокация недоступна в этом браузере";
            readonly geolocationError: "Не удалось определить вашу геолокацию";
            readonly loading: "Загружаем каталог...";
            readonly loadError: "Не удалось загрузить каталог: {message}";
            readonly emptyTitle: "Площадки пока не найдены";
            readonly emptyDescription: "Попробуйте расширить фильтры или сменить сортировку. Каталог уже подключён к live API и будет пополняться опубликованными площадками.";
            readonly noPhoto: "Нет фото";
            readonly defaultCity: "Узбекистан";
            readonly perHour: "/час";
            readonly perDay: "/сутки";
        };
        readonly sort: {
            readonly newest: "Сначала новые";
            readonly priceAsc: "Сначала дешевле";
            readonly priceDesc: "Сначала дороже";
            readonly nearest: "Ближе ко мне";
        };
        readonly editor: {
            readonly backToList: "Назад к списку";
            readonly badgeEdit: "Тонкая настройка карточки";
            readonly badgeNew: "Новая площадка";
            readonly titleEditFallback: "Редактирование площадки";
            readonly titleCreate: "Создание площадки";
            readonly description: "Сделайте карточку максимально прикладной: сильная первая фотография, прозрачная стоимость, понятная вместимость и точная геолокация.";
            readonly publicCard: "Публичная карточка";
            readonly publish: "Публиковать";
            readonly archive: "В архив";
            readonly save: "Сохранить";
            readonly loading: "Загружаем площадку...";
            readonly uploadImagesError: "Не удалось загрузить изображения";
            readonly saveError: "Не удалось сохранить площадку";
            readonly fields: {
                readonly title: "Название площадки";
                readonly slug: "Slug";
                readonly city: "Город";
                readonly shortDescription: "Короткое описание";
                readonly fullDescription: "Полное описание";
                readonly currency: "Валюта";
                readonly capacity: "Вместимость";
                readonly address: "Адрес";
                readonly addressNotes: "Ориентир и детали входа";
            };
            readonly placeholders: {
                readonly city: "Ташкент";
                readonly shortDescription: "Что организатор поймёт о площадке за 10 секунд";
                readonly fullDescription: "Опишите атмосферу, сценарии использования, ограничения, техническую базу и дополнительные условия";
                readonly hourlyConditions: "Минимум 2 часа. Оплата за каждый последующий час.";
                readonly dailyConditions: "Заезд с 14:00, выезд до 12:00 следующего дня.";
                readonly address: "г. Ташкент, ул. Навои, 12";
                readonly addressNotes: "Например: 3 этаж, вход со стороны парковки";
            };
            readonly validation: {
                readonly titleRequired: "Укажите название площадки";
                readonly invalidSlug: "Slug должен содержать только a-z, 0-9 и дефис";
                readonly priceRequired: "Укажите хотя бы одну цену: за час или за сутки";
                readonly addressRequired: "Укажите адрес";
                readonly mapPointRequired: "Выберите точку на карте";
                readonly imageRequired: "Добавьте хотя бы одно изображение";
            };
            readonly pricing: {
                readonly title: "Тарифы аренды";
                readonly description: "Укажите хотя бы один тариф. Можно задать оба — арендатор выберет при подаче заявки.";
                readonly hourly: "Почасовая аренда";
                readonly pricePerHour: "Цена за час";
                readonly daily: "Посуточная аренда";
                readonly pricePerDay: "Цена за сутки";
                readonly conditions: "Условия";
                readonly optional: "(необязательно)";
            };
            readonly photos: {
                readonly title: "Фотографии";
                readonly description: "Первая фотография используется как обложка в каталоге.";
                readonly upload: "Загрузить";
                readonly dropzone: "Перетащите изображения или выберите файлы";
                readonly alt: "Фото площадки {index}";
                readonly cover: "Обложка";
                readonly photo: "Фото {index}";
            };
            readonly amenities: {
                readonly title: "Удобства";
                readonly description: "Выберите то, что реально доступно на площадке.";
            };
            readonly location: {
                readonly title: "Локация на карте";
                readonly description: "Это влияет и на карточку, и на nearby-поиск в каталоге.";
            };
            readonly preview: {
                readonly title: "Превью карточки";
                readonly coverPlaceholder: "Здесь появится обложка";
                readonly titlePlaceholder: "Название площадки";
                readonly cityPlaceholder: "Город";
                readonly guestsUpTo: "до {capacity} гостей";
                readonly perHour: "/час";
                readonly perDay: "/сутки";
                readonly noPrice: "Цена не указана";
                readonly descriptionPlaceholder: "Короткое описание поможет быстрее понять сильные стороны площадки.";
                readonly addressPlaceholder: "Адрес появится после заполнения";
            };
            readonly delete: "Удалить площадку";
            readonly deleteTitle: "Удалить площадку?";
            readonly unnamed: "без названия";
        };
    };
};
//# sourceMappingURL=workspace.d.ts.map