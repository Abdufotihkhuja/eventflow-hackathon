/**
 * @module features/profile/complete-profile-info/ui/complete-profile-info-form
 * @description Форма доп. полей профиля (popup «Заполните доп. поля»)
 */

"use client";

import { useT } from "@eventflow/i18n/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { toUtcIsoString } from "@shared/lib/date";
import { cn, formatDateOfBirthForInput } from "@shared/lib/utils";
import {
  Button,
  DatePicker,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui";
import { Checkbox } from "@shared/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@shared/ui/form";
import { Label } from "@shared/ui/label";
import { Spinner } from "@shared/ui/spinner";
import { Textarea } from "@shared/ui/textarea";

import {
  completeProfileInfoSchema,
  type CompleteProfileInfoFormData,
  useProfileOptionsQuery,
  useCompleteProfileInfoMutation,
} from "../model";

import type { UpdateProfileRequest } from "@entities/profile";
import type { User } from "@shared/api";

const FIELD_LABEL_CLASS = "mb-1.5 block text-sm font-medium text-ink-200";
const SKILLS_MAX = 3;

function toUpdateRequest(
  data: CompleteProfileInfoFormData
): UpdateProfileRequest {
  return {
    firstName: data.firstName || undefined,
    lastName: data.lastName || undefined,
    phone: data.phone || undefined,
    gender: data.gender,
    dateOfBirth: data.dateOfBirth ? toUtcIsoString(data.dateOfBirth) : undefined,
    region: data.region || undefined,
    languages: data.languages?.length ? data.languages : undefined,
    profileStatus: data.profileStatus,
    workOrStudyPlace: data.workOrStudyPlace || undefined,
    skills: data.skills?.length ? data.skills : undefined,
    specialization: data.specialization,
    shortBio: data.shortBio || undefined,
  };
}

function hasValue(
  user: User | null,
  field: keyof Pick<
    User,
    | "firstName"
    | "lastName"
    | "phone"
    | "gender"
    | "dateOfBirth"
    | "region"
    | "languages"
    | "profileStatus"
    | "workOrStudyPlace"
    | "skills"
    | "specialization"
    | "shortBio"
  >
): boolean {
  const v = user?.[field];
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export interface CompleteProfileInfoFormProps {
  user: User | null;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

/* eslint-disable max-lines-per-function, complexity -- форма с большим числом полей по дизайну */
export function CompleteProfileInfoForm({
  user,
  onSuccess,
  onError,
  className,
}: CompleteProfileInfoFormProps): React.ReactNode {
  const t = useT();
  const { data: options, isLoading: optionsLoading } = useProfileOptionsQuery();

  const form = useForm<CompleteProfileInfoFormData>({
    resolver: zodResolver(completeProfileInfoSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phone: user?.phone ?? "",
      gender: user?.gender ?? undefined,
      dateOfBirth: user?.dateOfBirth
        ? formatDateOfBirthForInput(user.dateOfBirth)
        : "",
      region: user?.region ?? "",
      languages: user?.languages ?? [],
      profileStatus: user?.profileStatus ?? undefined,
      workOrStudyPlace: user?.workOrStudyPlace ?? "",
      skills: user?.skills ?? [],
      specialization: user?.specialization ?? undefined,
      shortBio: user?.shortBio ?? "",
    },
  });
  const { handleSubmit, watch } = form;

  const { mutate, isPending } = useCompleteProfileInfoMutation({
    onSuccess: () => onSuccess?.(),
    onError: (err) => onError?.(err),
  });

  const onSubmit = (data: CompleteProfileInfoFormData): void => {
    mutate(toUpdateRequest(data));
  };

  if (optionsLoading || !options) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Spinner size="md" tone="ember" />
      </div>
    );
  }

  const showFirstName = !hasValue(user, "firstName");
  const showLastName = !hasValue(user, "lastName");
  const showPhone = !hasValue(user, "phone");
  const showGender = !hasValue(user, "gender");
  const showDateOfBirth = !hasValue(user, "dateOfBirth");
  const showRegion = !hasValue(user, "region");
  const showLanguages = !hasValue(user, "languages");
  const showProfileStatus = !hasValue(user, "profileStatus");
  const showWorkOrStudyPlace = !hasValue(user, "workOrStudyPlace");
  const showSkills = !hasValue(user, "skills");
  const showSpecialization = !hasValue(user, "specialization");
  const showShortBio = !hasValue(user, "shortBio");

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className={cn("flex flex-col gap-6", className)}
        noValidate
      >
        {(showFirstName || showLastName) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {showFirstName && (
              <FormField<CompleteProfileInfoFormData, "firstName">
                name="firstName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={FIELD_LABEL_CLASS}>
                      {t("public.profile.settingsPanel.fields.firstName")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          "public.profile.settingsPanel.fields.firstName"
                        )}
                        hasError={!!fieldState.error}
                        className="w-full"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {showLastName && (
              <FormField<CompleteProfileInfoFormData, "lastName">
                name="lastName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={FIELD_LABEL_CLASS}>
                      {t("public.profile.settingsPanel.fields.lastName")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          "public.profile.settingsPanel.fields.lastName"
                        )}
                        hasError={!!fieldState.error}
                        className="w-full"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {showPhone && (
          <FormField<CompleteProfileInfoFormData, "phone">
            name="phone"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className={FIELD_LABEL_CLASS}>
                  {t("public.profile.settingsPanel.fields.phone")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+998901234567"
                    hasError={!!fieldState.error}
                    className="w-full"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showGender && (
          <FormField<CompleteProfileInfoFormData, "gender">
            name="gender"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className={FIELD_LABEL_CLASS}>
                  {t("public.profile.settingsPanel.fields.gender")}
                </FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <FormControl>
                    <SelectTrigger hasError={!!fieldState.error}>
                      <SelectValue
                        placeholder={t(
                          "public.profile.settingsPanel.placeholders.select"
                        )}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.genders.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showDateOfBirth && (
          <FormField<CompleteProfileInfoFormData, "dateOfBirth">
            name="dateOfBirth"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className={FIELD_LABEL_CLASS}>
                  {t("public.profile.settingsPanel.fields.birthDate")}
                </FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value ?? ""}
                    onChange={(v) => field.onChange(v || "")}
                    onBlur={field.onBlur}
                    hasError={!!fieldState.error}
                    toDate={new Date()}
                    fromDate={new Date(1900, 0, 1)}
                    aria-label={t(
                      "public.profile.settingsPanel.fields.birthDate"
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showRegion && (
          <FormField<CompleteProfileInfoFormData, "region">
            name="region"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className={FIELD_LABEL_CLASS}>
                  {t("public.profile.settingsPanel.fields.region")}
                </FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <FormControl>
                    <SelectTrigger hasError={!!fieldState.error}>
                      <SelectValue
                        placeholder={t(
                          "public.profile.settingsPanel.placeholders.region"
                        )}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.regions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showLanguages && (
          <FormField<CompleteProfileInfoFormData, "languages">
            name="languages"
            render={({ field }) => {
              const selected = field.value ?? [];
              const toggle = (code: string): void => {
                const next = selected.includes(code)
                  ? selected.filter((c) => c !== code)
                  : [...selected, code];
                field.onChange(next);
              };
              return (
                <FormItem>
                  <FormLabel className={FIELD_LABEL_CLASS}>
                    {t("public.profile.settingsPanel.fields.languages")}
                  </FormLabel>
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label={t(
                      "public.profile.settingsPanel.fields.languages"
                    )}
                  >
                    {options.languages.map((lang) => {
                      const displayLabel =
                        lang.code === "other"
                          ? t("public.profile.complete.languages.other")
                          : lang.label;
                      return (
                        <Label
                          key={lang.code}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-bone-300/80 bg-bone-50/80 px-3 py-2 text-sm transition hover:border-bone-400"
                        >
                          <Checkbox
                            checked={selected.includes(lang.code)}
                            onCheckedChange={() => toggle(lang.code)}
                          />
                          <span className="text-ink-300">{displayLabel}</span>
                        </Label>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        )}

        {showProfileStatus && (
          <FormField<CompleteProfileInfoFormData, "profileStatus">
            name="profileStatus"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className={FIELD_LABEL_CLASS}>
                  {t("public.profile.settingsPanel.fields.status")}
                </FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <FormControl>
                    <SelectTrigger hasError={!!fieldState.error}>
                      <SelectValue
                        placeholder={t(
                          "public.profile.settingsPanel.placeholders.select"
                        )}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.profileStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showWorkOrStudyPlace && (
          <FormField<CompleteProfileInfoFormData, "workOrStudyPlace">
            name="workOrStudyPlace"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className={FIELD_LABEL_CLASS}>
                  {t("public.profile.settingsPanel.fields.workOrStudy")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t(
                      "public.profile.settingsPanel.placeholders.workOrStudy"
                    )}
                    hasError={!!fieldState.error}
                    className="w-full"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showSkills && (
          <FormField<CompleteProfileInfoFormData, "skills">
            name="skills"
            render={({ field }) => {
              const selected = field.value ?? [];
              const toggle = (code: string): void => {
                let next: string[];
                if (selected.includes(code)) {
                  next = selected.filter((s) => s !== code);
                } else if (selected.length < SKILLS_MAX) {
                  next = [...selected, code];
                } else {
                  next = [...selected.slice(1), code];
                }
                field.onChange(next);
              };
              return (
                <FormItem>
                  <FormLabel className={FIELD_LABEL_CLASS}>
                    {t("public.profile.settingsPanel.fields.skills")}
                  </FormLabel>
                  <FormDescription>
                    {t("public.profile.settingsPanel.profile.skillsSelected", {
                      count: selected.length,
                      max: SKILLS_MAX,
                    })}
                  </FormDescription>
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label={t(
                      "public.profile.settingsPanel.fields.skills"
                    )}
                  >
                    {options.skills.map((skill) => (
                      <Label
                        key={skill.code}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-bone-300/80 bg-bone-50/80 px-3 py-2 text-sm transition hover:border-bone-400"
                      >
                        <Checkbox
                          checked={selected.includes(skill.code)}
                          onCheckedChange={() => toggle(skill.code)}
                        />
                        <span className="text-ink-300">{skill.label}</span>
                      </Label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        )}

        {showSpecialization && (
          <FormField<CompleteProfileInfoFormData, "specialization">
            name="specialization"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className={FIELD_LABEL_CLASS}>
                  {t("public.profile.settingsPanel.fields.specialization")}
                </FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <FormControl>
                    <SelectTrigger hasError={!!fieldState.error}>
                      <SelectValue
                        placeholder={t(
                          "public.profile.settingsPanel.placeholders.select"
                        )}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.specializations.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showShortBio && (
          <FormField<CompleteProfileInfoFormData, "shortBio">
            name="shortBio"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className={FIELD_LABEL_CLASS}>
                  {t("public.profile.settingsPanel.fields.shortBio")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t(
                      "public.profile.settingsPanel.placeholders.shortBio"
                    )}
                    rows={3}
                    maxLength={150}
                    className={cn(
                      "min-h-[100px]",
                      fieldState.error &&
                        "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/22"
                    )}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  {watch("shortBio")?.length ?? 0} / 150
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isPending}
            loadingLabel={t("public.profile.settingsPanel.actions.saving")}
            className="min-w-[160px]"
          >
            {t("public.profile.complete.saveAndClose")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
