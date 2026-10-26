/**
 * Страница создания/редактирования статьи блога
 * @module pages/my-blog/editor
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft, Save, Send, Eye } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  ImageUpload,
  TagsMultiSelectCreatable,
  TagsManagerDialog,
} from "@shared/ui";
import { RichTextEditor, type BlockNoteContent } from "@shared/ui/rich-text-editor";
import { BlogStatusBadge } from "@shared/ui/blog-status-badge";
import {
  useBlogPost,
  useCreateBlogPost,
  useUpdateBlogPost,
  useSubmitBlogPost,
  useOrganizationTags,
  useSuggestBlogSlug,
  useCheckBlogSlug,
} from "@features/blog/api";
import {
  useCreateOrganizationTag,
  useDeleteOrganizationTag,
} from "@features/events/api";
import type { CreateBlogPostDto, UpdateBlogPostDto } from "@api/services";
import { cn } from "@shared/lib/cn";
import { useDebounce } from "@shared/lib/use-debounce";
import { SLUG_VALID_REGEX, SLUG_MAX_LENGTH } from "@shared/lib";

type FormData = {
  title: string;
  slug: string;
  shortDescription: string;
  coverImage: string;
  commentsEnabled: boolean;
  tagIds: string[];
};

export function BlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [content, setContent] = useState<BlockNoteContent>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: post, isLoading } = useBlogPost(id);
  const { data: tagsData, refetch: refetchTags } = useOrganizationTags();
  const createTag = useCreateOrganizationTag();
  const deleteTag = useDeleteOrganizationTag();
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();
  const submitMutation = useSubmitBlogPost();
  const [showTagsManager, setShowTagsManager] = useState(false);

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
    },
  });

  const title = watch("title");
  const slug = watch("slug");
  const debouncedTitle = useDebounce(title, 400);
  const debouncedSlug = useDebounce(slug, 400);
  const suggestSlug = useSuggestBlogSlug(debouncedTitle, id);
  const slugCheck = useCheckBlogSlug(debouncedSlug, id);
  const lastSuggestedSlugRef = useRef<string>("");

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
      reset({
        title: post.title,
        slug: initialSlug,
        shortDescription: post.shortDescription || "",
        coverImage: post.coverImage || "",
        commentsEnabled: post.commentsEnabled,
        tagIds: post.tags.map((tag) => tag.id),
      });
      lastSuggestedSlugRef.current = initialSlug;
      setContent(post.content as BlockNoteContent);
    }
  }, [post, reset]);

  const handleSave = useCallback(async (data: FormData, shouldSubmit = false) => {
    setIsSaving(true);

    try {
      const payload: CreateBlogPostDto | UpdateBlogPostDto = {
        title: data.title,
        slug: data.slug?.trim() || undefined,
        content: content as CreateBlogPostDto["content"],
        shortDescription: data.shortDescription || undefined,
        coverImage: data.coverImage || undefined,
        commentsEnabled: data.commentsEnabled,
        tagIds: data.tagIds.length > 0 ? data.tagIds : undefined,
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
  }, [content, createMutation, id, isEdit, navigate, submitMutation, updateMutation]);

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
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Заголовок <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              {...register("title", { required: "Заголовок обязателен" })}
              placeholder="Введите заголовок статьи..."
              className={cn(errors.title && "border-destructive")}
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

          {/* Short Description */}
          <div className="space-y-2">
            <Label htmlFor="shortDescription">Краткое описание</Label>
            <Textarea
              id="shortDescription"
              {...register("shortDescription")}
              placeholder="Краткое описание для предпросмотра..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Отображается в карточке статьи
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Теги</Label>
            <TagsMultiSelectCreatable
              tags={tagsData || []}
              selectedTagIds={watch("tagIds")}
              onChange={(tagIds) =>
                setValue("tagIds", tagIds, { shouldDirty: true })
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
            <Label>
              Содержание <span className="text-destructive">*</span>
            </Label>
            <div className="border rounded-lg overflow-hidden">
              <RichTextEditor
                value={content}
                onChange={setContent}
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
