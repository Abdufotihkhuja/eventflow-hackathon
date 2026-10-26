/**
 * Компонент мультиселекта для выбора тегов
 * @module shared/ui/tags-multi-select
 */

import { useState } from "react";
import { Check, ChevronsUpDown, X, Search } from "lucide-react";
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

interface TagsMultiSelectProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TagsMultiSelect({
  tags,
  selectedTagIds,
  onChange,
  placeholder = "Выберите теги...",
  emptyText = "Теги не найдены",
  searchPlaceholder = "Поиск тегов...",
  disabled = false,
  className,
}: TagsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (tagId: string) => {
    const isSelected = selectedTagIds.includes(tagId);
    if (isSelected) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedTagIds.filter((id) => id !== tagId));
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
                <span className="text-muted-foreground">{placeholder}</span>
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
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="max-h-[50vh] sm:max-h-64">
              {filteredTags.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyText}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleSelect(tag.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                          isSelected && "bg-accent"
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
                </div>
              )}
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
