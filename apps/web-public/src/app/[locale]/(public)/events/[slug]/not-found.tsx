"use client";

/**
 * 404-граница страницы события.
 *
 * Страница события рендерится на сервере, а токен пользователя лежит в
 * localStorage — серверный запрос всегда уходит анонимным. Поэтому закрытое
 * (INVITE_ONLY / PRIVATE) событие отдаёт SSR-запросу 404 даже своему
 * подтверждённому участнику: он приходит из письма-напоминания или из «Моих
 * событий», где ссылки без inviteCode.
 *
 * Здесь мы повторяем запрос уже на клиенте, с токеном: бэкенд открывает
 * закрытое событие тому, у кого есть регистрация на него. Не получилось —
 * показываем обычную 404-страницу. HTTP-статус остаётся 404, так что для
 * анонима и поисковиков поведение не меняется.
 */
import { useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useT } from "@eventflow/i18n/react";

import { useEventDetailsQuery } from "@features/event/details";
import { useAuthReadyState, useDocumentTitle } from "@shared/lib/hooks";
import { stripLocalePrefix } from "@shared/lib/i18n-routing";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Spinner } from "@shared/ui/spinner";
import { EventDetailsPage } from "@widgets/events/detail";
import { NotFoundView } from "@widgets/not-found";

export default function EventNotFound(): React.ReactNode {
  const pathname = usePathname();
  const slug = eventSlugFromPath(pathname);

  // Токен читается из localStorage, поэтому до гидратации auth-состояние
  // неизвестно (null). Пока оно неизвестно, показываем нейтральный лоадер —
  // иначе участник закрытого события увидит вспышку 404.
  const authed = useAuthReadyState();
  const retry = authed === null ? null : authed && Boolean(slug);

  // inviteCode здесь не нужен: SSR-запрос уже ходил с ним и получил 404, а
  // участнику закрытого события код и не требуется — доступ даёт регистрация.
  const { data, isError } = useEventDetailsQuery({
    slug: slug ?? "",
    enabled: retry === true,
  });

  // Серверный заголовок вкладки — «Событие не найдено»: на сервере события и
  // правда не было. Догрузили — приводим заголовок в соответствие.
  useDocumentTitle(data?.title);

  if (retry === false || isError) {
    return <NotFoundView extra={<InviteCodeEntry />} />;
  }

  if (!data) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        aria-busy="true"
      >
        <Spinner size="lg" tone="ember" />
      </div>
    );
  }

  return <EventDetailsPage slug={slug ?? ""} initialEvent={data} />;
}

/** `/uz/events/my-event` и `/events/my-event` → `my-event`. */
function eventSlugFromPath(pathname: string | null): string | undefined {
  const segments = stripLocalePrefix(pathname).split("/").filter(Boolean);
  return segments[0] === "events" ? segments[1] : undefined;
}

/**
 * INVITE_ONLY guests who got a code but no link type it here. Submitting
 * reloads this URL with `?inviteCode=`: a valid code renders the event, a wrong
 * one lands back on this 404 with the code in the URL, which shows the error.
 * Same 404 for every slug, so it never reveals whether a closed event exists.
 */
function InviteCodeEntry(): React.ReactNode {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const rejectedCode = useSearchParams().get("inviteCode") ?? "";
  const [code, setCode] = useState(rejectedCode);

  const submit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    router.push(`${pathname}?${new URLSearchParams({ inviteCode: trimmed })}`);
  };

  const showError = Boolean(rejectedCode) && code.trim().toUpperCase() === rejectedCode;

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-8 flex max-w-md flex-col gap-2 border-t border-bone-300/60 pt-8"
    >
      <label htmlFor="event-invite-code" className="text-sm font-semibold text-ink-400">
        {t("public.notFound.inviteCode.label")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="event-invite-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="EVT-XXXXXXXX"
          autoComplete="off"
          hasError={showError}
          aria-describedby={showError ? "event-invite-code-error" : undefined}
          className="font-semibold uppercase tracking-wider"
        />
        <Button type="submit" variant="primary" size="md" disabled={!code.trim()}>
          {t("public.notFound.inviteCode.submit")}
        </Button>
      </div>
      {showError ? (
        <p id="event-invite-code-error" className="text-sm text-[var(--danger)]">
          {t("public.notFound.inviteCode.invalid")}
        </p>
      ) : null}
    </form>
  );
}
