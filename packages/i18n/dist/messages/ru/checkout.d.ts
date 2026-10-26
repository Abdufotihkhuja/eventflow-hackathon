/**
 * Публичный чекаут билета (P-15 поверх M-4). Источник копирайта:
 * docs/monetization/10-decisions.md — честный managed-тон: онлайн-провайдеры
 * за внешним гейтом (M-5/M-16), оплату подтверждает оператор EventFlow
 * вручную; никаких фейковых карточных форм и невыполнимых обещаний.
 */
export declare const checkout: {
    readonly ticket: {
        readonly eyebrow: "Билет";
        readonly regionAria: "Оплата билета";
        readonly intro: "Это платное мероприятие — место закрепляется после оплаты билета.";
        readonly amountLabel: "К оплате";
        readonly cta: "Оформить счёт на билет";
        readonly creating: "Оформляем счёт…";
        readonly pendingTitle: "Счёт оформлен — ждём оплату";
        readonly holdUntil: "Бронь места до {time}";
        readonly holdLeft: "осталось около {minutes} мин";
        readonly managedNotice: "Онлайн-оплата картой появится после подключения провайдеров. Сейчас оплату подтверждает оператор EventFlow — реквизиты пришлём на почту, статус обновится автоматически после подтверждения.";
        readonly refreshCta: "Обновить статус";
        readonly refreshing: "Проверяем…";
        readonly paidTitle: "Билет оплачен";
        readonly paidNote: "Ваше место подтверждено. Электронный билет доступен в профиле.";
        readonly expiredTitle: "Бронь истекла";
        readonly expiredNote: "Срок прошлого счёта истёк. Создайте новый, чтобы снова забронировать место.";
        readonly retryCta: "Создать новый счёт";
        readonly cancelledNote: "Прошлый заказ отменён. Можно оформить новый счёт.";
        readonly refundedNote: "По прошлому заказу оформлен возврат. Можно оформить новый счёт.";
        readonly error: "Не удалось оформить счёт. Попробуйте ещё раз.";
        readonly via: {
            readonly notice: "Оплатите онлайн через VIA (UZCARD / HUMO). Вы перейдёте на защищённую платёжную страницу VIA — данные карты к нам не попадают.";
            readonly payCta: "Оплатить онлайн через VIA";
            readonly redirecting: "Открываем страницу оплаты…";
            readonly error: "Не удалось начать оплату. Попробуйте ещё раз.";
            readonly returnMetaTitle: "Проверка оплаты";
            readonly returnMetaDescription: "Проверяем оплату билета через VIA на мероприятие EventFlow.";
            readonly verifying: "Проверяем оплату…";
            readonly paidTitle: "Оплата подтверждена";
            readonly paidBody: "Билет оплачен, место закреплено. Электронный билет доступен в профиле.";
            readonly openTicket: "Открыть билет";
            readonly myEvents: "Мои мероприятия";
            readonly pendingTitle: "Оплата ещё не подтверждена";
            readonly pendingBody: "Банку может понадобиться немного времени. Проверьте через минуту — статус обновится автоматически, как только VIA подтвердит платёж.";
            readonly recheck: "Проверить ещё раз";
            readonly closedTitle: "Счёт закрыт";
            readonly closedBody: "Срок этого счёта истёк или он отменён. Новый счёт можно оформить на странице мероприятия.";
            readonly invalidLinkTitle: "Некорректная ссылка";
            readonly invalidLinkBody: "Ссылка проверки оплаты повреждена или неполная.";
            readonly browseEvents: "К афише";
            readonly loginTitle: "Войдите, чтобы продолжить";
            readonly loginBody: "Войдите в аккаунт, с которого оформлена регистрация, чтобы проверить оплату.";
            readonly loginCta: "Войти";
            readonly errorTitle: "Не удалось проверить оплату";
            readonly errorBody: "Сейчас проверить оплату не получилось. Деньги в безопасности — попробуйте ещё раз через минуту.";
        };
    };
};
//# sourceMappingURL=checkout.d.ts.map