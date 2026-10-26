/**
 * Публичная страница /pricing (P-4). Источник копирайта:
 * docs/monetization/10-decisions.md §1 + принятые решения — без прогнозов/SLA
 * (B-4), без «блокчейна» (B-7: «сертификаты с проверкой подлинности»),
 * START QR — только на входе (E-4), AI-обзвон — честное «скоро» (E-3),
 * реклама по D-2 (SMS — «скоро»).
 */
export declare const pricing: {
    readonly meta: {
        readonly title: "Тарифы для организаторов";
        readonly description: "Тарифы EVENTFLOW для организаторов: бесплатный START с комиссией 12%, PRO — $599 за 5 событий на 90 дней и 8%, EXCLUSIVE — $999 за 10 событий на 90 дней и 6%. Оплата в узбекских сумах.";
    };
    readonly nav: {
        readonly label: "Тарифы";
    };
    readonly hero: {
        readonly eyebrow: "Тарифы";
        readonly title: "Пакеты событий с";
        readonly titleAccent: "честной комиссией";
        readonly intro: "Начните бесплатно и платите комиссию только с проданных билетов. Платные пакеты снижают комиссию и добавляют места для команды, вместимость событий и квоты генераций. Цены зафиксированы в долларах как ориентир; оплата — в узбекских сумах.";
    };
    readonly currency: {
        readonly paymentNote: "Оплата в узбекских сумах; точная цена — при подключении оплаты.";
        readonly uzsPending: "цена в UZS будет объявлена";
    };
    readonly commission: {
        readonly label: "Комиссия";
        readonly perTicket: "{percent}% с каждого проданного билета";
        readonly appliesNote: "Комиссия применяется с запуском продажи билетов на платформе.";
    };
    readonly plans: {
        readonly popularBadge: "Популярный";
        readonly start: {
            readonly name: "Start";
            readonly tagline: "Для первых событий и небольших встреч";
            readonly priceFree: "Бесплатно";
            readonly cta: "Начать бесплатно";
            readonly ctaAria: "Зарегистрироваться на бесплатном тарифе Start";
        };
        readonly pro: {
            readonly name: "Pro";
            readonly tagline: "Для регулярных событий и растущей команды";
            readonly cta: "Выбрать Pro";
            readonly ctaAria: "Зарегистрироваться и запросить тариф Pro";
        };
        readonly exclusive: {
            readonly name: "Exclusive";
            readonly tagline: "Для насыщенного календаря и больших площадок";
            readonly cta: "Выбрать Exclusive";
            readonly ctaAria: "Зарегистрироваться и запросить тариф Exclusive";
        };
    };
    readonly card: {
        readonly includedHeading: "Что входит";
    };
    readonly facts: {
        readonly events: "События";
        readonly validity: "Срок действия";
        readonly commission: "Комиссия";
        readonly participants: "Вместимость события";
        readonly seats: "Команда";
        readonly generations: "Сертификаты и бейджи";
        readonly eventsUnlimited: "без ограничений";
        readonly upTo: "до {value}";
        readonly perMonth: "{value} в месяц";
        readonly perPack: "{value} на период пакета";
        readonly seatSingle: "1 пользователь";
    };
    readonly features: {
        readonly qrStart: "QR check-in — только на входе";
        readonly qrPaid: "QR check-in";
        readonly stats: "Статистика событий";
        readonly verifiedCerts: "Сертификаты с проверкой подлинности и бейджи";
        readonly taskBoard: "Доска задач для команды";
        readonly aiCallsSoon: "AI-обзвон — {minutes} в месяц (скоро)";
        readonly prioritySupport: "Приоритетная поддержка по договору";
    };
    readonly footnotes: {
        readonly validity: "Кредиты событий действуют 90 дней с момента активации; при продлении выдаются заново — неиспользованные кредиты не переносятся.";
    };
    readonly coins: {
        readonly heading: "Монеты для дополнительных квот";
        readonly intro: "Пакеты пополнения поверх любого тарифа.";
        readonly drainOrder: "Монеты тратятся после квоты тарифа и не сгорают.";
        readonly comingSoon: "Скоро";
        readonly aiPack: {
            readonly title: "100 минут AI-обзвона";
        };
        readonly genPack: {
            readonly title: "100 генераций (сертификаты и бейджи)";
        };
    };
    readonly ads: {
        readonly heading: "Продвижение";
        readonly intro: "Рекламные форматы для событий на платформе.";
        readonly fromPrice: "от {price}";
        readonly perWeek: "за неделю";
        readonly perCampaign: "за кампанию";
        readonly comingSoon: "Скоро";
        readonly featured: {
            readonly title: "Featured-размещение";
            readonly description: "Ваше событие в блоке избранного на главной странице.";
        };
        readonly email: {
            readonly title: "Email-кампания";
            readonly description: "Рассылка по аудитории участников событий.";
        };
        readonly sms: {
            readonly title: "SMS-кампания";
            readonly description: "SMS-рассылка по участникам.";
        };
    };
};
//# sourceMappingURL=pricing.d.ts.map