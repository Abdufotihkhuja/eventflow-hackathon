export declare const users: {
    readonly title: "Пользователи";
    readonly role: {
        readonly owner: "Владелец";
        readonly admin: "Администратор";
        readonly eventManager: "Менеджер событий";
        readonly eventCoordinator: "Координатор событий";
        readonly support: "Техподдержка";
        readonly viewer: "Наблюдатель";
    };
    readonly roleDescription: {
        readonly owner: "Полный доступ ко всем функциям системы";
        readonly admin: "Управление событиями, пользователями и настройками";
        readonly eventManager: "Создание и редактирование событий, управление участниками";
        readonly eventCoordinator: "Управление участниками и координация событий";
        readonly support: "Просмотр информации и поддержка пользователей";
        readonly viewer: "Просмотр статистики и информации о событиях";
    };
    readonly status: {
        readonly active: "Активен";
        readonly inactive: "Неактивен";
        readonly invited: "Приглашён";
        readonly suspended: "Приостановлен";
    };
    readonly page: {
        readonly kicker: "Организация";
        readonly title: "Команда";
        readonly invitePeople: "Пригласить людей";
        readonly you: "Вы";
        readonly tabAll: "Все";
        readonly colName: "Имя";
        readonly colEmail: "Email";
        readonly colRole: "Роль";
        readonly colAdded: "Добавлен";
        readonly colStatus: "Статус";
        readonly pendingTitle: "Ожидают приглашения: {count}";
        readonly pendingNames: "{names} ещё не приняли приглашение";
        readonly resendAll: "Отправить повторно";
        readonly pendingSubtitle: "Ожидают принятия приглашения";
        readonly declinedTitle: "Отказались: {count}";
        readonly declinedSubtitle: "Приглашение отклонено — можно позвать позже или другого человека";
        readonly declinedNoReason: "Без комментария";
        readonly revoke: "Отозвать";
        readonly invitesResent: "Повторно отправлено приглашений: {count}";
        readonly rolesTitle: "Роли и права";
        readonly rolesDescription: "Что каждая роль может делать в организации";
        readonly capability: "Возможность";
        readonly permFull: "Полный";
        readonly permPartial: "Частично";
        readonly noAccessTitle: "Нет доступа к команде";
        readonly noAccessDescription: "У вас нет прав для просмотра и управления сотрудниками.";
        readonly notSpecified: "Не указана";
        readonly configureAccess: "Настроить доступ";
        readonly resendInvite: "Отправить приглашение снова";
        readonly unblock: "Разблокировать";
        readonly block: "Заблокировать";
        readonly added: "Добавлен";
        readonly statsTotal: "Всего";
        readonly statsActive: "Активные";
        readonly statsInvited: "Приглашённые";
        readonly statsSuspended: "Приостановлены";
        readonly innRequiredTitle: "Требуется ИНН организации";
        readonly innRequiredDescription: "Для добавления сотрудников необходимо указать ИНН организации в профиле. ИНН нужен сотрудникам для входа в систему.";
        readonly goToProfile: "Перейти в профиль";
        readonly teamManagement: "Управление командой";
        readonly teamDescription: "Добавляйте сотрудников и настраивайте права доступа";
        readonly addEmployee: "Добавить сотрудника";
        readonly allRoles: "Все роли";
        readonly noEmployees: "Сотрудников не найдено";
        readonly tryChangingFilters: "Попробуйте изменить фильтры";
        readonly addFirstEmployee: "Добавьте первого сотрудника";
        readonly filters: "Фильтры:";
        readonly searchPlaceholder: "Поиск по имени или email...";
        readonly allStatuses: "Все статусы";
        readonly editEmployee: "Редактировать сотрудника";
        readonly addEmployeeTitle: "Добавить сотрудника";
        readonly editEmployeeDescription: "Измените данные сотрудника";
        readonly addEmployeeDescription: "Заполните информацию для нового сотрудника";
        readonly deleteTitle: "Удалить сотрудника?";
        readonly deleteDescription: "Вы уверены, что хотите удалить {name}?";
        readonly manageAccess: "Управление доступом";
        readonly manageAccessDescription: "Настройте индивидуальные права для {name}";
        readonly openMenu: "Открыть меню";
        readonly configureAccessAction: "Настроить доступ";
        readonly sendInviteAgain: "Отправить приглашение снова";
    };
    readonly form: {
        readonly email: "Email";
        readonly emailPlaceholder: "user@example.com";
        readonly emailDescription: "Email для входа и получения уведомлений";
        readonly password: "Пароль";
        readonly passwordPlaceholder: "Минимум 8 символов";
        readonly passwordDescription: "Пароль для входа в систему (минимум 8 символов)";
        readonly firstName: "Имя";
        readonly firstNamePlaceholder: "Иван";
        readonly lastName: "Фамилия";
        readonly lastNamePlaceholder: "Иванов";
        readonly role: "Роль";
        readonly selectRole: "Выберите роль";
        readonly phone: "Телефон";
        readonly position: "Должность";
        readonly positionPlaceholder: "Event Manager";
        readonly department: "Отдел";
        readonly departmentPlaceholder: "Маркетинг";
        readonly sendInvitation: "Отправить приглашение на email";
        readonly sendInvitationDescription: "Сотрудник получит письмо с инструкциями для активации аккаунта";
        readonly saveChanges: "Сохранить изменения";
        readonly createEmployee: "Создать сотрудника";
        readonly validation: {
            readonly emailRequired: "Email обязателен";
            readonly invalidEmail: "Некорректный формат email";
            readonly firstNameRequired: "Имя обязательно";
            readonly lastNameRequired: "Фамилия обязательна";
            readonly invalidPhone: "Некорректный формат телефона";
            readonly roleRequired: "Выберите роль";
            readonly passwordRequired: "Пароль обязателен (минимум 8 символов) если не отправляется приглашение";
        };
    };
    readonly permissionEditor: {
        readonly baseRole: "Базовая роль: {role}";
        readonly baseRoleDescription: "Права от роли отмечены значком щита и не могут быть отключены. Ниже можно добавить дополнительные права (зелёные).";
        readonly rolePermission: "Право от роли \"{role}\"";
        readonly savingChanges: "Сохранение изменений...";
        readonly roleRights: "Права от роли";
        readonly individualRights: "Индивидуальные права";
        readonly resources: {
            readonly dashboard: "Панель";
            readonly events: "События";
            readonly speakers: "Спикеры";
            readonly agenda: "Программа";
            readonly questions: "Вопросы регистрации";
            readonly tickets: "Билеты";
            readonly certificates: "Сертификаты";
            readonly artifact_recipients: "Получатели артефактов";
            readonly recipient_roles: "Роли получателей";
            readonly mail: "Рассылки";
            readonly registrations: "Регистрации";
            readonly attendance: "Посещаемость";
            readonly boards: "Доски";
            readonly columns: "Колонки";
            readonly tasks: "Задачи";
            readonly comments: "Комментарии";
            readonly checklists: "Чек-листы";
            readonly tags: "Метки";
            readonly attachments: "Вложения";
            readonly blog: "Блог";
            readonly followers: "Подписчики";
            readonly contacts: "Заявки на связь";
            readonly places: "Площадки";
            readonly members: "Сотрудники";
            readonly roles: "Роли";
            readonly settings: "Настройки";
            readonly organization: "Организация";
            readonly uploads: "Загрузки";
            readonly billing: "Тарифы";
            readonly analytics: "Аналитика";
        };
        readonly loadErrorTitle: "Не удалось загрузить каталог прав";
        readonly loadErrorDescription: "Проверьте подключение или повторите попытку. Техническая причина:";
        readonly emptyCatalogTitle: "Каталог прав пуст";
        readonly emptyCatalogDescription: "Права не настроены в системе. Запустите миграции и seed перед управлением доступом.";
        readonly retry: "Повторить";
        readonly actions: {
            readonly create: "Создание";
            readonly read: "Просмотр";
            readonly update: "Редактирование";
            readonly delete: "Удаление";
            readonly manage: "Управление";
            readonly view: "Просмотр";
            readonly edit: "Редактирование";
            readonly publish: "Публикация";
            readonly approve: "Одобрение";
            readonly reject: "Отклонение";
            readonly send: "Отправка";
            readonly export: "Экспорт";
            readonly import: "Импорт";
            readonly checkin: "Отметка";
            readonly generate: "Генерация";
            readonly archive: "Архивирование";
            readonly assign: "Назначение";
            readonly move: "Перемещение";
            readonly invite: "Приглашение";
        };
        readonly modules: {
            readonly dashboard: "Панель";
            readonly events: "События";
            readonly participants: "Участники";
            readonly checkin: "Чек-ин";
            readonly board: "Доска";
            readonly blog: "Блог";
            readonly followers: "Подписчики";
            readonly requests: "Заявки";
            readonly places: "Площадки";
            readonly users: "Пользователи";
            readonly billing: "Тарифы/Оплата";
            readonly members: "Сотрудники";
            readonly roles: "Роли";
            readonly registrations: "Регистрации";
            readonly attendance: "Посещаемость";
            readonly certificates: "Сертификаты";
            readonly speakers: "Спикеры";
            readonly agenda: "Программа";
            readonly mail: "Рассылки";
            readonly boards: "Доски";
            readonly tasks: "Задачи";
            readonly organization: "Организация";
            readonly analytics: "Аналитика";
            readonly settings: "Настройки";
            readonly questions: "Вопросы регистрации";
            readonly tickets: "Билеты";
            readonly columns: "Колонки";
            readonly comments: "Комментарии";
            readonly checklists: "Чеклисты";
            readonly tags: "Теги";
            readonly attachments: "Вложения";
            readonly uploads: "Загрузки";
        };
        readonly moduleDescriptions: {
            readonly dashboard: "Доступ к главной панели организатора";
            readonly events: "Создание и управление мероприятиями";
            readonly participants: "Регистрации, участники и экспорт списков";
            readonly checkin: "QR check-in и отчёты посещаемости";
            readonly board: "Доски, задачи, комментарии и вложения";
            readonly blog: "Статьи организации и публикация блога";
            readonly followers: "Подписчики публичного профиля организации";
            readonly requests: "Заявки пользователей на связь с организацией";
            readonly places: "Каталог площадок и заявки на аренду";
            readonly users: "Сотрудники, роли и управление доступами";
            readonly billing: "Тарифы, оплата и платные дополнения";
            readonly members: "Управление сотрудниками организации";
            readonly roles: "Настройка ролей и прав доступа";
            readonly registrations: "Работа с регистрациями участников";
            readonly attendance: "Отметки посещаемости на мероприятиях";
            readonly certificates: "Генерация и управление сертификатами";
            readonly speakers: "Управление спикерами мероприятий";
            readonly agenda: "Настройка программы мероприятий";
            readonly mail: "Рассылки уведомлений участникам";
            readonly boards: "Доски для управления задачами";
            readonly tasks: "Работа с задачами на досках";
            readonly organization: "Настройки организации";
            readonly analytics: "Просмотр статистики и отчётов";
            readonly settings: "Системные настройки";
            readonly questions: "Вопросы для формы регистрации";
            readonly tickets: "Управление типами билетов";
            readonly columns: "Управление колонками на досках";
            readonly comments: "Комментарии к задачам";
            readonly checklists: "Чеклисты в задачах";
            readonly tags: "Теги для задач";
            readonly attachments: "Вложения к задачам";
            readonly uploads: "Загрузка файлов в систему";
        };
    };
    readonly permissions: {
        readonly groups: {
            readonly events: {
                readonly label: "События";
                readonly description: "Управление мероприятиями";
            };
            readonly participants: {
                readonly label: "Участники";
                readonly description: "Работа с участниками мероприятий";
            };
            readonly analytics: {
                readonly label: "Аналитика";
                readonly description: "Доступ к статистике и отчётам";
            };
            readonly users: {
                readonly label: "Пользователи";
                readonly description: "Управление командой";
            };
            readonly settings: {
                readonly label: "Настройки";
                readonly description: "Конфигурация системы";
            };
        };
        readonly items: {
            readonly eventsView: {
                readonly label: "Просмотр событий";
                readonly description: "Просмотр списка и деталей событий";
            };
            readonly eventsCreate: {
                readonly label: "Создание событий";
                readonly description: "Создание новых мероприятий";
            };
            readonly eventsEdit: {
                readonly label: "Редактирование событий";
                readonly description: "Изменение существующих событий";
            };
            readonly eventsPublish: {
                readonly label: "Публикация событий";
                readonly description: "Публикация черновиков событий";
            };
            readonly eventsDelete: {
                readonly label: "Удаление событий";
                readonly description: "Удаление мероприятий";
            };
            readonly participantsView: {
                readonly label: "Просмотр участников";
                readonly description: "Просмотр списка участников";
            };
            readonly participantsManage: {
                readonly label: "Управление участниками";
                readonly description: "Добавление, редактирование, удаление участников";
            };
            readonly participantsExport: {
                readonly label: "Экспорт участников";
                readonly description: "Экспорт списков участников";
            };
            readonly analyticsView: {
                readonly label: "Просмотр аналитики";
                readonly description: "Доступ к дашборду и статистике";
            };
            readonly analyticsExport: {
                readonly label: "Экспорт отчётов";
                readonly description: "Экспорт данных и отчётов";
            };
            readonly usersView: {
                readonly label: "Просмотр пользователей";
                readonly description: "Просмотр списка команды";
            };
            readonly usersInvite: {
                readonly label: "Приглашение пользователей";
                readonly description: "Отправка приглашений новым пользователям";
            };
            readonly usersManage: {
                readonly label: "Управление пользователями";
                readonly description: "Полное управление пользователями и правами";
            };
            readonly settingsView: {
                readonly label: "Просмотр настроек";
                readonly description: "Просмотр настроек системы";
            };
            readonly settingsManage: {
                readonly label: "Управление настройками";
                readonly description: "Изменение настроек системы";
            };
        };
    };
};
//# sourceMappingURL=users.d.ts.map