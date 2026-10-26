export declare const billing: {
    readonly eyebrow: "Организация";
    readonly title: "Тарифы и подписка";
    readonly description: "Ваш тариф, цены и статус оплаты. Начать в Eventflow можно бесплатно — вы платите только комиссию с каждого билета.";
    readonly tabs: {
        readonly overview: "Обзор";
        readonly plans: "Тарифы";
        readonly addons: "Дополнения";
        readonly invoices: "Счета";
    };
    readonly manage: {
        readonly viewOnlyTooltip: "Вам доступен просмотр тарифов, но для отправки заявок нужно право «Управление тарифами» — обратитесь к владельцу организации.";
    };
    readonly common: {
        readonly loadErrorTitle: "Не удалось загрузить данные о тарифе";
        readonly loadErrorBody: "Проверьте соединение и попробуйте ещё раз.";
        readonly retry: "Повторить";
    };
    readonly tiers: {
        readonly START: "Старт";
        readonly PRO: "Pro";
        readonly EXCLUSIVE: "Exclusive";
    };
    readonly notEnabled: {
        readonly title: "Тарифная система ещё не включена";
        readonly body: "Сейчас EventFlow работает без тарифных ограничений: лимиты не применяются и ничего не списывается. Данные ниже показывают, что начнёт действовать после включения тарифной системы.";
    };
    readonly suspended: {
        readonly title: "Организация приостановлена";
        readonly body: "Ваша организация приостановлена командой EventFlow: воркспейс доступен только для чтения, новые регистрации остановлены. Напишите на support@eventflow.uz.";
    };
    readonly managedNotice: {
        readonly title: "Тарифами управляет команда Eventflow";
        readonly body: "Онлайн-оплата и самостоятельный переход на платный тариф пока не подключены. Смена тарифа оформляется через команду Eventflow — отправьте заявку, и мы свяжемся с вами.";
    };
    readonly overview: {
        readonly currentPlan: "Текущий тариф";
        readonly currentBadge: "Текущий";
        readonly freeBadge: "Бесплатно";
        readonly startSummary: "Все организации начинают с тарифа «Старт». Абонентской платы нет — вы платите только комиссию с каждого проданного билета.";
        readonly packSummary: "Ваш тариф действует пакетом на 90 дней. Продление открывает новый период со свежими кредитами; неиспользованные кредиты не переносятся.";
        readonly sourcePurchase: "Активный пакет";
        readonly sourceDefault: "Базовый тариф";
        readonly commissionLabel: "Комиссия";
        readonly commissionValue: "{percent}% с билета";
        readonly commissionTicketsNote: "Применяется при запуске продаж билетов на платформе.";
        readonly commissionOverrideHint: "Индивидуальная ставка для вашей организации";
        readonly packTitle: "Пакет событий";
        readonly activatedOn: "Активирован {date}";
        readonly awaitingActivation: "Ожидает активации";
        readonly creditsLabel: "Кредиты на публикацию";
        readonly creditsValue: "осталось {remaining} из {granted}";
        readonly expiresOn: "Действует до {date}";
        readonly expired: "Период завершён";
        readonly noExpiry: "Без даты окончания";
        readonly renewCta: "Продлить тариф";
        readonly renewResetNote: "Продление открывает новый период на 90 дней со свежими кредитами. Неиспользованные кредиты не переносятся.";
        readonly comparePlans: "Сравнить тарифы";
        readonly paymentTitle: "Способ оплаты";
        readonly paymentNotEnabled: "Онлайн-оплата пока не подключена";
        readonly paymentNotEnabledBody: "Карты и локальные платёжные системы (Click, Payme) не подключены. Активация тарифов и оплата оформляются вручную через команду Eventflow.";
    };
    readonly plans: {
        readonly intro: "Что входит в каждый тариф — данные из живого каталога. «Старт» бесплатный; платные тарифы — пакеты на 90 дней с кредитами на публикацию, местами для команды и AI-инструментами.";
        readonly current: "Текущий тариф";
        readonly freePrice: "Бесплатно";
        readonly pricePeriod: "за {days}";
        readonly usdAnchorNote: "Ориентировочная цена. Оплата в UZS — итоговую цену подтверждает команда EventFlow.";
        readonly managedRow: "Активация через команду EventFlow";
        readonly requestCta: "Запросить тариф";
        readonly requestAria: "Запросить тариф «{plan}»";
        readonly pendingBadge: "Заявка отправлена";
        readonly pendingNotice: "У вас есть необработанная заявка на тариф от {date}. Команда EventFlow свяжется с вами в течение 2 рабочих дней.";
        readonly featureCommission: "Комиссия {percent}% с билета";
        readonly featureGenerationsMonth: "{count} в месяц";
        readonly featureGenerationsPack: "{count} за период пакета";
        readonly featureAiMinutes: "{count} в месяц";
        readonly featureTaskBoard: "Доска задач";
        readonly featureQrArrival: "QR-чек-ин (только вход)";
        readonly featureQrExtended: "QR-чек-ин (расширенные режимы)";
        readonly featureStatsBasic: "Базовая статистика";
        readonly featureStatsForecast: "Статистика и прогнозы";
        readonly featureStatsSla: "Статистика, прогнозы и SLA";
    };
    readonly addons: {
        readonly description: "Пакеты монет и продвижение поверх любого тарифа. Заявки обрабатывает команда EventFlow.";
        readonly unavailable: "Пока недоступно";
        readonly comingSoon: "Скоро";
        readonly requestCta: "Запросить";
        readonly usdAnchorNote: "оплата в UZS, цена уточняется";
        readonly units: {
            readonly PER_WEEK: "за неделю";
            readonly PER_CAMPAIGN: "за кампанию";
            readonly PER_MESSAGE: "за сообщение";
        };
        readonly skus: {
            readonly COIN_AI_100MIN: {
                readonly title: "AI-минуты — 100";
                readonly description: "Пакет монет на 100 минут AI-голосового агента. Монеты не сгорают.";
            };
            readonly COIN_GEN_100: {
                readonly title: "Генерации — 100";
                readonly description: "Пакет монет на 100 генераций изображений и сертификатов. Монеты не сгорают.";
            };
            readonly AD_FEATURED_WEEK: {
                readonly title: "Featured-размещение";
                readonly description: "Ваше событие в featured-блоке публичного каталога.";
            };
            readonly AD_EMAIL_CAMPAIGN: {
                readonly title: "Email-рассылка";
                readonly description: "Email-кампания по участникам вашего события.";
            };
            readonly AD_SMS_CAMPAIGN: {
                readonly title: "SMS-рассылка";
                readonly description: "SMS-кампании станут доступны после подключения SMS-провайдера.";
            };
        };
    };
    readonly chip: {
        readonly aria: "Тариф и подписка — открыть страницу биллинга";
        readonly credits: "{remaining}/{granted} кредитов";
        readonly expiresIn: "истекает через {days} дн.";
    };
    readonly wallet: {
        readonly title: "Кошелёк монет";
        readonly drainOrder: "Монеты тратятся после квоты тарифа и не сгорают.";
        readonly aiBalance: "AI-минуты";
        readonly genBalance: "Генерации";
        readonly minutesShort: "мин";
        readonly buyPack: "Купить пакет";
        readonly historyTitle: "История монет";
        readonly colDate: "Дата";
        readonly colKind: "Тип";
        readonly colMetric: "Метрика";
        readonly colDelta: "Изменение";
        readonly colBalance: "Остаток";
        readonly colReason: "Комментарий";
        readonly kinds: {
            readonly PURCHASE: "Покупка";
            readonly COMP_GRANT: "Начисление";
            readonly CONSUMPTION: "Списание";
            readonly REVERSAL: "Сторно";
        };
        readonly metrics: {
            readonly AI_SECONDS: "AI-минуты";
            readonly GENERATION_UNITS: "Генерации";
        };
        readonly emptyTitle: "Проводок пока нет";
        readonly emptyBody: "Здесь появятся покупки пакетов монет, начисления и списания.";
    };
    readonly usage: {
        readonly title: "Использование";
        readonly subtitle: "Живые счётчики квотных окон вашего тарифа.";
        readonly windowMonth: "в этом месяце";
        readonly windowPack: "за период пакета";
        readonly generationsLabel: "Генерации (сертификаты и бейджи)";
        readonly aiMinutesLabel: "AI-минуты";
        readonly aiComingSoonTitle: "AI-агент — скоро";
        readonly aiComingSoonBody: "Включён в ваш тариф. Минуты активируются с запуском голосового агента.";
        readonly seatsLabel: "Места команды";
        readonly manageTeam: "Управление командой";
        readonly unlimited: "Без лимита";
        readonly valueOf: "{used} / {limit}";
        readonly atLimit: "Лимит исчерпан";
        readonly upgradeCta: "Улучшить тариф";
    };
    readonly requestDialog: {
        readonly titleUpgrade: "Заявка на тариф «{plan}»";
        readonly titleRenew: "Продление тарифа «{plan}»";
        readonly titleAddon: "Заявка: {title}";
        readonly bodyPlan: "Мы зарегистрируем заявку, и команда EventFlow свяжется с вами для оплаты и активации. Ничего не списывается автоматически.";
        readonly renewResetNote: "Продление открывает новый период на 90 дней со свежими кредитами — неиспользованные кредиты сбрасываются и не переносятся.";
        readonly confirm: "Отправить заявку";
        readonly cancel: "Отмена";
        readonly close: "Закрыть";
        readonly successTitle: "Заявка отправлена";
        readonly successBody: "Команда EventFlow свяжется с вами в течение 2 рабочих дней.";
        readonly duplicateTitle: "Уже есть необработанная заявка";
        readonly duplicateBody: "Ваша заявка от {date} в очереди — команда EventFlow свяжется с вами в течение 2 рабочих дней.";
        readonly duplicateBodyNoDate: "Ваша предыдущая заявка в очереди — команда EventFlow свяжется с вами в течение 2 рабочих дней.";
        readonly errorBody: "Не удалось отправить заявку. Попробуйте ещё раз.";
    };
    readonly invoices: {
        readonly title: "Счета";
        readonly description: "Здесь появляются заявки, заказы и чеки за платные тарифы и дополнения.";
        readonly emptyTitle: "Счетов пока нет";
        readonly emptyBody: "Списаний пока не было. Здесь появятся ваши заявки на тарифы и дополнения, заказы и чеки.";
        readonly historyTitle: "Заявки и заказы";
        readonly colDate: "Дата";
        readonly colKind: "Тип";
        readonly colStatus: "Статус";
        readonly colAmount: "Сумма";
        readonly kinds: {
            readonly PLAN: "Тариф";
            readonly COIN_PACK: "Пакет монет";
            readonly ADVERTISING: "Реклама";
            readonly TICKET_SALE: "Продажа билетов";
        };
        readonly statuses: {
            readonly REQUESTED: "Заявка";
            readonly PENDING_PAYMENT: "Ожидает оплаты";
            readonly PAID: "Оплачен";
            readonly CANCELLED: "Отменён";
            readonly EXPIRED: "Истёк";
            readonly REFUNDED: "Возврат";
        };
    };
    readonly seats: {
        readonly chip: "Занято {used} из {seats}";
        readonly requestUpgrade: "Запросить апгрейд";
    };
    readonly publish: {
        readonly willConsume: "Публикация спишет 1 кредит — останется {left} из {granted}.";
        readonly lastCredit: "Это последний кредит: после его списания организация перейдёт на условия «Старт» до продления пакета.";
        readonly noCredits: "Кредиты пакета исчерпаны — новые публикации идут на условиях «Старт» до продления.";
        readonly republishFree: "Повторная публикация того же события кредит не списывает.";
    };
    readonly gate: {
        readonly boardsLockedTitle: "Доска задач не входит в ваш тариф";
        readonly boardsLockedBody: "Канбан-доски для планирования работы над событиями — колонки, задачи, исполнители и дедлайны. Входит в тарифы Pro и Exclusive.";
        readonly boardsReadOnlyTitle: "Доски доступны только для чтения на вашем тарифе";
        readonly boardsReadOnlyBody: "Просмотр и экспорт доступны — данные не удаляются. Чтобы снова редактировать доски, улучшите тариф.";
    };
    readonly errors: {
        readonly quotaTitle: "Лимит тарифа исчерпан";
        readonly quotaGenerationsBody: "Использовано генераций: {used} из {limit} {window}.";
        readonly quotaAiBody: "Использовано AI-минут: {used} из {limit} {window}.";
        readonly capStaffTitle: "Достигнут лимит мест команды";
        readonly capStaffBody: "В ваш тариф входит {seats} (место занимают и сотрудники, и неистёкшие приглашения); сейчас занято: {current}.";
        readonly capParticipantsTitle: "Достигнут лимит участников";
        readonly capParticipantsBody: "Ваш тариф допускает {participants}.";
        readonly creditsTitle: "Кредиты на публикацию закончились";
        readonly creditsBody: "Использованы все {granted} кредитов пакета. Продлите или улучшите тариф, чтобы публиковать новые события.";
        readonly featureTitle: "Не входит в ваш тариф";
        readonly featureTaskBoardBody: "Доска задач не входит в тариф «{tier}».";
        readonly featureStatsBody: "Расширенная статистика не входит в тариф «{tier}».";
        readonly featureQrBody: "Расширенные QR-режимы не входят в тариф «{tier}».";
        readonly suspendedTitle: "Организация приостановлена";
        readonly suspendedBody: "Ваша организация приостановлена командой EventFlow. Напишите на support@eventflow.uz.";
        readonly upgradeCta: "Открыть тарифы";
        readonly dismiss: "Скрыть";
    };
    readonly settingsLink: {
        readonly title: "Тарифы и подписка";
        readonly description: "Посмотреть тариф, цены и статус оплаты.";
        readonly cta: "Открыть тарифы";
    };
};
//# sourceMappingURL=billing.d.ts.map