/**
 * Компонент мультиселекта для выбора и создания тегов
 * @module shared/ui/tags-multi-select-creatable
 */

import { useState } from "react";
import { Check, ChevronsUpDown, X, Search, Plus, Settings } from "lucide-react";
import { useT } from "@eventflow/i18n/react";
import { cn } from "@shared/lib/cn";
import { Button } from "./shadcn/button";
import { Badge } from "./shadcn/badge";
import { Input } from "./shadcn/input";
import { ScrollArea } from "./shadcn/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./shadcn/popover";

export interface Tag {
  id: string;
  name: string;
  slug?: string;
}

interface TagsMultiSelectCreatableProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onCreateTag?: (name: string) => Promise<Tag>;
  onManageTags?: () => void;
  onTagCreated?: (tag: Tag) => void;
  maxTags?: number;
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  createText?: string;
  disabled?: boolean;
  className?: string;
  isCreating?: boolean;
}

export function TagsMultiSelectCreatable({
  tags,
  selectedTagIds,
  onChange,
  onCreateTag,
  onManageTags,
  onTagCreated,
  maxTags = 3,
  placeholder,
  emptyText,
  searchPlaceholder,
  createText,
  disabled = false,
  className,
  isCreating = false,
}: TagsMultiSelectCreatableProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const placeholderText = placeholder ?? t("common.tags.placeholder");
  const emptyTextValue = emptyText ?? t("common.tags.empty");
  const searchPlaceholderText = searchPlaceholder ?? t("common.tags.searchPlaceholder");
  const createTextValue = createText ?? t("common.tags.create");

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const canAddMore = selectedTagIds.length < maxTags;
  const isMaxReached = selectedTagIds.length >= maxTags;

  // Проверяем, существует ли уже тег с таким именем
  const searchTrimmed = search.trim();
  const searchExactMatch = tags.find(
    (tag) => tag.name.toLowerCase() === searchTrimmed.toLowerCase()
  );
  
  // Кнопка создания показывается если:
  // - есть текст в поиске
  // - такого тега еще нет
  const hasSearchText = searchTrimmed.length > 0;

  const handleSelect = (tagId: string) => {
    const isSelected = selectedTagIds.includes(tagId);
    if (isSelected) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else if (canAddMore) {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!hasSearchText || !onCreateTag || searchExactMatch) return;
    
    // Проверяем лимит перед созданием
    if (isMaxReached) {
      return;
    }

    setCreating(true);
    try {
      const newTag = await onCreateTag(search.trim());
      // Автоматически выбираем созданный тег
      onChange([...selectedTagIds, newTag.id]);
      setSearch("");
      // Уведомляем родителя о создании тега для обновления списка
      onTagCreated?.(newTag);
      // Не закрываем попап, чтобы пользователь мог продолжить работу
    } catch (error) {
      console.error("Failed to create tag:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between h-auto min-h-10 py-2"
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedTags.length === 0 ? (
                <span className="text-muted-foreground">{placeholderText}</span>
              ) : (
                selectedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={(e) => handleRemoveTag(tag.id, e)}
                      className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="flex flex-col gap-2 p-2">
            {/* Поиск и управление */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholderText}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              {onManageTags && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setOpen(false);
                    onManageTags();
                  }}
                  title={t("common.tags.manage")}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isMaxReached && (
              <div className="px-2 py-1 text-xs text-warning-soft-foreground bg-warning-soft rounded">
                {t("common.tags.limitReached", { count: maxTags })}
              </div>
            )}

            <ScrollArea className="max-h-[50vh] sm:max-h-64">
              <div className="space-y-1 p-1">
                {/* Существующие теги */}
                {filteredTags.length > 0 && filteredTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  const isDisabled = !isSelected && isMaxReached;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => !isDisabled && handleSelect(tag.id)}
                      disabled={isDisabled}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                        isSelected && "bg-accent",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <span>{tag.name}</span>
                    </button>
                  );
                })}

                {/* Кнопка создания нового тега - показываем всегда когда есть текст */}
                {hasSearchText && !searchExactMatch && (
                  <>
                    {filteredTags.length > 0 && (
                      <div className="my-2 border-t border-border" />
                    )}
                    <button
                      type="button"
                      onClick={handleCreateTag}
                      disabled={!onCreateTag || creating || isCreating || isMaxReached}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        "border-2 border-dashed",
                        !onCreateTag || isMaxReached
                          ? "border-muted-foreground/30 text-muted-foreground cursor-not-allowed opacity-50"
                          : "border-brand-secondary/50 text-brand-secondary hover:bg-brand-secondary/10 hover:border-brand-secondary",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <Plus className="h-5 w-5" />
                      <span>
                        {creating || isCreating
                          ? t("common.tags.creating")
                          : !onCreateTag
                          ? t("common.tags.createUnavailable")
                          : isMaxReached
                          ? t("common.tags.limitReached", { count: maxTags })
                          : `${createTextValue} "${searchTrimmed}"`}
                      </span>
                    </button>
                    {isMaxReached && onCreateTag && (
                      <p className="text-xs text-warning px-3 mt-1">
                        {t("common.tags.removeOneFirst")}
                      </p>
                    )}
                    {!onCreateTag && (
                      <p className="text-xs text-muted-foreground px-3 mt-1 text-center">
                        {t("common.tags.createNotConfigured")}
                      </p>
                    )}
                  </>
                )}

                {/* Сообщение о существующем теге */}
                {hasSearchText && searchExactMatch && (
                  <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t("common.tags.alreadyExists", { tag: searchTrimmed })}
                    </p>
                  </div>
                )}

                {/* Пустое состояние - когда нет результатов поиска */}
                {filteredTags.length === 0 && hasSearchText && !searchExactMatch && (
                  <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground">{emptyTextValue}</p>
                  </div>
                )}

                {/* Начальное состояние (нет поиска) */}
                {filteredTags.length === 0 && !hasSearchText && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {t("common.tags.startTyping")}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {selectedTagIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("common.tags.selectedCount", {
            selected: selectedTagIds.length,
            max: maxTags,
          })}
        </p>
      )}
    </div>
  );
}
