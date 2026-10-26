"use client";

import type { ReactNode } from "react";

import { AlertCircle, Check, Loader2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";

import { RegistrationFileUploadField } from "./registration-file-upload-field";

import type { RegistrationQuestionPublic } from "@shared/api/publicCatalogService";


const CHECKBOX_SEP = ", ";

type StepFieldType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "file_upload";

/* eslint-disable max-lines-per-function -- пошаговый опрос с разными типами полей */
function normalizeType(type: string): StepFieldType {
  const u = type.toUpperCase();
  if (u === "TEXT") return "text";
  if (u === "CHECKBOX") return "checkbox";
  if (u === "FILE_UPLOAD") return "file_upload";
  const l = type.toLowerCase();
  if (l === "textarea" || l === "select" || l === "radio") return l;
  return "text";
}

/**
 * Force-render "Да / Нет" (`category=CLOSED`) questions as radio buttons
 * regardless of stored `type`. Historical cabinet bug stamped these as
 * CHECKBOX in the API, which lets attendees pick both Yes AND No. Mapping
 * by category here is self-healing for any record stuck on CHECKBOX
 * even after the cabinet fix, without needing a backfill migration.
 */
function effectiveType(
  type: string,
  category: string | undefined,
): StepFieldType {
  if (category && category.toUpperCase() === "CLOSED") return "radio";
  return normalizeType(type);
}

export interface RegistrationQuestionStepProps {
  question: RegistrationQuestionPublic;
  /** Event id — needed by the file-upload field for pre-upload requests. */
  eventId: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  /** Кнопка «Пропустить» (для необязательных вопросов) */
  onSkip?: () => void;
  /** Кнопка «Назад» (если currentStep > 0) */
  onBack?: () => void;
  /** Кнопка «Далее» или «Отправить» */
  onNext: () => void;
  isLast: boolean;
  isSubmitting: boolean;
  nextLabel?: string;
  skipLabel?: string;
  backLabel?: string;
  /**
   * Badge above the question label. A bare red asterisk reads as decoration —
   * attendees skimmed past it and then hit "обязательное поле" on Next, so the
   * obligation is spelled out instead.
   */
  requiredLabel?: string;
  /** Shown above the actions on the final step, so submitting is never a surprise. */
  lastStepNote?: string;
}

export function RegistrationQuestionStep({
  question,
  eventId,
  value,
  onChange,
  error,
  disabled,
  onSkip,
  onBack,
  onNext,
  isLast,
  isSubmitting,
  nextLabel,
  skipLabel = "Skip",
  backLabel = "Back",
  requiredLabel,
  lastStepNote,
}: RegistrationQuestionStepProps): ReactNode {
  const type = effectiveType(question.type, question.category);
  const id = `q-${question.id}`;
  const hasError = Boolean(error);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    onNext();
  };

  const content = ((): ReactNode => {
    if (type === "file_upload") {
      return (
        <RegistrationFileUploadField
          eventId={eventId}
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );
    }

    if (type === "textarea") {
      return (
        <textarea
          id={id}
          className="cm-reg-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={5}
          autoFocus
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      );
    }

    if (type === "select" && question.options?.length) {
      const labels = question.options;
      const values = question.optionValues ?? labels;
      return (
        <Select
          value={value || undefined}
          onValueChange={(next) => onChange(next)}
          disabled={disabled}
        >
          <SelectTrigger
            id={id}
            hasError={hasError}
            aria-describedby={hasError ? `${id}-error` : undefined}
          >
            <SelectValue placeholder="…" />
          </SelectTrigger>
          <SelectContent>
            {values.map((scalarValue, i) => (
              <SelectItem key={scalarValue} value={scalarValue}>
                {labels[i] ?? scalarValue}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === "radio" && question.options?.length) {
      const labels = question.options;
      const values = question.optionValues ?? labels;
      return (
        <div
          className="cm-reg-options"
          role="radiogroup"
          aria-label={question.label}
        >
          {values.map((scalarValue, i) => {
            const checked = value === scalarValue;
            return (
              <label
                key={scalarValue}
                className={`cm-reg-option${checked ? " is-selected" : ""}`}
              >
                <span
                  className="cm-reg-option__indicator"
                  aria-hidden
                />
                <span className="cm-reg-option__label">
                  {labels[i] ?? scalarValue}
                </span>
                <input
                  type="radio"
                  name={id}
                  value={scalarValue}
                  checked={checked}
                  onChange={() => onChange(scalarValue)}
                  disabled={disabled}
                />
              </label>
            );
          })}
        </div>
      );
    }

    if (type === "checkbox" && question.options?.length) {
      const labels = question.options;
      const values = question.optionValues ?? labels;
      const selected = value ? value.split(CHECKBOX_SEP) : [];
      const toggle = (scalarValue: string): void => {
        const next = selected.includes(scalarValue)
          ? selected.filter((s) => s !== scalarValue)
          : [...selected, scalarValue];
        onChange(next.join(CHECKBOX_SEP));
      };
      return (
        <div
          className="cm-reg-options"
          role="group"
          aria-label={question.label}
        >
          {values.map((scalarValue, i) => {
            const checked = selected.includes(scalarValue);
            return (
              <label
                key={scalarValue}
                className={`cm-reg-option${checked ? " is-selected" : ""}`}
              >
                <span
                  className={`cm-reg-option__indicator cm-reg-option__indicator--square${checked ? " is-checked-square" : ""}`}
                  aria-hidden
                />
                <span className="cm-reg-option__label">
                  {labels[i] ?? scalarValue}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(scalarValue)}
                  disabled={disabled}
                />
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <input
        id={id}
        type="text"
        className="cm-reg-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
      />
    );
  })();

  return (
    <form
      onSubmit={handleSubmit}
      className="cm-reg-question-form"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div className="cm-reg-question">
        {/* Only the obligation is worth a label — "optional" is already said
            by the Skip button sitting right below. */}
        {question.required && requiredLabel ? (
          <span className="cm-reg-badge">
            <span className="cm-reg-badge__dot" aria-hidden />
            {requiredLabel}
          </span>
        ) : null}
        {/* The question is the page's heading — nothing on the screen outranks it. */}
        <h1 className="cm-reg-question__label">{question.label}</h1>
        {question.informationalText ? (
          <p className="cm-reg-question__info">
            {question.informationalText}
          </p>
        ) : null}
        <div className="cm-reg-question__field">{content}</div>
        {hasError ? (
          <p
            id={`${id}-error`}
            className="cm-reg-question__error"
            role="alert"
          >
            <AlertCircle size={16} strokeWidth={2} aria-hidden />
            {error}
          </p>
        ) : null}
      </div>

      {/* Sticky on phones: the answer field can be taller than the viewport,
          and a Next button parked below the fold reads as "nothing happens". */}
      <div className="cm-reg-actionbar">
        {isLast && lastStepNote ? (
          <p className="cm-reg-actionbar__note">{lastStepNote}</p>
        ) : null}
        <div className="cm-reg-actions">
          {onBack ? (
            <button
              type="button"
              className="cm-reg-cta cm-reg-cta--ghost"
              onClick={onBack}
              disabled={disabled}
            >
              <span aria-hidden>←</span>
              {backLabel}
            </button>
          ) : null}
          {onSkip ? (
            <button
              type="button"
              className="cm-reg-cta cm-reg-cta--ghost"
              onClick={onSkip}
              disabled={disabled}
            >
              {skipLabel}
            </button>
          ) : null}
          <button
            type="submit"
            className={`cm-reg-cta cm-reg-cta--next${isLast ? " cm-reg-cta--submit" : ""}`}
            disabled={disabled || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2
                  className="cm-reg-spinner cm-reg-spinner--sm"
                  aria-hidden
                />
                …
              </>
            ) : (
              <>
                {isLast ? (
                  <Check size={18} strokeWidth={2.2} aria-hidden />
                ) : null}
                {nextLabel ?? (isLast ? "Submit" : "Next")}
                {isLast ? null : <span aria-hidden>→</span>}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
/* eslint-enable max-lines-per-function */
