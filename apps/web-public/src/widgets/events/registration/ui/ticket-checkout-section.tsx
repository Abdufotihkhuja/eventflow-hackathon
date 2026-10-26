"use client";

/**
 * Блок «Билет» на success-экране регистрации платного события (P-15, M-4).
 *
 * Честный managed-поток: онлайн-провайдеры за внешним гейтом (M-5/M-16),
 * оплату подтверждает оператор EventFlow — никаких фейковых карточных форм.
 * GET-эндпоинта заказа нет: «Обновить статус» идемпотентно повторяет чекаут
 * и получает живой заказ; 409 TICKET_ALREADY_PAID трактуем как «оплачено».
 */

import { useState } from "react";

import { formatNumber, type Locale, type Translator } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import { Check } from "lucide-react";

import { formatUtcToLocalDateTime } from "@shared/lib/date";
import {
  isTicketAlreadyPaidError,
  useInterval,
  useTicketCheckoutMutation,
  useViaPaymentMutation,
  type TicketOrder,
  type TicketOrderStatus,
} from "@shared/lib/hooks";
import { formatUzs } from "@shared/lib/pricing-format";
import { Eyebrow } from "@shared/ui/design-system";
import { Spinner } from "@shared/ui/spinner";

import type { PublicEventDetail } from "@shared/api/eventService";

import "./ticket-checkout.css";

type TicketView = "cta" | "pending" | "paid" | "expired" | "closed";

interface ViewInputs {
  alreadyPaid: boolean;
  status: TicketOrderStatus | undefined;
  isAwaitingPayment: boolean;
  isHoldExpired: boolean;
}

/** Разрешение видимого состояния блока из статуса заказа и таймера брони. */
function resolveTicketView({
  alreadyPaid,
  status,
  isAwaitingPayment,
  isHoldExpired,
}: ViewInputs): TicketView {
  if (alreadyPaid || status === "PAID") {
    return "paid";
  }
  if (status === "EXPIRED" || (isAwaitingPayment && isHoldExpired)) {
    return "expired";
  }
  if (status === "CANCELLED" || status === "REFUNDED") {
    return "closed";
  }
  if (isAwaitingPayment) {
    return "pending";
  }
  return "cta";
}

/**
 * Сумма заказа из строки тийинов (D-3, без float): UZS — через formatUzs
 * (целые сумы + локализованный суффикс); прочие валюты — цифро-строчная
 * математика, последние два знака — дробная часть.
 */
function formatOrderAmount(order: TicketOrder, locale: Locale): string | null {
  if (order.currency === "UZS") {
    return formatUzs(order.amountMinor, locale);
  }
  if (!/^\d+$/.test(order.amountMinor)) {
    return null;
  }
  const digits = order.amountMinor.padStart(3, "0");
  const units = Number(digits.slice(0, -2));
  if (!Number.isSafeInteger(units)) {
    return null;
  }
  const cents = digits.slice(-2);
  const main = formatNumber(units, locale, { maximumFractionDigits: 0 });
  return `${cents === "00" ? main : `${main}.${cents}`} ${order.currency}`;
}

/** Витринная цена события до создания заказа (паритет с карточкой aside). */
function formatEventPrice(
  event: PublicEventDetail,
  locale: string,
  t: Translator,
): string | null {
  if (!event.price) {
    return null;
  }
  const amount = formatNumber(Number(event.price), locale);
  return `${amount} ${event.currency || t("public.events.registration.sum")}`;
}

function AmountRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactNode {
  return (
    <div className="cm-ticket__amount-row">
      <span className="cm-ticket__amount-label">{label}</span>
      <span className="cm-ticket__amount">{value}</span>
    </div>
  );
}

function BusyButton({
  onClick,
  disabled,
  isBusy,
  busyLabel,
  idleLabel,
  variant,
}: {
  onClick: () => void;
  disabled: boolean;
  isBusy: boolean;
  busyLabel: string;
  idleLabel: string;
  variant: "primary" | "ghost";
}): React.ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={isBusy || undefined}
      className={
        variant === "primary" ? "cm-ticket__cta" : "cm-ticket__refresh"
      }
    >
      {isBusy ? (
        <>
          <Spinner size="sm" tone="current" />
          {busyLabel}
        </>
      ) : (
        idleLabel
      )}
    </button>
  );
}

interface PendingOrderViewProps {
  order: TicketOrder;
  orderAmount: string | null;
  minutesLeft: number | null;
  isBusy: boolean;
  onRefresh: () => void;
  isViaBusy: boolean;
  onPayVia: (() => void) | null;
  viaError: boolean;
  error: React.ReactNode;
  t: Translator;
}

/**
 * Заказ создан, ждём оплату: при включённом VIA — онлайн-оплата на
 * hosted-странице провайдера, иначе managed-поток (оператор).
 */
function PendingOrderView({
  order,
  orderAmount,
  minutesLeft,
  isBusy,
  onRefresh,
  isViaBusy,
  onPayVia,
  viaError,
  error,
  t,
}: PendingOrderViewProps): React.ReactNode {
  return (
    <>
      <div aria-live="polite">
        <h3 className="cm-ticket__title">
          {t("checkout.ticket.pendingTitle")}
        </h3>
      </div>
      {orderAmount ? (
        <AmountRow
          label={t("checkout.ticket.amountLabel")}
          value={orderAmount}
        />
      ) : null}
      {order.holdExpiresAt ? (
        <p className="cm-ticket__hold">
          {t("checkout.ticket.holdUntil", {
            time: formatUtcToLocalDateTime(order.holdExpiresAt, {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })}
          {minutesLeft !== null ? (
            <span className="cm-ticket__hold-left">
              {" · "}
              {t("checkout.ticket.holdLeft", { minutes: minutesLeft })}
            </span>
          ) : null}
        </p>
      ) : null}
      {onPayVia ? (
        <>
          <p className="cm-ticket__notice">{t("checkout.ticket.via.notice")}</p>
          <BusyButton
            onClick={onPayVia}
            disabled={isViaBusy || isBusy}
            isBusy={isViaBusy}
            busyLabel={t("checkout.ticket.via.redirecting")}
            idleLabel={t("checkout.ticket.via.payCta")}
            variant="primary"
          />
          {viaError ? (
            <p className="cm-ticket__error" role="alert">
              {t("checkout.ticket.via.error")}
            </p>
          ) : null}
        </>
      ) : (
        <p className="cm-ticket__notice">
          {t("checkout.ticket.managedNotice")}
        </p>
      )}
      <BusyButton
        onClick={onRefresh}
        disabled={isBusy || isViaBusy}
        isBusy={isBusy}
        busyLabel={t("checkout.ticket.refreshing")}
        idleLabel={t("checkout.ticket.refreshCta")}
        variant="ghost"
      />
      {error}
    </>
  );
}

/** Терминальный успех: билет оплачен (в т.ч. по 409 TICKET_ALREADY_PAID). */
function PaidView({ t }: { t: Translator }): React.ReactNode {
  return (
    <div className="cm-ticket__paid" aria-live="polite">
      <span className="cm-ticket__paid-icon" aria-hidden>
        <Check size={18} strokeWidth={2.4} />
      </span>
      <div className="cm-ticket__paid-body">
        <h3 className="cm-ticket__title">{t("checkout.ticket.paidTitle")}</h3>
        <p className="cm-ticket__note">{t("checkout.ticket.paidNote")}</p>
      </div>
    </div>
  );
}

interface RetryViewProps {
  view: "expired" | "closed";
  status: TicketOrderStatus | undefined;
  isBusy: boolean;
  canCheckout: boolean;
  onRetry: () => void;
  error: React.ReactNode;
  t: Translator;
}

/** Бронь истекла / заказ закрыт — честное объяснение + новый счёт. */
function RetryView({
  view,
  status,
  isBusy,
  canCheckout,
  onRetry,
  error,
  t,
}: RetryViewProps): React.ReactNode {
  let note = t("checkout.ticket.expiredNote");
  if (view === "closed") {
    note =
      status === "REFUNDED"
        ? t("checkout.ticket.refundedNote")
        : t("checkout.ticket.cancelledNote");
  }
  return (
    <>
      {view === "expired" ? (
        <div aria-live="polite">
          <h3 className="cm-ticket__title">
            {t("checkout.ticket.expiredTitle")}
          </h3>
        </div>
      ) : null}
      <p className="cm-ticket__note">{note}</p>
      <BusyButton
        onClick={onRetry}
        disabled={isBusy || !canCheckout}
        isBusy={isBusy}
        busyLabel={t("checkout.ticket.creating")}
        idleLabel={t("checkout.ticket.retryCta")}
        variant="primary"
      />
      {error}
    </>
  );
}

interface CtaViewProps {
  priceLabel: string | null;
  isBusy: boolean;
  canCheckout: boolean;
  onCheckout: () => void;
  error: React.ReactNode;
  t: Translator;
}

/** Стартовое состояние: пояснение + «Оформить счёт на билет». */
function CtaView({
  priceLabel,
  isBusy,
  canCheckout,
  onCheckout,
  error,
  t,
}: CtaViewProps): React.ReactNode {
  return (
    <>
      <p className="cm-ticket__intro">{t("checkout.ticket.intro")}</p>
      {priceLabel ? (
        <AmountRow
          label={t("checkout.ticket.amountLabel")}
          value={priceLabel}
        />
      ) : null}
      <BusyButton
        onClick={onCheckout}
        disabled={isBusy || !canCheckout}
        isBusy={isBusy}
        busyLabel={t("checkout.ticket.creating")}
        idleLabel={t("checkout.ticket.cta")}
        variant="primary"
      />
      {error}
    </>
  );
}

interface TicketCheckoutSectionProps {
  event: PublicEventDetail;
}

export function TicketCheckoutSection({
  event,
}: TicketCheckoutSectionProps): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const mutation = useTicketCheckoutMutation();
  const viaMutation = useViaPaymentMutation();
  const [order, setOrder] = useState<TicketOrder | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // myRegistration приходит с JWT; сразу после регистрации детали события
  // инвалидируются и id подтягивается рефетчем — до этого CTA неактивна.
  const registrationId = event.myRegistration?.id ?? null;

  const status = order?.status;
  const isAwaitingPayment =
    status === "REQUESTED" || status === "PENDING_PAYMENT";
  const holdExpiresAtMs = order?.holdExpiresAt
    ? new Date(order.holdExpiresAt).getTime()
    : null;
  const isHoldExpired = holdExpiresAtMs !== null && holdExpiresAtMs <= now;

  // Тик раз в 15 секунд, пока живёт бронь: обновляет обратный отсчёт и
  // честно переводит блок в «бронь истекла» без перезагрузки страницы.
  useInterval(
    () => setNow(Date.now()),
    isAwaitingPayment && holdExpiresAtMs !== null && !isHoldExpired
      ? 15_000
      : null,
  );

  const view = resolveTicketView({
    alreadyPaid,
    status,
    isAwaitingPayment,
    isHoldExpired,
  });

  const checkout = (): void => {
    if (!registrationId || mutation.isPending) {
      return;
    }
    mutation.mutate(registrationId, {
      onSuccess: (next) => {
        setOrder(next);
        setNow(Date.now());
      },
      onError: (mutationError) => {
        if (isTicketAlreadyPaidError(mutationError)) {
          setAlreadyPaid(true);
        }
      },
    });
  };

  // Уход на hosted-страницу VIA: ссылку отдаёт бэкенд, оплата — на стороне
  // провайдера (карточные данные через нас не проходят).
  const payVia = (): void => {
    if (!registrationId || viaMutation.isPending) {
      return;
    }
    viaMutation.mutate(
      { registrationId, locale },
      {
        onSuccess: ({ paymentUrl }) => {
          window.location.assign(paymentUrl);
        },
      },
    );
  };

  const isBusy = mutation.isPending;
  const showError =
    mutation.isError && !isTicketAlreadyPaidError(mutation.error);
  const errorLine = showError ? (
    <p className="cm-ticket__error" role="alert">
      {t("checkout.ticket.error")}
    </p>
  ) : null;

  const minutesLeft =
    holdExpiresAtMs !== null && !isHoldExpired
      ? Math.max(1, Math.ceil((holdExpiresAtMs - now) / 60_000))
      : null;

  return (
    <section className="cm-ticket" aria-label={t("checkout.ticket.regionAria")}>
      <Eyebrow>{t("checkout.ticket.eyebrow")}</Eyebrow>
      {view === "cta" ? (
        <CtaView
          priceLabel={formatEventPrice(event, locale, t)}
          isBusy={isBusy}
          canCheckout={registrationId !== null}
          onCheckout={checkout}
          error={errorLine}
          t={t}
        />
      ) : null}
      {view === "pending" && order ? (
        <PendingOrderView
          order={order}
          orderAmount={formatOrderAmount(order, locale)}
          minutesLeft={minutesLeft}
          isBusy={isBusy}
          onRefresh={checkout}
          isViaBusy={viaMutation.isPending}
          onPayVia={order.viaAvailable ? payVia : null}
          viaError={viaMutation.isError}
          error={errorLine}
          t={t}
        />
      ) : null}
      {view === "paid" ? <PaidView t={t} /> : null}
      {view === "expired" || view === "closed" ? (
        <RetryView
          view={view}
          status={status}
          isBusy={isBusy}
          canCheckout={registrationId !== null}
          onRetry={checkout}
          error={errorLine}
          t={t}
        />
      ) : null}
    </section>
  );
}
