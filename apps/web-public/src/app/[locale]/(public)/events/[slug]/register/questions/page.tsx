"use client";

import { useState, useCallback, useMemo, useRef } from "react";

import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { CheckCircle2, Loader2 } from "lucide-react";

import { useLocale, useT } from "@eventflow/i18n/react";
import { isActiveRegistration } from "@entities/event";
import { mapPublicEventToDesignEvent } from "@entities/event/lib";
import {
  RegistrationQuestionStep,
  formDataToAnswers,
} from "@features/event/registration-form";
import { ApiError } from "@shared/lib";
import {
  useAuthReadyState,
  usePublicEventQuery,
  useCanRegisterQuery,
  useRegisterForEventMutation,
  useRegistrationQuestionsQuery,
  useRegistrationDraft,
} from "@shared/lib/hooks";
import { useReducedMotion } from "@shared/lib/hooks/useReducedMotion";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { Container } from "@shared/ui/container";
import { EventPoster, Eyebrow } from "@shared/ui/design-system";

import { resolveAvatarUrl } from "@shared/lib/utils";

import { HostAvatar } from "../_host-avatar";
import "../_styles.css";

import type { PublicEvent } from "@shared/api/eventService";

const pickLang = (locale: string): "en" | "ru" | "uz" =>
  locale === "ru" ? "ru" : locale === "uz" ? "uz" : "en";

const tl = (
  lang: "en" | "ru" | "uz",
  bag: { en: string; ru: string; uz: string },
): string => bag[lang] ?? bag.en;

const L = {
  hostedBy: { en: "Hosted by", ru: "Организатор", uz: "Tashkilotchi" },
};

/** Visual state of one cell in the segmented question rail. */
function segmentState(args: {
  index: number;
  currentStep: number;
  isAnswered: boolean;
}): string {
  const { index, currentStep, isAnswered } = args;
  if (index === currentStep) return "is-current";
  if (isAnswered) return "is-answered";
  if (index < currentStep) return "is-seen";
  return "is-todo";
}

/* eslint-disable complexity, max-lines-per-function -- пошаговый опрос, много состояний и ветвлений */
export default function EventRegisterQuestionsPage(): React.ReactNode {
  const locale = useLocale();
  const lang = pickLang(locale);
  const t = useT();
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const inviteCodeFromUrl = searchParams.get("inviteCode") ?? undefined;
  // `null` until hydration: isAuthenticated() reads localStorage and is always
  // false on the server, so reading it straight into the markup flashed the
  // sign-in gate at users who were in fact signed in.
  const authState = useAuthReadyState();
  const isUserAuthenticated = authState === true;
  const currentQuestionsPath = withLocalePath(
    inviteCodeFromUrl
      ? `/events/${slug}/register/questions?inviteCode=${encodeURIComponent(inviteCodeFromUrl)}`
      : `/events/${slug}/register/questions`,
    locale,
  );
  const loginHref = `/login?redirect=${encodeURIComponent(currentQuestionsPath)}`;

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Advancing a step keeps the scroll position of the previous (possibly
  // long) question, so the new one lands off-screen and Next feels like a
  // no-op. Pull the progress rail + question back into view on every move.
  const reducedMotion = useReducedMotion();
  const progressRef = useRef<HTMLDivElement>(null);
  const scrollToQuestion = useCallback((): void => {
    const node = progressRef.current;
    if (!node) return;
    window.requestAnimationFrame(() => {
      node.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }, [reducedMotion]);

  const { data: event, isLoading: isEventLoading } = usePublicEventQuery(slug, {
    bySlug: true,
    inviteCode: inviteCodeFromUrl,
  });
  const {
    data: canRegisterData,
    isFetched: isCanRegisterFetched,
  } = useCanRegisterQuery(event?.id ?? "", {
    enabled: !!event?.id && isUserAuthenticated,
    inviteCode: inviteCodeFromUrl,
  });
  const { data: questions = [], isLoading: isQuestionsLoading } =
    useRegistrationQuestionsQuery(event?.id ?? "", {
      enabled: !!event?.id && isUserAuthenticated,
    });

  // Активная регистрация (PENDING/APPROVED) — форму опроса не показываем
  const hasActiveRegistration =
    isActiveRegistration(event?.myRegistration) ||
    (canRegisterData?.isRegistered ?? false);

  // Черновик прошлой незавершённой попытки: сохранённые ответы + уже
  // загруженные файлы. Пока участник не выбрал «продолжить» или «начать
  // заново», форму не рендерим — иначе новая загрузка файла попадёт под
  // удаление черновика.
  const draft = useRegistrationDraft(event?.id ?? "", {
    enabled:
      !!event?.id &&
      isUserAuthenticated &&
      isCanRegisterFetched &&
      !hasActiveRegistration,
  });

  const isAlreadyRegisteredErrorLike = (error: unknown): boolean => {
    const msg = String(
      (error as { message?: unknown })?.message ?? "",
    ).toLowerCase();
    const status = error instanceof ApiError ? error.status : undefined;
    return (
      status === 409 ||
      msg.includes("already registered") ||
      msg.includes("уже зарегистрирован")
    );
  };

  const clearDraft = draft.clear;
  const registerMutation = useRegisterForEventMutation({
    onSuccess: () => {
      // Регистрация отправлена — черновик больше не нужен (файлы на сервере
      // перешли в ATTACHED и принадлежат регистрации).
      clearDraft();
      router.replace(withLocalePath(`/events/${slug}/register?done=1`, locale));
    },
    onError: (error) => {
      // If the user is already registered, route to the registration page,
      // which will show the success/already-registered card without flashing
      // a foreign-language error.
      if (isAlreadyRegisteredErrorLike(error)) {
        router.replace(withLocalePath(`/events/${slug}/register`, locale));
      }
    },
  });

  const designEvent = useMemo(
    () =>
      event
        ? mapPublicEventToDesignEvent(event as PublicEvent, {
            locale,
            timeZone: event.timezone,
          })
        : null,
    [event, locale],
  );

  const submitRegistration = useCallback(
    (answersOverride?: Record<string, string>): void => {
      if (!event) return;
      if (!isUserAuthenticated) {
        router.replace(loginHref);
        return;
      }
      const answerList = formDataToAnswers(
        answersOverride ?? answers,
        questions.map((q) => q.id),
      );
      registerMutation.mutate({
        eventId: event.id,
        data: { answers: answerList },
        inviteCode: inviteCodeFromUrl,
      });
    },
    [
      event,
      answers,
      questions,
      registerMutation,
      inviteCodeFromUrl,
      isUserAuthenticated,
      loginHref,
      router,
    ],
  );

  const current = questions[currentStep];
  const isLast = currentStep === questions.length - 1;
  const value = current ? (answers[current.id] ?? "") : "";
  const canSkip = current && !current.required;

  // Каждое изменение формы уходит в черновик — иначе уход со страницы стирает
  // ответы, а загруженные файлы остаются на сервере (см. useRegistrationDraft).
  const saveDraft = draft.save;

  const handleChange = useCallback(
    (v: string): void => {
      if (!current) return;
      const next = { ...answers, [current.id]: v };
      setAnswers(next);
      saveDraft(next, currentStep);
      setFieldError(null);
    },
    [current, answers, currentStep, saveDraft],
  );

  const handleSkip = useCallback((): void => {
    if (!current) return;
    const next = { ...answers, [current.id]: "" };
    setAnswers(next);
    setFieldError(null);
    // Skipping the *last* optional question used to clamp back onto itself,
    // so the button visibly did nothing and the flow dead-ended. Skipping the
    // final question means "I'm done" — submit.
    if (isLast) {
      saveDraft(next, currentStep);
      submitRegistration(next);
      return;
    }
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    saveDraft(next, nextStep);
    scrollToQuestion();
  }, [
    current,
    answers,
    currentStep,
    isLast,
    saveDraft,
    scrollToQuestion,
    submitRegistration,
  ]);

  const handleBack = useCallback((): void => {
    const nextStep = Math.max(currentStep - 1, 0);
    setFieldError(null);
    setCurrentStep(nextStep);
    saveDraft(answers, nextStep);
    scrollToQuestion();
  }, [answers, currentStep, saveDraft, scrollToQuestion]);

  // Jumping back via the progress rail. Forward jumps stay blocked — Next is
  // what validates required answers.
  const handleJumpTo = useCallback(
    (index: number): void => {
      if (index >= currentStep || index < 0) return;
      setFieldError(null);
      setCurrentStep(index);
      saveDraft(answers, index);
      scrollToQuestion();
    },
    [answers, currentStep, saveDraft, scrollToQuestion],
  );

  const handleNext = useCallback((): void => {
    if (!current) return;
    if (current.required && !value.trim()) {
      setFieldError(t("public.events.registration.answerRequired"));
      return;
    }
    setFieldError(null);
    if (isLast) {
      submitRegistration();
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveDraft(answers, nextStep);
      scrollToQuestion();
    }
  }, [
    current,
    value,
    isLast,
    submitRegistration,
    t,
    answers,
    currentStep,
    saveDraft,
    scrollToQuestion,
  ]);

  // Продолжить прошлую попытку: ответы из черновика + шаг, на котором
  // остановились (шаг подрезаем — список вопросов мог измениться).
  const draftAnswers = draft.answers;
  const draftStep = draft.step;
  const resumeDraft = draft.resume;
  const startFreshDraft = draft.startFresh;

  const handleResumeDraft = useCallback((): void => {
    setAnswers(draftAnswers);
    setCurrentStep(
      Math.min(Math.max(draftStep, 0), Math.max(questions.length - 1, 0)),
    );
    setFieldError(null);
    resumeDraft();
  }, [draftAnswers, draftStep, questions.length, resumeDraft]);

  const handleStartFreshDraft = useCallback((): void => {
    setAnswers({});
    setCurrentStep(0);
    setFieldError(null);
    startFreshDraft();
  }, [startFreshDraft]);

  // Block on the same readiness gate as the parent register page so we never
  // render the question-card to a user who is already registered.
  const isStateUnknown =
    authState === null ||
    isEventLoading ||
    isQuestionsLoading ||
    (Boolean(event?.id) && isUserAuthenticated && !isCanRegisterFetched) ||
    draft.status === "loading";

  if (isStateUnknown) {
    return (
      <div className="cm-reg-loading">
        <Loader2 className="cm-reg-spinner" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="cm-reg">
        <Container size="wide">
          <div className="cm-reg-empty">
            <h1 className="cm-reg-empty__title">
              {t("public.events.registration.notFoundTitle")}
            </h1>
            <Link href="/events" className="cm-reg-cta">
              {t("public.events.registration.backToEvents")}
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  if (!isUserAuthenticated) {
    return (
      <div className="cm-reg">
        <Container size="wide">
          <div className="cm-reg-gate">
            <Eyebrow>{t("public.events.registration.title")}</Eyebrow>
            <h1 className="cm-reg-empty__title">
              {t("public.events.registration.signInForQuestionsTitle")}
            </h1>
            <p className="cm-reg-empty__lede">
              {t("public.events.registration.signInForQuestionsDescription")}
            </p>
            <div className="cm-reg-actions">
              <Link href={loginHref} className="cm-reg-cta">
                {t("public.auth.login")}
              </Link>
              <Link
                href={`/events/${slug}/register`}
                className="cm-reg-cta cm-reg-cta--ghost"
              >
                {t("public.events.registration.backToRegistrationPage")}
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // Уже зарегистрирован: активная регистрация (PENDING/APPROVED) или can-register
  const isUserRegistered =
    isActiveRegistration(event.myRegistration) ||
    (canRegisterData?.isRegistered ?? false);
  if (isUserRegistered) {
    return (
      <div className="cm-reg">
        <Container size="wide">
          <div className="cm-reg-success">
            <div className="cm-reg-success__badge">
              <CheckCircle2 size={32} strokeWidth={1.6} />
            </div>
            <Eyebrow style={{ marginBottom: 4 }}>
              {t("public.events.registration.title")}
            </Eyebrow>
            <h1 className="cm-reg-success__title">
              {t("public.events.registration.alreadyRegisteredTitle")}
            </h1>
            <div className="cm-reg-success__actions">
              <Link
                href={`/events/${slug}/register`}
                className="cm-reg-cta"
              >
                {t("public.events.registration.backToRegistrationPage")}
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const isInviteOnly =
    canRegisterData?.accessType === "INVITE_ONLY" ||
    canRegisterData?.requiresInviteCode === true;
  if (isInviteOnly && !inviteCodeFromUrl) {
    return (
      <div className="cm-reg">
        <Container size="wide">
          <div className="cm-reg-gate cm-reg-gate--warn">
            <Eyebrow color="var(--ember-500)">
              {t("public.events.registration.inviteCodeLabel")}
            </Eyebrow>
            <h1 className="cm-reg-empty__title">
              {t("public.events.registration.inviteOnlyHint")}
            </h1>
            <p className="cm-reg-empty__lede">
              {t(
                "public.events.registration.inviteOnlyQuestionsDescription",
              )}
            </p>
            <Link
              href={`/events/${slug}/register`}
              className="cm-reg-cta"
            >
              {t("public.events.registration.backToRegistrationPage")}
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  if (questions.length === 0) {
    router.replace(withLocalePath(`/events/${slug}/register`, locale));
    return null;
  }

  // Незавершённая попытка: даём выбрать — продолжить с сохранённого места или
  // заполнить заново (тогда загруженные файлы черновика удаляются, и лимит
  // загрузок освобождается).
  if (draft.status === "found") {
    return (
      <div className="cm-reg">
        <Container size="wide">
          <Link
            href={`/events/${slug}/register`}
            className="cm-reg-back"
          >
            <span aria-hidden>←</span>
            {t("public.events.registration.backToRegistration")}
          </Link>

          <div className="cm-reg-gate">
            <Eyebrow>{t("public.events.registration.title")}</Eyebrow>
            <h1 className="cm-reg-empty__title">
              {t("public.events.registration.draft.title")}
            </h1>
            <p className="cm-reg-empty__lede">
              {t("public.events.registration.draft.description")}
            </p>
            <p className="cm-reg-helper">
              {t("public.events.registration.draft.saved", {
                answers: draft.answeredCount,
                files: draft.fileCount,
              })}
            </p>
            <div className="cm-reg-actions">
              <button
                type="button"
                className="cm-reg-cta"
                onClick={handleResumeDraft}
                disabled={draft.isDiscarding}
              >
                {t("public.events.registration.draft.resume")}
              </button>
              <button
                type="button"
                className="cm-reg-cta cm-reg-cta--ghost"
                onClick={handleStartFreshDraft}
                disabled={draft.isDiscarding}
              >
                {draft.isDiscarding ? (
                  <>
                    <Loader2 className="cm-reg-spinner cm-reg-spinner--sm" />
                    {t("public.events.registration.draft.restarting")}
                  </>
                ) : (
                  t("public.events.registration.draft.restart")
                )}
              </button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (!current) {
    return null;
  }

  const isAlreadyRegisteredError =
    registerMutation.isError &&
    isAlreadyRegisteredErrorLike(registerMutation.error);

  const isInviteOnly403 =
    registerMutation.isError &&
    registerMutation.error instanceof ApiError &&
    registerMutation.error.status === 403;

  const backHref = inviteCodeFromUrl
    ? `/events/${slug}/register?inviteCode=${encodeURIComponent(inviteCodeFromUrl)}`
    : `/events/${slug}/register`;

  return (
    <div className="cm-reg">
      <Container size="wide">
        <Link href={backHref} className="cm-reg-back">
          <span aria-hidden>←</span>
          {t("public.events.registration.backToRegistration")}
        </Link>

        {/* No page heading of its own: the question itself is the h1. A
            "Registration form / answer every question" preamble only repeated
            the gate the attendee tapped through, and pushed the actual
            question down the screen. */}
        <div className="cm-reg-progress" ref={progressRef}>
          <div className="cm-reg-progress__head">
            <span className="cm-reg-progress__event">{event.title}</span>
            <span className="cm-reg-progress__count">
              {t("public.events.registration.questionProgress", {
                current: currentStep + 1,
                total: questions.length,
              })}
            </span>
          </div>
          <ol
            className="cm-reg-track"
            aria-label={t("public.events.registration.questionProgress", {
              current: currentStep + 1,
              total: questions.length,
            })}
          >
            {questions.map((q, i) => {
              const state = segmentState({
                index: i,
                currentStep,
                isAnswered: Boolean((answers[q.id] ?? "").trim()),
              });
              const canJump = i < currentStep;
              return (
                <li key={q.id} className="cm-reg-track__cell">
                  <button
                    type="button"
                    className={`cm-reg-track__seg ${state}`}
                    onClick={canJump ? () => handleJumpTo(i) : undefined}
                    disabled={!canJump}
                    aria-current={i === currentStep ? "step" : undefined}
                    aria-label={t(
                      "public.events.registration.goToQuestionAria",
                      { index: i + 1 },
                    )}
                  >
                    <span aria-hidden />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="cm-reg-grid">
          <main className="cm-reg-main">
            {isAlreadyRegisteredError ? (
              <div className="cm-reg-success" style={{ margin: 0 }}>
                <div className="cm-reg-success__badge">
                  <CheckCircle2 size={28} strokeWidth={1.6} />
                </div>
                <h2 className="cm-reg-success__title">
                  {t("public.events.registration.alreadyRegisteredForEvent")}
                </h2>
                <p className="cm-reg-success__lede">
                  {t("public.events.registration.ticketAvailableInProfile")}
                </p>
                <div className="cm-reg-success__actions">
                  <Link
                    href={`/events/${slug}/register`}
                    className="cm-reg-cta"
                  >
                    {t("public.events.registration.backToRegistrationPage")}
                  </Link>
                </div>
              </div>
            ) : (
              <RegistrationQuestionStep
                question={current}
                eventId={event.id}
                value={value}
                onChange={handleChange}
                error={fieldError ?? undefined}
                disabled={registerMutation.isPending}
                onSkip={canSkip ? handleSkip : undefined}
                onBack={currentStep > 0 ? handleBack : undefined}
                onNext={handleNext}
                isLast={isLast}
                isSubmitting={registerMutation.isPending}
                nextLabel={
                  isLast
                    ? t("public.events.registration.register")
                    : t("actions.next")
                }
                skipLabel={t("actions.skip")}
                backLabel={t("actions.back")}
                requiredLabel={t(
                  "public.events.registration.requiredQuestion",
                )}
                lastStepNote={t(
                  "public.events.registration.lastQuestionNote",
                  { action: t("public.events.registration.register") },
                )}
              />
            )}

            {(registerMutation.isError || isInviteOnly403) &&
              !isAlreadyRegisteredError && (
                <p className="cm-reg-helper cm-reg-helper--err" role="alert">
                  {isInviteOnly403
                    ? t("public.events.registration.inviteOnlyError")
                    : t("public.events.registration.genericError")}
                </p>
              )}
          </main>

          {/* `--after`: on phones the summary card used to sit above the form
              (order: -1), so the whole first screen was a poster and the
              question fell below the fold — attendees thought there was
              nothing to fill in. Context follows the task here. */}
          <aside className="cm-reg-aside cm-reg-aside--after cm-reg-aside--compact">
            <div className="cm-reg-card">
              {designEvent ? (
                <div className="cm-reg-card__poster">
                  <EventPoster event={designEvent} />
                </div>
              ) : null}
              <div className="cm-reg-card__body">
                <div className="cm-reg-card__title">{event.title}</div>
                {event.shortDescription ? (
                  <p className="cm-reg-card__lede">
                    {event.shortDescription}
                  </p>
                ) : null}
                {event.organization?.name ? (
                  <div className="cm-reg-card__host" style={{ borderTop: 0, paddingTop: 0, marginTop: 0 }}>
                    <HostAvatar
                      name={event.organization.name}
                      logoUrl={resolveAvatarUrl(event.organization.logoUrl)}
                    />
                    <div>
                      <div className="cm-reg-card__host-label">
                        {tl(lang, L.hostedBy)}
                      </div>
                      <div className="cm-reg-card__host-name">
                        {event.organization.name}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
/* eslint-enable complexity, max-lines-per-function */
