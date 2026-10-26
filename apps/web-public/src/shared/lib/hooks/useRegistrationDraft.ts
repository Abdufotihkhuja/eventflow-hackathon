"use client";

/**
 * Черновик незавершённой регистрации на событие.
 *
 * Проблема, которую он решает: ответы на вопросы жили только в состоянии
 * страницы и терялись при уходе с неё, а загруженные файлы оставались на
 * сервере в статусе PENDING. Вернувшись, участник видел пустую форму, но
 * повторно загрузить файл не мог — лимит уже занят невидимым файлом. Тупик.
 *
 * Решение: черновик становится явным. Ответы кладём в localStorage, файлы
 * читаем с сервера, и на входе в форму участник выбирает — продолжить прошлую
 * попытку или начать заново (тогда серверные файлы удаляются, localStorage
 * очищается).
 *
 * Источник истины по файлам — сервер: ответы на FILE_UPLOAD-вопросы всегда
 * пересобираются из его списка, даже если localStorage разошёлся с ним
 * (другое устройство, очищенное хранилище).
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  registrationService,
  type RegistrationAnswerFile,
} from "@shared/api/registrationService";

/** Черновик старше этого срока считается протухшим и игнорируется. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const storageKey = (eventId: string): string =>
  `eventflow.registration-draft.${eventId}`;

interface StoredDraft {
  answers: Record<string, string>;
  step: number;
  updatedAt: number;
}

function readStored(eventId: string): StoredDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(eventId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const updatedAt =
      typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
    if (Date.now() - updatedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(storageKey(eventId));
      return null;
    }
    const answers =
      parsed.answers && typeof parsed.answers === "object"
        ? (parsed.answers as Record<string, string>)
        : {};
    return {
      answers,
      step: typeof parsed.step === "number" ? parsed.step : 0,
      updatedAt,
    };
  } catch {
    // Приватный режим / повреждённый JSON — просто нет черновика.
    return null;
  }
}

function writeStored(eventId: string, draft: StoredDraft): void {
  try {
    localStorage.setItem(storageKey(eventId), JSON.stringify(draft));
  } catch {
    // Хранилище недоступно — черновик просто не переживёт уход со страницы.
  }
}

function dropStored(eventId: string): void {
  try {
    localStorage.removeItem(storageKey(eventId));
  } catch {
    // Нечего чистить.
  }
}

/** Файлы сервера → значения полей FILE_UPLOAD в формате виджета загрузки. */
function fileAnswersFromServer(
  files: RegistrationAnswerFile[]
): Record<string, string> {
  const byQuestion = new Map<
    string,
    Array<{ id: string; name: string; size: number }>
  >();
  for (const file of files) {
    const list = byQuestion.get(file.questionId) ?? [];
    list.push({ id: file.id, name: file.originalName, size: file.size });
    byQuestion.set(file.questionId, list);
  }
  return Object.fromEntries(
    [...byQuestion].map(([questionId, list]) => [
      questionId,
      JSON.stringify(list),
    ])
  );
}

/**
 * Непустые ответы (для показа «сколько уже заполнено»). Файловые вопросы
 * считаются отдельно — иначе один загруженный файл выглядел бы и как ответ,
 * и как файл.
 */
function countAnswered(
  answers: Record<string, string>,
  fileQuestionIds: Set<string>
): number {
  return Object.entries(answers).filter(
    ([questionId, value]) =>
      !fileQuestionIds.has(questionId) && value.trim().length > 0
  ).length;
}

export type RegistrationDraftStatus =
  /** Читаем черновик — форму рендерить рано. */
  | "loading"
  /** Черновик найден — ждём выбора «продолжить» / «начать заново». */
  | "found"
  /** Выбор сделан (или черновика не было) — форма активна. */
  | "active";

export interface UseRegistrationDraftOptions {
  /** Читать черновик только когда форма действительно открывается. */
  enabled?: boolean;
}

export interface UseRegistrationDraftReturn {
  status: RegistrationDraftStatus;
  /** Ответы прошлой попытки: localStorage + файлы с сервера. */
  answers: Record<string, string>;
  /** Шаг, на котором участник остановился. */
  step: number;
  /** Сколько вопросов уже заполнено и сколько файлов загружено. */
  answeredCount: number;
  fileCount: number;
  /** Идёт удаление черновика после выбора «начать заново». */
  isDiscarding: boolean;
  /** Продолжить прошлую попытку. */
  resume: () => void;
  /** Начать заново: удалить файлы черновика и очистить сохранённые ответы. */
  startFresh: () => void;
  /** Сохранить прогресс (вызывается на каждое изменение формы). */
  save: (answers: Record<string, string>, step: number) => void;
  /** Забыть черновик после успешной отправки регистрации. */
  clear: () => void;
}

export function useRegistrationDraft(
  eventId: string,
  options?: UseRegistrationDraftOptions
): UseRegistrationDraftReturn {
  const enabled = (options?.enabled ?? true) && !!eventId;

  const [status, setStatus] = useState<RegistrationDraftStatus>("loading");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [fileQuestionIds, setFileQuestionIds] = useState<Set<string>>(
    () => new Set()
  );
  const [isDiscarding, setIsDiscarding] = useState(false);
  const loadedForRef = useRef<string | null>(null);

  // Разовое чтение черновика при открытии формы: localStorage (ответы) +
  // сервер (файлы). Пока не прочитали — статус loading, форма не рендерится.
  // eslint-disable-next-line no-restricted-syntax -- side-effect входа в форму, инкапсулирован в хук
  useEffect(() => {
    if (!enabled) return;
    if (loadedForRef.current === eventId) return;
    loadedForRef.current = eventId;

    const stored = readStored(eventId);

    void registrationService
      .getAnswerFilesDraft(eventId)
      .catch((): RegistrationAnswerFile[] => [])
      .then((files) => {
        const fileAnswers = fileAnswersFromServer(files);
        const fileIds = new Set(Object.keys(fileAnswers));
        const merged = { ...(stored?.answers ?? {}), ...fileAnswers };
        setAnswers(merged);
        setStep(stored?.step ?? 0);
        setFileCount(files.length);
        setFileQuestionIds(fileIds);
        setStatus(
          countAnswered(merged, fileIds) > 0 || files.length > 0
            ? "found"
            : "active"
        );
      });
  }, [enabled, eventId]);

  const resume = useCallback((): void => setStatus("active"), []);

  const startFresh = useCallback((): void => {
    setIsDiscarding(true);
    dropStored(eventId);
    registrationService
      .resetAnswerFilesDraft(eventId)
      .catch(() => {
        // Best-effort: не блокируем форму. В худшем случае о занятом лимите
        // скажет сам upload — как было до появления черновиков.
      })
      .finally(() => {
        setAnswers({});
        setStep(0);
        setFileCount(0);
        setFileQuestionIds(new Set());
        setIsDiscarding(false);
        setStatus("active");
      });
  }, [eventId]);

  const save = useCallback(
    (next: Record<string, string>, nextStep: number): void => {
      if (!eventId) return;
      writeStored(eventId, {
        answers: next,
        step: nextStep,
        updatedAt: Date.now(),
      });
    },
    [eventId]
  );

  const clear = useCallback((): void => dropStored(eventId), [eventId]);

  return {
    status: enabled ? status : "active",
    answers,
    step,
    answeredCount: countAnswered(answers, fileQuestionIds),
    fileCount,
    isDiscarding,
    resume,
    startFresh,
    save,
    clear,
  };
}
