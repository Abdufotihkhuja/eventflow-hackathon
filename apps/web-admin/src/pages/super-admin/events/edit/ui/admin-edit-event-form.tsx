/**
 * Форма редактирования события для супер-админа
 * Использует PATCH /api/v1/super-admin/events/{eventId}
 */

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "@eventflow/i18n/react";

import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type {
  AdminEvent,
  UpdateAdminEventRequest,
} from "@api/services/superAdmin.types";
import {
  ACCESS_TYPE_LABEL_KEYS,
  AccessType,
  CURRENCY_LABEL_KEYS,
  CURRENCY_OPTIONS,
  EVENT_FORMAT_LABEL_KEYS,
  EVENT_TYPE_LABEL_KEYS,
} from "@entities/event";
import { EventLocationPicker } from "@features/events/ui/event-location-picker";
import { useUpdateAdminEvent } from "@features/super-admin";
import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  getFallbackBusinessTranslation,
  MultilingualTabsField,
  resolveBusinessSourceLocale,
  setBusinessTranslationValue,
  summarizeAppliedBatch,
  TranslateFieldsToolbar,
  useTranslateBatch,
  type AppLocale,
  type BusinessTranslationFieldConfig,
  type TranslationApplyMode,
  type TranslationMeta,
  type TranslationValues,
} from "@features/translations";
import { cn } from "@shared/lib/cn";
import {
  getDescriptionText,
  toDateTimeLocalValue,
  toISO8601Z,
  toOptionalNumber,
} from "@shared/lib";
import {
  Button,
  Card,
  Checkbox,
  CitySelect,
  DateTimeInput,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui";

/**
 * Координаты приходят из API строками (Prisma Decimal), а из карты — числами.
 * Без приведения z.number() ловит «Invalid input» и форму невозможно сохранить.
 */
const optionalCoordinate = (min: number, max: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value == null) return undefined;
      if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : value;
      }
      return value;
    },
    z.number().min(min).max(max).optional().nullable(),
  );

// Схема валидации формы
const createEditEventSchema = (t: ReturnType<typeof useT>) =>
  z.object({
    title: z
      .string()
      .min(3, t("events.validation.min3"))
      .max(200, t("events.validation.max200")),
    description: z
      .string()
      .min(10, t("events.validation.min10"))
      .max(5000, t("events.validation.max5000")),
    shortDescription: z
      .string()
      .max(500, t("events.validation.max500"))
      .optional(),
    type: z.enum(["FREE", "PAID"]),
    accessType: z.enum(["OPEN", "REQUEST", "INVITE_ONLY", "PRIVATE"]),
    format: z.enum(["ONLINE", "OFFLINE", "HYBRID"]),
    startDate: z.string().min(1, t("events.validation.startDateRequired")),
    endDate: z.string().min(1, t("events.validation.endDateRequired")),
    registrationDeadline: z.string().optional(),
    venue: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    latitude: optionalCoordinate(-90, 90),
    longitude: optionalCoordinate(-180, 180),
    placeId: z.string().max(500).optional().nullable(),
    onlineUrl: z
      .string()
      .url(t("events.validation.invalidLink"))
      .optional()
      .or(z.literal("")),
    price: z.coerce.number().min(0).optional(),
    currency: z.string().optional(),
    maxParticipants: z.coerce.number().min(1).optional(),
    commentsEnabled: z.boolean().optional(),
  });

type EditEventFormValues = z.infer<ReturnType<typeof createEditEventSchema>>;

type AdminEditEventFormProps = {
  event: AdminEvent;
};

const BUSINESS_LOCALES = ["ru", "uz", "en"] as const;
const EVENT_TRANSLATION_FIELD_KEYS = ["title", "shortDescription"] as const;

export function AdminEditEventForm({ event }: AdminEditEventFormProps) {
  const t = useT();
  const navigate = useNavigate();
  const updateEvent = useUpdateAdminEvent();
  const translateBatch = useTranslateBatch();
  const editEventSchema = React.useMemo(() => createEditEventSchema(t), [t]);
  const [activeLocale, setActiveLocale] = React.useState<AppLocale>("ru");
  const [translationValues, setTranslationValues] = React.useState<TranslationValues>(() =>
    createBusinessTranslationValues(EVENT_TRANSLATION_FIELD_KEYS, event.translations, {
      title: event.title,
      shortDescription: event.shortDescription,
    })
  );
  const [translationMeta, setTranslationMeta] = React.useState<TranslationMeta>(() =>
    createBusinessTranslationMeta(EVENT_TRANSLATION_FIELD_KEYS, event.translationMeta, translationValues)
  );

  const form = useForm<EditEventFormValues>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      title: event.title,
      description: getDescriptionText(event.description ?? ""),
      shortDescription: event.shortDescription ?? "",
      type: event.type,
      accessType:
        event.accessType === "REQUEST" ||
        event.accessType === "INVITE_ONLY" ||
        event.accessType === "PRIVATE"
          ? event.accessType
          : "OPEN",
      format: event.format,
      startDate: toDateTimeLocalValue(event.startDate),
      endDate: toDateTimeLocalValue(event.endDate),
      registrationDeadline: toDateTimeLocalValue(
        event.registrationDeadline ?? undefined,
      ),
      venue: event.venue ?? "",
      address: event.address ?? "",
      city: event.city ?? "",
      latitude: toOptionalNumber(event.latitude),
      longitude: toOptionalNumber(event.longitude),
      placeId: event.placeId ?? undefined,
      onlineUrl: event.onlineUrl ?? "",
      price: toOptionalNumber(event.price),
      currency: event.currency ?? "UZS",
      maxParticipants: toOptionalNumber(event.maxParticipants),
      commentsEnabled: event.commentsEnabled ?? true,
    },
    mode: "onChange",
  });

  const selectedType = form.watch("type");
  const selectedFormat = form.watch("format");
  const { setValue } = form;

  const isPaid = selectedType === "PAID";
  const isOnline = selectedFormat === "ONLINE";
  const isOffline = selectedFormat === "OFFLINE" || selectedFormat === "HYBRID";
  const sourceLocale = resolveBusinessSourceLocale(
    translationValues,
    EVENT_TRANSLATION_FIELD_KEYS,
    activeLocale
  );
  const translationFields = React.useMemo<BusinessTranslationFieldConfig[]>(
    () => [
      {
        key: "title",
        label: t("admin.events.fields.title"),
        placeholder: t("admin.events.placeholders.title"),
        maxLength: 200,
      },
      {
        key: "shortDescription",
        label: t("admin.events.fields.shortDescription"),
        placeholder: t("admin.events.placeholders.shortDescription"),
        maxLength: 500,
        multiline: true,
        rows: 3,
      },
    ],
    [t]
  );

  // Очищаем price при переключении на бесплатный тип
  React.useEffect(() => {
    if (!isPaid) {
      setValue("price", undefined);
    }
  }, [isPaid, setValue]);

  const syncScalarFallbacks = React.useCallback(
    (values: TranslationValues) => {
      setValue("title", getFallbackBusinessTranslation(values, "title", event.title), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(
        "shortDescription",
        getFallbackBusinessTranslation(values, "shortDescription", event.shortDescription ?? ""),
        {
          shouldDirty: true,
          shouldValidate: true,
        }
      );
    },
    [event.shortDescription, event.title, setValue]
  );

  const handleTranslationChange = (fieldKey: string, locale: AppLocale, value: string) => {
    const next = setBusinessTranslationValue(
      translationValues,
      translationMeta,
      fieldKey,
      locale,
      value
    );
    setTranslationValues(next.values);
    setTranslationMeta(next.meta);
    syncScalarFallbacks(next.values);
  };

  const handleTranslate = (mode: TranslationApplyMode) => {
    if (!sourceLocale) {
      toast.error("Add text in at least one language before translating.");
      return;
    }

    const items = getBatchTranslationItems(
      translationValues,
      translationMeta,
      EVENT_TRANSLATION_FIELD_KEYS,
      sourceLocale,
      mode
    );

    if (items.length === 0) {
      toast.info("No eligible fields to translate.");
      return;
    }

    const beforeValues = translationValues;
    const beforeMeta = translationMeta;
    translateBatch.mutate(
      {
        sourceLocale,
        targetLocales: BUSINESS_LOCALES.filter(locale => locale !== sourceLocale),
        items,
      },
      {
        onSuccess: response => {
          const applied = applyBatchTranslationResults(beforeValues, beforeMeta, response, {
            mode,
          });
          const summary = summarizeAppliedBatch(beforeValues, beforeMeta, response, mode);
          setTranslationValues(applied.values);
          setTranslationMeta(applied.meta);
          syncScalarFallbacks(applied.values);
          toast.success(
            `Translated: ${summary.translated}. Skipped: ${summary.skipped}. Failed: ${summary.failed}.`
          );
        },
        onError: error => {
          toast.error(error?.message ?? "Translation service failed.");
        },
      }
    );
  };

  const onSubmit = async (data: EditEventFormValues): Promise<void> => {
    try {
      const fallbackTitle = getFallbackBusinessTranslation(translationValues, "title", data.title);
      const fallbackShortDescription = getFallbackBusinessTranslation(
        translationValues,
        "shortDescription",
        data.shortDescription
      );
      const requestData: UpdateAdminEventRequest = {
        title: fallbackTitle,
        description: data.description,
        shortDescription: fallbackShortDescription || undefined,
        translations: translationValues,
        translationMeta,
        type: data.type,
        accessType: data.accessType,
        format: data.format,
        startDate: toISO8601Z(data.startDate),
        endDate: toISO8601Z(data.endDate),
        registrationDeadline: toISO8601Z(data.registrationDeadline),
        venue: data.venue || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        placeId: data.placeId ?? undefined,
        onlineUrl: data.onlineUrl || undefined,
        price: data.price !== undefined ? Number(data.price) : undefined,
        currency: data.currency || undefined,
        maxParticipants:
          data.maxParticipants !== undefined
            ? Number(data.maxParticipants)
            : undefined,
        commentsEnabled: data.commentsEnabled,
      };

      // Убираем undefined поля
      Object.keys(requestData).forEach((key) => {
        if ((requestData as Record<string, unknown>)[key] === undefined) {
          delete (requestData as Record<string, unknown>)[key];
        }
      });

      await updateEvent.mutateAsync({ eventId: event.id, data: requestData });
      navigate(`/admin/events/${event.id}`);
    } catch (error) {
      console.error("Failed to update event:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            {t("admin.events.sections.mainInfo")}
          </h2>
          <div className="space-y-4">
            <MultilingualTabsField
              fields={translationFields}
              values={translationValues}
              meta={translationMeta}
              activeLocale={activeLocale}
              onLocaleChange={setActiveLocale}
              onValueChange={handleTranslationChange}
            />
            <TranslateFieldsToolbar
              sourceLocale={sourceLocale}
              activeLocale={activeLocale}
              isPending={translateBatch.isPending}
              disabled={!sourceLocale}
              onTranslateEmpty={() => handleTranslate("fill_empty")}
              onUpdateAuto={() => handleTranslate("update_auto")}
            />
            {form.formState.errors.title?.message && (
              <p className="text-sm text-destructive">
                {String(form.formState.errors.title.message)}
              </p>
            )}
            {form.formState.errors.shortDescription?.message && (
              <p className="text-sm text-destructive">
                {String(form.formState.errors.shortDescription.message)}
              </p>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.events.fields.description")}</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder={t("admin.events.placeholders.description")}
                      className="min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            {t("admin.events.sections.typeFormat")}
          </h2>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("events.form.eventTypeLabel")}</FormLabel>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Object.entries(EVENT_TYPE_LABEL_KEYS).map(
                      ([type, labelKey]) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.onChange(type)}
                          className={cn(
                            "rounded-lg border p-4 text-left transition",
                            field.value === type
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border bg-background hover:border-primary/50 hover:bg-muted",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full border-2 transition",
                                field.value === type
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground",
                              )}
                            />
                            <span className="font-medium text-foreground">
                              {t(labelKey)}
                            </span>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("events.form.accessTypeLabel")}</FormLabel>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {Object.entries(ACCESS_TYPE_LABEL_KEYS).map(
                      ([accessType, labelKey]) => (
                        <button
                          key={accessType}
                          type="button"
                          onClick={() => field.onChange(accessType)}
                          className={cn(
                            "rounded-lg border p-4 text-left transition",
                            field.value === accessType
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border bg-background hover:border-primary/50 hover:bg-muted",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full border-2 transition",
                                field.value === accessType
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground",
                              )}
                            />
                            <span className="font-medium text-foreground">
                              {t(labelKey)}
                            </span>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                  <FormDescription>
                    {field.value === AccessType.OPEN
                      ? t("events.accessDescription.open")
                      : field.value === AccessType.REQUEST
                        ? t("events.accessDescription.request")
                        : t("events.accessDescription.inviteOnly")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("events.form.formatLabel")}</FormLabel>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {Object.entries(EVENT_FORMAT_LABEL_KEYS).map(
                      ([format, labelKey]) => (
                        <button
                          key={format}
                          type="button"
                          onClick={() => field.onChange(format)}
                          className={cn(
                            "rounded-lg border p-4 text-center transition",
                            field.value === format
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border bg-background hover:border-primary/50 hover:bg-muted",
                          )}
                        >
                          <span className="font-medium text-foreground">
                            {t(labelKey)}
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        {isPaid && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {t("events.form.participationCost")}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t("events.form.priceLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? undefined : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("events.form.currencyLabel")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "UZS"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("events.form.currencyPlaceholder")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {t(CURRENCY_LABEL_KEYS[currency])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            {t("admin.events.sections.dates")}
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("events.form.startDateLabel")}</FormLabel>
                    <FormControl>
                      <DateTimeInput
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        id="startDate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("events.form.endDateLabel")}</FormLabel>
                    <FormControl>
                      <DateTimeInput
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        id="endDate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="registrationDeadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("admin.events.fields.registrationDeadline")}
                  </FormLabel>
                  <FormControl>
                    <DateTimeInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      id="registrationDeadline"
                    />
                  </FormControl>
                  <FormDescription>
                    {t("admin.events.hints.registrationDeadline")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            {t("admin.events.sections.venue")}
          </h2>
          <div className="space-y-4">
            {isOffline && (
              <>
                <FormField
                  control={form.control}
                  name="venue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.events.fields.venue")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("admin.events.placeholders.venue")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.events.fields.address")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("admin.events.placeholders.address")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.events.fields.city")}</FormLabel>
                      <FormControl>
                        <CitySelect
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t("admin.events.placeholders.city")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <EventLocationPicker
                  value={{
                    latitude: form.watch("latitude"),
                    longitude: form.watch("longitude"),
                    placeId: form.watch("placeId"),
                  }}
                  onChange={(change) => {
                    form.setValue("latitude", change.latitude);
                    form.setValue("longitude", change.longitude);
                    if (change.placeId != null)
                      form.setValue("placeId", change.placeId);
                    if (change.venue != null)
                      form.setValue("venue", change.venue);
                    if (change.address != null)
                      form.setValue("address", change.address);
                    if (change.city != null) form.setValue("city", change.city);
                  }}
                />
              </>
            )}

            {(isOnline || selectedFormat === "HYBRID") && (
              <FormField
                control={form.control}
                name="onlineUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("events.form.onlineUrlLabel", { required: "" })}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://zoom.us/j/123456789"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("events.form.onlineUrlDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            {t("admin.events.sections.additionalSettings")}
          </h2>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("admin.events.fields.maxParticipants")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t(
                        "admin.events.placeholders.maxParticipants",
                      )}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    {t("admin.events.hints.maxParticipants")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commentsEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("admin.events.fields.comments")}
                    </FormLabel>
                    <FormDescription>
                      {t("events.form.commentsDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? true}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* Errors */}
        {updateEvent.isError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{t("admin.events.hints.updateError")}</p>
          </div>
        )}

        {/* Validation Errors */}
        {Object.keys(form.formState.errors).length > 0 && (
          <div className="rounded-lg border border-warning-soft bg-warning-soft p-4 text-sm text-warning-soft-foreground">
            <p className="font-medium">
              {t("admin.events.hints.fixFormErrors")}
            </p>
            <ul className="mt-2 list-inside list-disc">
              {Object.entries(form.formState.errors).map(([field, error]) => (
                <li key={field}>
                  {field}:{" "}
                  {(error as { message?: string })?.message ||
                    t("events.form.validationError")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/admin/events/${event.id}`)}
          >
            {t("admin.actions.cancel")}
          </Button>
          <Button type="submit" disabled={updateEvent.isPending}>
            {updateEvent.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("events.form.saveChanges")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
