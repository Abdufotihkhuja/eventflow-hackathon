/**
 * Страница создания/редактирования статьи блога
 * @module pages/my-blog/editor
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useLocale, useT } from "@eventflow/i18n/react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft, Save, Send, Eye, Loader2, RefreshCw, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Label,
  Switch,
  ImageUpload,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TagsMultiSelectCreatable,
  TagsManagerDialog,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui";
import { RichTextEditor, type BlockNoteContent } from "@shared/ui/rich-text-editor";
import { BlogStatusBadge } from "@shared/ui/blog-status-badge";
import {
  useBlogPost,
  useCreateBlogPost,
  useUpdateBlogPost,
  useSubmitBlogPost,
  useOrganizationTags,
  useBlogCategories,
  useSuggestBlogSlug,
  useCheckBlogSlug,
} from "@features/blog/api";
import {
  useCreateOrganizationTag,
  useDeleteOrganizationTag,
} from "@features/events/api";
import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  getBatchTranslationFailureMessage,
  getFallbackBusinessTranslation,
  MultilingualTabsField,
  resolveBusinessSourceLocale,
  setBusinessTranslationValue,
  summarizeAppliedBatch,
  TranslateFieldsToolbar,
  useToolbarLabels,
  applyRichTranslationResultSafely,
  buildRichTranslationBatchItems,
  createRichTranslationMetaDraft,
  createRichTranslationsDraft,
  getFirstNonEmptyRichLocale,
  getVisibleSegmentCount,
  isRichDocEmpty,
  mapBatchResultsToTranslatedSegments,
  translateRichSegmentsPerBlock,
  markRichEmpty,
  markRichManualEdit,
  markRichTargetsOutdatedWhenSourceChanged,
  markRichTranslationError,
  shouldSkipRichOverwrite,
  useTranslateBatch,
  type AppLocale,
  type BusinessTranslationFieldConfig,
  type RichTranslationMetaDraft,
  type RichTranslationsDraft,
  type TranslateBatchResponse,
  type TranslationApplyMode,
  type TranslationMeta,
  type TranslationValues,
} from "@features/translations";
import type { CreateBlogPostDto, UpdateBlogPostDto } from "@api/services";
import {
  isMemberUser,
  useCurrentUser,
} from "@features/profile/api/use-current-user";
import { cn } from "@shared/lib/cn";
import { useDebounce } from "@shared/lib/use-debounce";
import {
  computeRichTextStructureHash,
  computeRichTextVisibleTextHash,
  extractRichTextSegments,
  isBlockNoteDocument,
  SLUG_VALID_REGEX,
  SLUG_MAX_LENGTH,
  type BlockNoteDocument,
} from "@shared/lib";
import { Badge } from "@shared/ui";

type FormData = {
  title: string;
  slug: string;
  shortDescription: string;
  coverImage: string;
  commentsEnabled: boolean;
  tagIds: string[];
  categoryId: string;
  /**
   * Byline author — empty string = Organization byline (legacy / default);
   * a member id = Person byline (real human, drives Person JSON-LD for E-E-A-T
   * on the public site). Only member actors can choose themselves; for
   * organization actors the field is hidden and stays empty.
   */
  authorId: string;
};

/** Sentinel value for the "no category" option in the Select (empty string is reserved). */
const NO_CATEGORY_VALUE = "__none__";
/** Sentinel value for "Organization byline" — keeps "" reserved for unset. */
const ORG_BYLINE_VALUE = "__organization__";

const BUSINESS_LOCALES = ["ru", "uz", "en"] as const;
const BLOG_TRANSLATION_FIELD_KEYS = ["title", "shortDescription"] as const;
const RICH_FIELD_KEY = "content" as const;
const MAX_TRANSLATION_BATCH_ITEMS = 50;
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LOCALE_LABELS: Record<AppLocale, string> = {
  ru: "Русский",
  uz: "O‘zbekcha",
  en: "English",
};

const RICH_STATUS_LABELS: Record<string, string> = {
  auto_translated: "Auto-translated",
  manual: "Edited manually",
  edited_after_translation: "Edited manually",
  outdated: "Outdated",
  translation_error: "Translation error",
};

export function BlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [content, setContent] = useState<BlockNoteContent>([]);
  const [isSaving, setIsSaving] = useState(false);

  const t = useT();
  const locale = useLocale();
  const { data: post, isLoading } = useBlogPost(id);
  // Only `member` actors can be the Person byline (orgs have no human
  // identity to attach to a Person JSON-LD node).
  const { data: currentUser } = useCurrentUser();
  const currentMember = isMemberUser(currentUser) ? currentUser.data : null;
  const currentMemberName = currentMember
    ? `${currentMember.firstName} ${currentMember.lastName}`.trim()
    : "";
  const { data: tagsData, refetch: refetchTags } = useOrganizationTags();
  const { data: blogCategories } = useBlogCategories(locale);
  const createTag = useCreateOrganizationTag();
  const deleteTag = useDeleteOrganizationTag();
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();
  const submitMutation = useSubmitBlogPost();
  const translateBatch = useTranslateBatch();
  const tilmochLabels = useToolbarLabels();
  const [showTagsManager, setShowTagsManager] = useState(false);
  const normalizeTagIds = useCallback(
    (tagIds: string[] | undefined) =>
      (tagIds ?? []).filter((tagId) => UUID_V4_REGEX.test(tagId)),
    []
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: "",
      slug: "",
      shortDescription: "",
      coverImage: "",
      commentsEnabled: true,
      tagIds: [],
      categoryId: "",
      authorId: "",
    },
  });
  const [activeLocale, setActiveLocale] = useState<AppLocale>("ru");
  const [translationValues, setTranslationValues] = useState<TranslationValues>(
    () => createBusinessTranslationValues(BLOG_TRANSLATION_FIELD_KEYS, undefined, {})
  );
  const [translationMeta, setTranslationMeta] = useState<TranslationMeta>(
    () => createBusinessTranslationMeta(BLOG_TRANSLATION_FIELD_KEYS, undefined, translationValues)
  );
  const [richDraft, setRichDraft] = useState<RichTranslationsDraft>(() => ({
    description: {},
    content: {},
  }));
  const [richMeta, setRichMeta] = useState<RichTranslationMetaDraft>(() => ({
    description: {},
    content: {},
  }));

  const title = watch("title");
  const slug = watch("slug");
  const debouncedTitle = useDebounce(title, 400);
  const debouncedSlug = useDebounce(slug, 400);
  const suggestSlug = useSuggestBlogSlug(debouncedTitle, id);
  const slugCheck = useCheckBlogSlug(debouncedSlug, id);
  const lastSuggestedSlugRef = useRef<string>("");
  const sourceLocale = resolveBusinessSourceLocale(
    translationValues,
    BLOG_TRANSLATION_FIELD_KEYS,
    activeLocale
  );
  const richSourceLocale = getFirstNonEmptyRichLocale(richDraft, activeLocale, RICH_FIELD_KEY);
  const richSourceDoc = richSourceLocale ? richDraft.content?.[richSourceLocale] : undefined;
  const richSourceIsValid = richSourceDoc === undefined || isBlockNoteDocument(richSourceDoc);
  const richSourceSegmentCount = richSourceDoc ? getVisibleSegmentCount(richSourceDoc) : 0;
  const richFillEmptyTargets = useMemo(
    () => getWritableRichTargets(richDraft, richMeta, richSourceLocale, "fill_empty"),
    [richDraft, richMeta, richSourceLocale]
  );
  const richUpdateAutoTargets = useMemo(
    () => getWritableRichTargets(richDraft, richMeta, richSourceLocale, "update_auto"),
    [richDraft, richMeta, richSourceLocale]
  );
  const richHelpMessage = getRichHelpMessage({
    sourceLocale: richSourceLocale,
    sourceIsValid: richSourceIsValid,
    sourceSegmentCount: richSourceSegmentCount,
    fillEmptyTargets: richFillEmptyTargets,
    updateAutoTargets: richUpdateAutoTargets,
  });
  const translationFields = useMemo<BusinessTranslationFieldConfig[]>(
    () => [
      {
        key: "title",
        label: "Заголовок",
        placeholder: "Введите заголовок статьи...",
        maxLength: 200,
      },
      {
        key: "shortDescription",
        label: "Краткое описание",
        placeholder: "Краткое описание для предпросмотра...",
        maxLength: 500,
        multiline: true,
        rows: 3,
      },
    ],
    []
  );

  // Подстановка slug из suggest: обновляем, если slug пустой или не менялся вручную (равен последнему подставленному)
  useEffect(() => {
    if (!suggestSlug.data?.slug) return;
    const suggested = suggestSlug.data.slug;
    const current = slug.trim();
    if (current === "" || current === lastSuggestedSlugRef.current) {
      setValue("slug", suggested, { shouldDirty: true });
      lastSuggestedSlugRef.current = suggested;
    }
  }, [suggestSlug.data?.slug, setValue, slug]);

  // Load post data
  useEffect(() => {
    if (post) {
      const initialSlug = post.slug ?? "";
      const values = createBusinessTranslationValues(
        BLOG_TRANSLATION_FIELD_KEYS,
        post.translations,
        {
          title: post.title,
          shortDescription: post.shortDescription,
        }
      );
      reset({
        title: post.title,
        slug: initialSlug,
        shortDescription: post.shortDescription || "",
        coverImage: post.coverImage || "",
        commentsEnabled: post.commentsEnabled,
        tagIds: normalizeTagIds(post.tags.map((tag) => tag.id)),
        categoryId: post.category?.id ?? post.categoryId ?? "",
        // `post.author.id` is the OrganizationMember id when a Person byline
        // is set; absent otherwise (legacy Organization byline).
        authorId: post.author?.id ?? "",
      });
      setTranslationValues(values);
      setTranslationMeta(
        createBusinessTranslationMeta(BLOG_TRANSLATION_FIELD_KEYS, post.translationMeta, values)
      );
      setActiveLocale("ru");
      lastSuggestedSlugRef.current = initialSlug;
      const initialContent = toBlockNoteDocument(post.content);
      const nextDraft = createRichTranslationsDraft(
        RICH_FIELD_KEY,
        post.richTranslations,
        initialContent
      );
      const nextMeta = createRichTranslationMetaDraft(
        RICH_FIELD_KEY,
        post.richTranslationMeta,
        nextDraft
      );
      const nextContent = nextDraft.content?.ru ?? initialContent ?? [];
      setContent(nextContent as BlockNoteContent);
      setRichDraft(nextDraft);
      setRichMeta(nextMeta);
    }
  }, [normalizeTagIds, post, reset]);

  const syncScalarFallbacks = useCallback(
    (values: TranslationValues) => {
      setValue("title", getFallbackBusinessTranslation(values, "title"), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("shortDescription", getFallbackBusinessTranslation(values, "shortDescription"), {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue]
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
      BLOG_TRANSLATION_FIELD_KEYS,
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
          if (summary.failed > 0) {
            const failureMessage = getBatchTranslationFailureMessage(response);
            toast.error("Translation partially completed", {
              description: failureMessage ?? `Updated: ${summary.translated}. Failed: ${summary.failed}.`,
            });
            return;
          }
          toast.success("Translation ready", {
            description: `Updated: ${summary.translated}. Unchanged: ${summary.skipped}.`,
          });
        },
        onError: error => {
          toast.error(error?.message ?? "Translation service failed.");
        },
      }
    );
  };

  const syncContentFallback = useCallback(
    (draft: RichTranslationsDraft, preferredLocale: AppLocale, fallbackDoc?: BlockNoteDocument) => {
      const fallbackLocale = getFirstNonEmptyRichLocale(draft, preferredLocale, RICH_FIELD_KEY);
      const nextContent = fallbackLocale ? draft.content?.[fallbackLocale] : fallbackDoc;

      if (nextContent) {
        setContent(nextContent as BlockNoteContent);
      }
    },
    []
  );

  const handleContentChange = (nextContent: BlockNoteContent) => {
    const nextDoc = toBlockNoteDocument(nextContent) ?? [];
    const nextDraft: RichTranslationsDraft = {
      description: richDraft.description,
      content: {
        ...richDraft.content,
        [activeLocale]: nextDoc,
      },
    };

    const manualMeta = isRichDocEmpty(nextDoc)
      ? markRichEmpty(richMeta, RICH_FIELD_KEY, activeLocale)
      : markRichManualEdit(richMeta, RICH_FIELD_KEY, activeLocale);
    const nextMeta = markRichTargetsOutdatedWhenSourceChanged(
      manualMeta,
      RICH_FIELD_KEY,
      activeLocale,
      nextDoc
    );

    setRichDraft(nextDraft);
    setRichMeta(nextMeta);
    setContent(nextDoc as BlockNoteContent);
  };

  const handleTranslateRichContent = async (mode: TranslationApplyMode) => {
    if (!richSourceLocale || !richSourceDoc) {
      toast.error("Add rich content in at least one language before translating.");
      return;
    }

    if (!isBlockNoteDocument(richSourceDoc)) {
      toast.error("Source rich document is invalid.");
      return;
    }

    const sourceSegments = extractRichTextSegments(richSourceDoc);
    if (sourceSegments.length === 0) {
      toast.info("No visible rich text segments to translate.");
      return;
    }

    const allTargetLocales = BUSINESS_LOCALES.filter(locale => locale !== richSourceLocale);
    let nextMeta = markUnknownNonEmptyTargetsManual(richDraft, richMeta, richSourceLocale);
    const targetLocales = allTargetLocales.filter(
      locale =>
        !shouldSkipRichOverwrite(
          nextMeta.content?.[locale]?.status,
          mode,
          richDraft.content?.[locale]
        )
    );

    if (targetLocales.length === 0) {
      setRichMeta(nextMeta);
      toast.info("No eligible rich translations to update without overwriting manual content.");
      return;
    }

    const items = buildRichTranslationBatchItems(RICH_FIELD_KEY, sourceSegments);
    const sourceHash = computeRichTextVisibleTextHash(richSourceDoc);
    const structureHash = computeRichTextStructureHash(richSourceDoc);

    try {
      const responses = [];
      for (const chunk of chunkItems(items, MAX_TRANSLATION_BATCH_ITEMS)) {
        responses.push(
          await translateBatch.mutateAsync({
            sourceLocale: richSourceLocale,
            targetLocales,
            items: chunk,
          })
        );
      }

      const response = mergeBatchResponses(responses);
      let nextDraft = richDraft;
      let translated = 0;
      let failed = 0;
      let firstFailureMessage: string | undefined;
      const translatedLocales: AppLocale[] = [];

      for (const targetLocale of targetLocales) {
        let mapped = mapBatchResultsToTranslatedSegments(
          response,
          RICH_FIELD_KEY,
          sourceSegments,
          targetLocale
        );

        if (!mapped.ok) {
          // The combined translation couldn't be split back per block (provider
          // reflowed line breaks for this locale). Retry block-by-block.
          const fallback = await translateRichSegmentsPerBlock(
            translateBatch.mutateAsync,
            RICH_FIELD_KEY,
            richSourceLocale,
            targetLocale,
            sourceSegments
          );

          if (fallback.ok) {
            mapped = fallback;
          } else {
            firstFailureMessage ??= fallback.error;
            nextMeta = markRichTranslationError(
              nextMeta,
              RICH_FIELD_KEY,
              targetLocale,
              fallback.error,
              richSourceLocale,
              sourceHash
            );
            failed += 1;
            continue;
          }
        }

        const applied = applyRichTranslationResultSafely(richSourceDoc, mapped.segments, response, {
          sourceLocale: richSourceLocale,
          targetLocale,
          sourceHash,
          structureHash,
        });

        if (!applied.ok) {
          firstFailureMessage ??= applied.error;
          nextMeta = markRichTranslationError(
            nextMeta,
            RICH_FIELD_KEY,
            targetLocale,
            applied.error,
            richSourceLocale,
            sourceHash
          );
          failed += 1;
          continue;
        }

        nextDraft = {
          description: nextDraft.description,
          content: {
            ...nextDraft.content,
            [targetLocale]: applied.document,
          },
        };
        nextMeta = {
          description: nextMeta.description,
          content: {
            ...nextMeta.content,
            [targetLocale]: applied.meta,
          },
        };
        translated += 1;
        translatedLocales.push(targetLocale);
      }

      const skipped = allTargetLocales.length - targetLocales.length;
      setRichDraft(nextDraft);
      setRichMeta(nextMeta);

      const nextActiveLocale = translatedLocales[0];
      if (nextActiveLocale) {
        setActiveLocale(nextActiveLocale);
        syncContentFallback(nextDraft, nextActiveLocale);
      } else {
        syncContentFallback(nextDraft, activeLocale);
      }

      if (failed > 0) {
        toast.error("Translation partially completed", {
          description: firstFailureMessage ?? `Updated: ${translated}. Failed: ${failed}.`,
        });
        return;
      }
      toast.success("Rich translation ready", {
        description: `Locales updated: ${translated}. Unchanged: ${skipped}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Rich translation service failed.";
      const failedMeta = targetLocales.reduce(
        (meta, locale) =>
          markRichTranslationError(meta, RICH_FIELD_KEY, locale, message, richSourceLocale, sourceHash),
        nextMeta
      );
      setRichMeta(failedMeta);
      toast.error(message);
    }
  };

  const handleSave = useCallback(async (data: FormData, shouldSubmit = false) => {
    setIsSaving(true);

    try {
      const fallbackTitle = getFallbackBusinessTranslation(translationValues, "title", data.title);
      const fallbackShortDescription = getFallbackBusinessTranslation(
        translationValues,
        "shortDescription",
        data.shortDescription
      );
      const tagIds = normalizeTagIds(data.tagIds);
      const payload: CreateBlogPostDto | UpdateBlogPostDto = {
        title: fallbackTitle,
        slug: data.slug?.trim() || undefined,
        content: content as CreateBlogPostDto["content"],
        shortDescription: fallbackShortDescription || undefined,
        translations: translationValues,
        translationMeta,
        richTranslations: {
          content: richDraft.content ?? {},
        },
        richTranslationMeta: {
          content: richMeta.content ?? {},
        },
        coverImage: data.coverImage || undefined,
        commentsEnabled: data.commentsEnabled,
        tagIds,
        categoryId: data.categoryId || null,
        // Empty string → null (Organization byline / legacy); a member id →
        // Person byline. API validates the member exists on `connect`.
        authorId: data.authorId || null,
      };

      if (isEdit && id) {
        const updated = await updateMutation.mutateAsync({ id, data: payload });
        
        if (shouldSubmit && updated.status === "DRAFT") {
          await submitMutation.mutateAsync(id);
        }
        
        navigate(`/my-blog/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        
        if (shouldSubmit) {
          await submitMutation.mutateAsync(created.id);
        }
        
        navigate(`/my-blog/${created.id}`);
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    content,
    createMutation,
    id,
    isEdit,
    navigate,
    normalizeTagIds,
    richDraft.content,
    richMeta.content,
    submitMutation,
    translationMeta,
    translationValues,
    updateMutation,
  ]);

  const onSubmit = useCallback((data: FormData) => handleSave(data, false), [handleSave]);
  const onSubmitForReview = () => {
    const data = watch();
    handleSave(data, true);
  };

  useEffect(() => {
    const handleSaveHotkey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (isSaving) return;

      void handleSubmit(onSubmit)();
    };

    window.addEventListener("keydown", handleSaveHotkey);

    return () => {
      window.removeEventListener("keydown", handleSaveHotkey);
    };
  }, [handleSubmit, isSaving, onSubmit]);

  if (isLoading && isEdit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6 bg-background rounded-xl border shadow-sm p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {isEdit ? "Редактировать статью" : "Новая статья"}
              </h1>
              {post && (
                <div className="flex items-center gap-2">
                  <BlogStatusBadge status={post.status} />
                  <span className="text-sm text-muted-foreground">
                    • Последнее изменение{" "}
                    {formatDistanceToNow(new Date(post.updatedAt), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEdit && post && post.status === "PUBLISHED" && (
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                Предпросмотр
              </Button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <input type="hidden" {...register("title", { required: "Заголовок обязателен" })} />
          <input type="hidden" {...register("shortDescription")} />

          {/* Public text */}
          <div className="space-y-3">
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
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">URL (slug)</Label>
            <Input
              id="slug"
              {...register("slug")}
              placeholder="url-stati (a-z, 0-9, дефис)"
              maxLength={SLUG_MAX_LENGTH}
              className={cn(
                (slugCheck.data?.available === false || (slug.trim() && !SLUG_VALID_REGEX.test(slug.trim().toLowerCase()))) && "border-destructive"
              )}
            />
            {slug.trim() && !SLUG_VALID_REGEX.test(slug.trim().toLowerCase()) && (
              <p className="text-sm text-destructive">
                Только латиница в нижнем регистре, цифры и дефис. До {SLUG_MAX_LENGTH} символов.
              </p>
            )}
            {slug.trim() && SLUG_VALID_REGEX.test(slug.trim().toLowerCase()) && debouncedSlug.length > 0 && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {slugCheck.isFetching && "Проверка..."}
                {slugCheck.isFetched && slugCheck.data && (
                  slugCheck.data.available ? "Slug свободен" : "Этот slug уже занят"
                )}
              </p>
            )}
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label>Обложка</Label>
            <ImageUpload
              value={watch("coverImage")}
              onChange={(url) =>
                setValue("coverImage", url || "", { shouldDirty: true })
              }
              maxWidth={1200}
              maxHeight={800}
              quality={85}
              maxSizeMB={5}
            />
            <p className="text-xs text-muted-foreground">
              Рекомендуемый размер: 1200x800px. Максимум 5MB.
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>{t("blog.editor.category")}</Label>
            <Select
              value={watch("categoryId") || NO_CATEGORY_VALUE}
              onValueChange={(value) =>
                setValue(
                  "categoryId",
                  value === NO_CATEGORY_VALUE ? "" : value,
                  { shouldDirty: true }
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("blog.editor.categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY_VALUE}>
                  {t("blog.editor.categoryNone")}
                </SelectItem>
                {(blogCategories ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("blog.editor.categoryHint")}
            </p>
          </div>

          {/* Author byline — drives Person vs Organization JSON-LD on the
              public site. Only shown to member actors; org actors can't be
              a Person byline. */}
          {currentMember && (
            <div className="space-y-2">
              <Label>{t("blog.editor.bylineLabel")}</Label>
              <Select
                value={watch("authorId") || ORG_BYLINE_VALUE}
                onValueChange={(value) =>
                  setValue(
                    "authorId",
                    value === ORG_BYLINE_VALUE ? "" : value,
                    { shouldDirty: true }
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ORG_BYLINE_VALUE}>
                    {t("blog.editor.bylineOrganization")}
                  </SelectItem>
                  <SelectItem value={currentMember.id}>
                    {currentMemberName || t("blog.editor.bylineMeFallback")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("blog.editor.bylineHint")}
              </p>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label>Теги</Label>
            <TagsMultiSelectCreatable
              tags={tagsData || []}
              selectedTagIds={watch("tagIds")}
              onChange={(tagIds) =>
                setValue("tagIds", normalizeTagIds(tagIds), { shouldDirty: true })
              }
              onCreateTag={async (name) => {
                const tag = await createTag.mutateAsync({ name });
                // Обновляем список тегов после создания
                await refetchTags();
                return tag;
              }}
              onTagCreated={() => {
                // Дополнительное обновление после создания
                refetchTags();
              }}
              onManageTags={() => setShowTagsManager(true)}
              maxTags={3}
              placeholder="Выберите теги для статьи..."
              emptyText="Теги не найдены"
              searchPlaceholder="Поиск или создание тега..."
              createText="Создать тег"
              isCreating={createTag.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Выберите существующие теги или создайте новые (максимум 3)
            </p>
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <div className="flex min-h-5 items-center justify-between gap-2">
              <Label>
                Содержание <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-wrap justify-end gap-1.5">
                {BUSINESS_LOCALES.map(locale => (
                  <RichStatusBadge
                    key={locale}
                    locale={locale}
                    status={richMeta.content?.[locale]?.status}
                  />
                ))}
              </div>
            </div>
            <div className="sticky bottom-4 z-30 -mt-1 flex justify-end pointer-events-none sm:bottom-6">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label={tilmochLabels.translationTools}
                    disabled={translateBatch.isPending}
                    className="pointer-events-auto size-12 rounded-full border border-border bg-card p-1.5 text-primary shadow-lg hover:bg-muted/40"
                  >
                    {translateBatch.isPending ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <img src="/tilmoch-icon.svg" alt="" aria-hidden="true" className="size-9 rounded-full" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" side="top" sideOffset={10} className="w-80 p-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <img
                        src="/tilmoch-icon.svg"
                        alt=""
                        aria-hidden="true"
                        className="size-5 rounded-sm"
                      />
                      <p className="text-sm font-medium leading-none">
                        {tilmochLabels.translationTools}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTranslateRichContent("fill_empty")}
                        disabled={
                          translateBatch.isPending ||
                          !richSourceLocale ||
                          !richSourceIsValid ||
                          richSourceSegmentCount === 0 ||
                          richFillEmptyTargets.length === 0
                        }
                        className="h-auto justify-start whitespace-normal border-success-soft bg-success-soft/40 px-3 py-2 text-left text-success-soft-foreground hover:bg-success-soft/60"
                      >
                        <WandSparkles className="size-4" />
                        {tilmochLabels.fillEmpty}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTranslateRichContent("update_auto")}
                        disabled={
                          translateBatch.isPending ||
                          !richSourceLocale ||
                          !richSourceIsValid ||
                          richSourceSegmentCount === 0 ||
                          richUpdateAutoTargets.length === 0
                        }
                        className="h-auto justify-start whitespace-normal px-3 py-2 text-left"
                      >
                        <RefreshCw className="size-4" />
                        {tilmochLabels.updateOutdated}
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      {richHelpMessage ?? tilmochLabels.poweredBy}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <RichTextEditor
                key={`blog-content-${activeLocale}`}
                value={
                  richDraft.content?.[activeLocale] ??
                  (activeLocale === "ru" ? content : ([] satisfies BlockNoteDocument))
                }
                onChange={handleContentChange}
                placeholder="Начните писать вашу статью..."
                className="min-h-[400px]"
              />
            </div>
          </div>

          {/* Comments Enabled */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="commentsEnabled">Комментарии</Label>
              <p className="text-sm text-muted-foreground">
                Разрешить пользователям комментировать статью
              </p>
            </div>
            <Switch
              id="commentsEnabled"
              checked={watch("commentsEnabled")}
              onCheckedChange={(checked) =>
                setValue("commentsEnabled", checked, { shouldDirty: true })
              }
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Отмена
            </Button>

            <div className="flex items-center gap-2">
              {(!post || post.status === "DRAFT") && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onSubmitForReview}
                  disabled={isSaving}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Сохранить и отправить на модерацию
                </Button>
              )}

              <Button type="submit" disabled={isSaving} isLoading={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                Сохранить
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>

      {/* Rejection Reason */}
      {post && post.status === "REJECTED" && post.rejectionMessage && (
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="p-4 border border-destructive rounded-lg bg-destructive/5">
            <h3 className="font-semibold text-destructive mb-2">
              Причина отклонения
            </h3>
            <p className="text-sm">{post.rejectionMessage}</p>
          </div>
        </div>
      )}

      {/* Диалог управления тегами */}
      <TagsManagerDialog
        open={showTagsManager}
        onOpenChange={setShowTagsManager}
        tags={tagsData || []}
        onDeleteTag={async (tagId) => {
          await deleteTag.mutateAsync(tagId);
        }}
        isDeleting={deleteTag.isPending}
      />
    </div>
  );
}

function RichStatusBadge({
  locale,
  status,
}: {
  locale: AppLocale;
  status?: NonNullable<RichTranslationMetaDraft["content"]>[AppLocale]["status"];
}) {
  if (!status || status === "empty") return null;

  const variant =
    status === "translation_error"
      ? "destructive"
      : status === "outdated"
        ? "warning"
        : status === "auto_translated"
          ? "secondary"
          : "outline";

  return (
    <Badge
      variant={variant}
      title={`${LOCALE_LABELS[locale]}: ${RICH_STATUS_LABELS[status] ?? status}`}
      className="gap-1 rounded-full px-1.5 py-0 text-[10px] font-medium"
    >
      <span className="text-[9px] font-semibold uppercase opacity-80">{locale}</span>
      <span>{getCompactRichStatusLabel(status)}</span>
    </Badge>
  );
}

function getCompactRichStatusLabel(
  status: NonNullable<NonNullable<RichTranslationMetaDraft["content"]>[AppLocale]["status"]>
) {
  switch (status) {
    case "auto_translated":
      return "Auto";
    case "manual":
    case "edited_after_translation":
      return "Manual";
    case "outdated":
      return "Stale";
    case "translation_error":
      return "Error";
    case "empty":
      return null;
  }
}

function toBlockNoteDocument(value: unknown): BlockNoteDocument | undefined {
  return isBlockNoteDocument(value) ? value : undefined;
}

function getWritableRichTargets(
  draft: RichTranslationsDraft,
  meta: RichTranslationMetaDraft,
  sourceLocale: AppLocale | null,
  mode: TranslationApplyMode
): AppLocale[] {
  if (!sourceLocale) return [];

  return BUSINESS_LOCALES.filter(locale => {
    if (locale === sourceLocale) return false;
    return !shouldSkipRichOverwrite(
      meta.content?.[locale]?.status,
      mode,
      draft.content?.[locale]
    );
  });
}

function markUnknownNonEmptyTargetsManual(
  draft: RichTranslationsDraft,
  meta: RichTranslationMetaDraft,
  sourceLocale: AppLocale
): RichTranslationMetaDraft {
  return BUSINESS_LOCALES.filter(locale => locale !== sourceLocale).reduce((nextMeta, locale) => {
    const status = nextMeta.content?.[locale]?.status;
    const doc = draft.content?.[locale];
    if (!status && doc && !isRichDocEmpty(doc)) {
      return markRichManualEdit(nextMeta, RICH_FIELD_KEY, locale);
    }
    return nextMeta;
  }, meta);
}

function getRichHelpMessage({
  sourceLocale,
  sourceIsValid,
  sourceSegmentCount,
  fillEmptyTargets,
  updateAutoTargets,
}: {
  sourceLocale: AppLocale | null;
  sourceIsValid: boolean;
  sourceSegmentCount: number;
  fillEmptyTargets: AppLocale[];
  updateAutoTargets: AppLocale[];
}): string | null {
  if (!sourceLocale) {
    return "Add rich content before translating.";
  }

  if (!sourceIsValid) {
    return "Source rich document is invalid.";
  }

  if (sourceSegmentCount === 0) {
    return "No visible rich text segments found.";
  }

  if (fillEmptyTargets.length === 0 && updateAutoTargets.length === 0) {
    return "Manual rich content will not be overwritten automatically.";
  }

  return null;
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function mergeBatchResponses(responses: TranslateBatchResponse[]): TranslateBatchResponse {
  return {
    results: responses.flatMap(response => response.results),
    summary: responses.reduce(
      (summary, response) => ({
        translated: summary.translated + response.summary.translated,
        skipped: summary.skipped + response.summary.skipped,
        failed: summary.failed + response.summary.failed,
      }),
      { translated: 0, skipped: 0, failed: 0 }
    ),
  };
}
