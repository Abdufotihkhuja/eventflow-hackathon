export declare const ticket: {
    readonly label: {
        readonly eTicket: "E-ticket";
        readonly eventInfo: "Информация о событии";
        readonly date: "Дата";
        readonly time: "Время";
        readonly location: "Место";
        readonly locationOnline: "Онлайн";
        readonly format: "Формат";
        readonly attendee: "Участник";
        readonly number: "Билет №";
        readonly qrTitle: "QR для входа";
    };
    readonly format: {
        readonly online: "Онлайн";
        readonly offline: "Офлайн";
        readonly hybrid: "Гибрид";
    };
    readonly qr: {
        readonly instruction: "Покажите QR-код на входе";
        readonly checkedIn: "Вы уже отмечены";
        readonly used: "Билет использован";
        readonly usedPlaceholder: "Билет уже использован";
    };
    readonly security: {
        readonly line: "Безопасно · Уникальный билет · Передача невозможна";
    };
    readonly poweredBy: "Организовано через";
    readonly actions: {
        readonly download: "Скачать PDF";
        readonly downloading: "Скачивание…";
        readonly downloadError: "Не удалось скачать билет";
        readonly addToCalendar: "В календарь";
        readonly share: "Поделиться";
        readonly shareText: "Мой билет на «{event}»";
        readonly shareError: "Не удалось поделиться";
        readonly linkCopied: "Ссылка скопирована";
        readonly copy: "Скопировать номер";
        readonly copyAria: "Скопировать номер билета {number}";
        readonly copySuccess: "Номер билета скопирован";
        readonly copyError: "Не удалось скопировать";
        readonly openFullPage: "Открыть полностраничный билет";
    };
    readonly empty: {
        readonly pendingTitle: "Билет на рассмотрении";
        readonly pendingBody: "Ваша заявка на участие пока ожидает одобрения организатором. Билет станет активным сразу после подтверждения.";
        readonly cancelledTitle: "Билет отменён";
        readonly cancelledBody: "Эта регистрация была отменена. QR-код больше не действует.";
        readonly notRegisteredTitle: "Билет не выпущен";
        readonly notRegisteredBody: "Мы не нашли активной регистрации на это мероприятие в вашем кабинете.";
        readonly unknownTitle: "Билет недоступен";
        readonly unknownBody: "Не удалось загрузить билет. Попробуйте позже.";
        readonly backToEvents: "К моим событиям";
        readonly primaryActionDefault: "К моим событиям";
    };
    readonly aria: {
        readonly cardLabel: "E-билет на «{event}», номер {number}";
        readonly qrTitle: "QR-код для входа, билет {number}";
    };
};
//# sourceMappingURL=ticket.d.ts.map