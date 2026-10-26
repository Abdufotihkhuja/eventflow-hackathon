"use client";

import type { ReactNode } from "react";

import { Loader2 } from "lucide-react";
import {
  useForm,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";

import { Button, Input, Surface } from "@shared/ui";
import { Checkbox } from "@shared/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@shared/ui/form";
import { Label } from "@shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import { Textarea } from "@shared/ui/textarea";

import {
  buildRegistrationAnswersSchema,
  formDataToAnswers,
  type RegistrationAnswersFormData,
} from "../model";

import type { RegistrationQuestionPublic } from "@shared/api/publicCatalogService";

const QUESTION_INPUT_TYPES = [
  "text",
  "textarea",
  "select",
  "radio",
  "checkbox",
] as const;
type QuestionInputType = (typeof QUESTION_INPUT_TYPES)[number];

/**
 * Force-render `category=CLOSED` ("Да / Нет") as radio regardless of the
 * stored `type`. See `effectiveType` in registration-question-step.tsx
 * for the full rationale — same self-healing migration trick.
 */
function effectiveQuestionType(
  type: string,
  category: string | undefined,
): QuestionInputType {
  if (category && category.toUpperCase() === "CLOSED") return "radio";
  return normalizeQuestionType(type);
}

function normalizeQuestionType(type: string): QuestionInputType {
  const upper = type.toUpperCase();
  if (upper === "TEXT") return "text";
  if (upper === "CHECKBOX") return "checkbox";
  const lower = type.toLowerCase();
  if (QUESTION_INPUT_TYPES.includes(lower as QuestionInputType)) {
    return lower as QuestionInputType;
  }
  return "text";
}

export interface RegistrationQuestionsFormProps {
  questions: RegistrationQuestionPublic[];
  isTest?: boolean;
  minTestScore?: number | null;
  maxTestScore?: number | null;
  onSubmit: (answers: Array<{ questionId: string; answer: string }>) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

const FIELD_LABEL_CLASS = "mb-1.5 block text-sm font-medium text-ink-200";

const CHECKBOX_SEP = ", ";

interface QuestionFieldProps {
  question: RegistrationQuestionPublic;
  register: UseFormRegister<RegistrationAnswersFormData>;
  setValue: UseFormSetValue<RegistrationAnswersFormData>;
  watch: UseFormWatch<RegistrationAnswersFormData>;
  disabled?: boolean;
}

const RequiredMark = (): React.JSX.Element => (
  <span className="text-[var(--danger)]"> *</span>
);

function CheckboxQuestionField({
  question,
  register,
  setValue,
  watch,
  disabled,
}: QuestionFieldProps): ReactNode {
  const valueStr = watch(question.id) ?? "";
  const selected = valueStr ? valueStr.split(CHECKBOX_SEP) : [];

  const toggle = (opt: string): void => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    setValue(question.id, next.join(CHECKBOX_SEP), { shouldValidate: true });
  };

  return (
    <FormField<RegistrationAnswersFormData, string>
      name={question.id}
      render={() => (
        <FormItem className="space-y-0">
          <FormLabel className={FIELD_LABEL_CLASS}>
            {question.label}
            {question.required && <RequiredMark />}
          </FormLabel>
          {question.informationalText && (
            <p className="mb-2 text-sm text-ink-100">
              {question.informationalText}
            </p>
          )}
          <input type="hidden" {...register(question.id)} />
          <div
            className="mt-2 flex flex-col gap-2"
            role="group"
            aria-label={question.label}
          >
            {question.options?.map((opt) => (
              <Label
                key={opt}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-bone-300/80 bg-white/80 px-4 py-2.5 transition hover:border-bone-400 focus-within:ring-2 focus-within:ring-ember-300/20"
              >
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={() => toggle(opt)}
                  disabled={disabled}
                />
                <span className="text-sm text-ink-300">{opt}</span>
              </Label>
            ))}
          </div>
          <FormMessage className="mt-1 text-xs" />
        </FormItem>
      )}
    />
  );
}

/* eslint-disable complexity, max-lines-per-function -- форма вопросов с разными типами полей */
function QuestionField(props: QuestionFieldProps): ReactNode {
  const { question, register, setValue, watch, disabled } = props;
  const type = effectiveQuestionType(question.type, question.category);
  const reg = register(question.id);

  if (type === "textarea") {
    return (
      <FormField<RegistrationAnswersFormData, string>
        name={question.id}
        render={({ fieldState }) => (
          <FormItem className="space-y-0">
            <FormLabel className={FIELD_LABEL_CLASS}>
              {question.label}
              {question.required && <RequiredMark />}
            </FormLabel>
            {question.informationalText && (
              <p className="mb-2 text-sm text-ink-100">
                {question.informationalText}
              </p>
            )}
            <FormControl>
              <Textarea
                {...reg}
                disabled={disabled}
                rows={4}
                className={
                  fieldState.error
                    ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/22"
                    : undefined
                }
              />
            </FormControl>
            <FormMessage className="mt-1 text-xs" />
          </FormItem>
        )}
      />
    );
  }

  if (type === "select" && question.options?.length) {
    const options = question.options;
    return (
      <FormField<RegistrationAnswersFormData, string>
        name={question.id}
        render={({ fieldState }) => (
          <FormItem className="space-y-0">
            <FormLabel className={FIELD_LABEL_CLASS}>
              {question.label}
              {question.required && <RequiredMark />}
            </FormLabel>
            {question.informationalText && (
              <p className="mb-2 text-sm text-ink-100">
                {question.informationalText}
              </p>
            )}
            <Select
              value={watch(question.id) ?? ""}
              onValueChange={(val) =>
                setValue(question.id, val, { shouldValidate: true })
              }
            >
              <FormControl>
                <SelectTrigger
                  disabled={disabled}
                  hasError={!!fieldState.error}
                >
                  <SelectValue placeholder="Выберите..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage className="mt-1 text-xs" />
          </FormItem>
        )}
      />
    );
  }

  if (type === "radio" && question.options?.length) {
    const options = question.options;
    return (
      <FormField<RegistrationAnswersFormData, string>
        name={question.id}
        render={() => (
          <FormItem className="space-y-0">
            <FormLabel className={FIELD_LABEL_CLASS}>
              {question.label}
              {question.required && <RequiredMark />}
            </FormLabel>
            {question.informationalText && (
              <p className="mb-2 text-sm text-ink-100">
                {question.informationalText}
              </p>
            )}
            <div
              className="mt-2 flex flex-col gap-2"
              role="radiogroup"
              aria-label={question.label}
            >
              {options.map((opt) => (
                <Label
                  key={opt}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-bone-300/80 bg-white/80 px-4 py-2.5 transition hover:border-bone-400 focus-within:ring-2 focus-within:ring-ember-300/20"
                >
                  <input
                    type="radio"
                    value={opt}
                    {...reg}
                    disabled={disabled}
                    className="h-5 w-5 cursor-pointer accent-ember-400"
                  />
                  <span className="text-sm text-ink-300">{opt}</span>
                </Label>
              ))}
            </div>
            <FormMessage className="mt-1 text-xs" />
          </FormItem>
        )}
      />
    );
  }

  if (type === "checkbox" && question.options?.length) {
    return <CheckboxQuestionField {...props} />;
  }

  return (
    <FormField<RegistrationAnswersFormData, string>
      name={question.id}
      render={({ fieldState }) => (
        <FormItem className="space-y-0">
          <FormLabel className={FIELD_LABEL_CLASS}>
            {question.label}
            {question.required && <RequiredMark />}
          </FormLabel>
          {question.informationalText && (
            <p className="mb-2 text-sm text-ink-100">
              {question.informationalText}
            </p>
          )}
          <FormControl>
            <Input
              type="text"
              {...reg}
              disabled={disabled}
              hasError={!!fieldState.error}
            />
          </FormControl>
          <FormMessage className="mt-1 text-xs" />
        </FormItem>
      )}
    />
  );
}
/* eslint-enable complexity, max-lines-per-function */

export function RegistrationQuestionsForm({
  questions,
  isTest = false,
  minTestScore,
  maxTestScore,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Зарегистрироваться",
}: RegistrationQuestionsFormProps): ReactNode {
  const schema = buildRegistrationAnswersSchema(questions);
  const defaultValues: RegistrationAnswersFormData = Object.fromEntries(
    questions.map((q) => [q.id, ""])
  );

  const form = useForm<RegistrationAnswersFormData>({
    defaultValues,
  });
  const { register, handleSubmit, setError, setValue, watch } = form;

  const handleFormSubmit = (data: RegistrationAnswersFormData): void => {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as Record<
        string,
        string[] | undefined
      >;
      for (const [key, messages] of Object.entries(fieldErrors)) {
        if (messages?.[0]) setError(key, { message: messages[0] });
      }
      return;
    }
    const answers = formDataToAnswers(
      parsed.data,
      questions.map((q) => q.id)
    );
    onSubmit(answers);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          void handleSubmit(handleFormSubmit)(e);
        }}
        className="flex flex-col gap-6"
      >
        {isTest && (minTestScore != null || maxTestScore != null) && (
          <Surface variant="muted" radius="2xl" padding="md">
            <p className="text-sm font-medium text-ink-200">
              Для прохождения необходимо набрать не менее{" "}
              <span className="font-semibold text-ember-600">
                {minTestScore ?? 0}
              </span>{" "}
              из{" "}
              <span className="font-semibold text-ember-600">
                {maxTestScore ?? "—"}
              </span>
              .
            </p>
          </Surface>
        )}

        <div className="flex flex-col gap-5">
          {questions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              register={register}
              setValue={setValue}
              watch={watch}
              disabled={isSubmitting}
            />
          ))}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Отправка...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </Form>
  );
}
