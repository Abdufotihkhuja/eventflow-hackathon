/**
 * @module features/profile/edit/ui/profile-edit-form
 * @description Форма редактирования профиля пользователя
 */

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useT } from "@eventflow/i18n/react";
import { Loader2, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@shared/ui/form";
import { Input } from "@shared/ui/input";
import { Textarea } from "@shared/ui/textarea";

import {
  updateProfileSchema,
  type UpdateProfileFormData,
  useUpdateProfileMutation,
} from "../model";

import type { ProfileInfo } from "@entities/profile";

interface ProfileEditFormProps {
  initialData: ProfileInfo;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const FIELD_LABEL_CLASS = "text-sm font-medium text-ink-200";

const REQUIRED_MARK = (): React.JSX.Element => (
  <span className="text-[var(--danger)]">*</span>
);

interface TextFieldProps {
  name:
    | "name"
    | "role"
    | "company"
    | "location"
    | "timezone"
    | "email"
    | "telegram"
    | "heroTitle";
  label: React.ReactNode;
  placeholder?: string;
  type?: string;
  disabled: boolean;
}

const TextField = ({
  name,
  label,
  placeholder,
  type = "text",
  disabled,
}: TextFieldProps): React.JSX.Element => (
  <FormField<UpdateProfileFormData, typeof name>
    name={name}
    render={({ field, fieldState }) => (
      <FormItem>
        <FormLabel className={FIELD_LABEL_CLASS}>{label}</FormLabel>
        <FormControl>
          <Input
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            hasError={!!fieldState.error}
            {...field}
            value={field.value ?? ""}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

interface AreaFieldProps<TName extends `focusAreas.${number}.label` | `focusAreas.${number}.description` | "heroSubtitle" | "bio"> {
  name: TName;
  label: React.ReactNode;
  placeholder?: string;
  rows: number;
  disabled: boolean;
}

const AreaField = <TName extends `focusAreas.${number}.label` | `focusAreas.${number}.description` | "heroSubtitle" | "bio">({
  name,
  label,
  placeholder,
  rows,
  disabled,
}: AreaFieldProps<TName>): React.JSX.Element => (
  <FormField<UpdateProfileFormData, TName>
    name={name}
    render={({ field, fieldState }) => (
      <FormItem>
        <FormLabel className={FIELD_LABEL_CLASS}>{label}</FormLabel>
        <FormControl>
          <Textarea
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className={
              fieldState.error
                ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/22"
                : undefined
            }
            {...field}
            value={field.value ?? ""}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

// eslint-disable-next-line complexity
export function ProfileEditForm({
  initialData,
  onSuccess,
  onCancel,
  className,
}: ProfileEditFormProps): React.ReactNode {
  const t = useT();
  const form = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: initialData.name,
      role: initialData.role,
      company: initialData.company,
      location: initialData.location,
      timezone: initialData.timezone,
      email: initialData.email,
      telegram: initialData.telegram,
      heroTitle: initialData.heroTitle,
      heroSubtitle: initialData.heroSubtitle,
      bio: initialData.bio,
      focusAreas: initialData.focusAreas.map(({ label, description }) => ({
        label,
        description,
      })),
    },
  });
  const {
    handleSubmit,
    formState: { isDirty },
    watch,
    setValue,
  } = form;

  const { mutate: updateProfile, isPending } = useUpdateProfileMutation({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      // TODO: показать toast с ошибкой
      console.error(t("public.profile.edit.updateErrorLog"), error);
    },
  });

  const focusAreas = watch("focusAreas") ?? [];

  const handleAddFocusArea = (): void => {
    const current = watch("focusAreas") ?? [];
    if (current.length < 5) {
      setValue("focusAreas", [...current, { label: "", description: "" }], {
        shouldDirty: true,
      });
    }
  };

  const handleRemoveFocusArea = (index: number): void => {
    const current = watch("focusAreas") ?? [];
    setValue(
      "focusAreas",
      current.filter((_, i) => i !== index),
      { shouldDirty: true }
    );
  };

  const handleFormSubmit = handleSubmit((data) => {
    updateProfile(data);
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void handleFormSubmit(e)}
        className={cn("space-y-8", className)}
      >
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-ink-400">
            {t("public.profile.edit.basicInfo")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="name"
              label={
                <>
                  {t("public.profile.settings.fields.firstName")}{" "}
                  <REQUIRED_MARK />
                </>
              }
              placeholder={t("public.profile.edit.placeholders.fullName")}
              disabled={isPending}
            />
            <TextField
              name="role"
              label={
                <>
                  {t("public.profile.settings.fields.position")}{" "}
                  <REQUIRED_MARK />
                </>
              }
              placeholder="Product Manager"
              disabled={isPending}
            />
            <TextField
              name="company"
              label={
                <>
                  {t("public.profile.edit.company")} <REQUIRED_MARK />
                </>
              }
              placeholder="Eventflow"
              disabled={isPending}
            />
            <TextField
              name="location"
              label={
                <>
                  {t("public.profile.edit.location")} <REQUIRED_MARK />
                </>
              }
              placeholder={t("public.profile.edit.placeholders.location")}
              disabled={isPending}
            />
            <TextField
              name="timezone"
              label={
                <>
                  {t("public.profile.edit.timezone")} <REQUIRED_MARK />
                </>
              }
              placeholder="GMT+3"
              disabled={isPending}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-ink-400">
            {t("public.profile.edit.contactInfo")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="email"
              type="email"
              label={
                <>
                  Email <REQUIRED_MARK />
                </>
              }
              placeholder="ivan@example.com"
              disabled={isPending}
            />
            <TextField
              name="telegram"
              label="Telegram"
              placeholder="@username"
              disabled={isPending}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-ink-400">
            {t("public.profile.edit.about")}
          </h3>
          <div className="space-y-4">
            <TextField
              name="heroTitle"
              label={
                <>
                  {t("public.profile.edit.heroTitle")} <REQUIRED_MARK />
                </>
              }
              placeholder={t("public.profile.edit.placeholders.heroTitle")}
              disabled={isPending}
            />
            <AreaField
              name="heroSubtitle"
              label={
                <>
                  {t("public.profile.edit.heroSubtitle")} <REQUIRED_MARK />
                </>
              }
              placeholder={t("public.profile.edit.placeholders.heroSubtitle")}
              rows={3}
              disabled={isPending}
            />
            <AreaField
              name="bio"
              label={
                <>
                  {t("public.profile.edit.bio")} <REQUIRED_MARK />
                </>
              }
              placeholder={t("public.profile.edit.placeholders.bio")}
              rows={6}
              disabled={isPending}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink-400">
              {t("public.profile.edit.focusAreas")}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" aria-hidden />}
              onClick={handleAddFocusArea}
              disabled={isPending || focusAreas.length >= 5}
            >
              {t("public.profile.edit.add")}
            </Button>
          </div>

          {focusAreas.length === 0 && (
            <p className="text-sm text-ink-100">
              {t("public.profile.edit.focusAreasEmpty")}
            </p>
          )}

          <div className="space-y-4">
            {focusAreas.map((_, index) => (
              <div
                key={index}
                className="relative rounded-lg border border-ink-400/10 bg-bone-100 p-4"
              >
                <button
                  type="button"
                  onClick={() => handleRemoveFocusArea(index)}
                  disabled={isPending}
                  className="absolute right-2 top-2 rounded-full p-1 text-ink-50 hover:bg-bone-50 hover:text-ink-400 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t("public.profile.edit.removeFocusArea")}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>

                <div className="space-y-3">
                  <TextField
                    name={`focusAreas.${index}.label` as never}
                    label={t("public.profile.edit.name")}
                    placeholder={t("public.profile.edit.placeholders.focusName")}
                    disabled={isPending}
                  />
                  <AreaField
                    name={`focusAreas.${index}.description` as never}
                    label={t("public.profile.edit.description")}
                    placeholder={t(
                      "public.profile.edit.placeholders.focusDescription"
                    )}
                    rows={2}
                    disabled={isPending}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 border-t border-ink-400/10 pt-6">
          <Button
            type="button"
            variant="subtle"
            onClick={onCancel}
            disabled={isPending}
          >
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isPending || !isDirty}
            leftIcon={
              isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : undefined
            }
          >
            {isPending
              ? t("public.profile.settings.actions.saving")
              : t("public.profile.settings.actions.saveChanges")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
