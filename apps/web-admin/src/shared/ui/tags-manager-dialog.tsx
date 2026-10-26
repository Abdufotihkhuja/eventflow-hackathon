/**
 * Диалог управления тегами организации
 * @module shared/ui/tags-manager-dialog
 */

import { useState } from "react";
import { Trash2, Loader2, Tag as TagIcon, AlertCircle } from "lucide-react";
import { formatDate } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import { cn } from "@shared/lib/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./shadcn/dialog";
import { Button } from "./shadcn/button";
import { Input } from "./shadcn/input";
import { Badge } from "./shadcn/badge";
import { ScrollArea } from "./shadcn/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./shadcn/alert-dialog";

export interface Tag {
  id: string;
  name: string;
  slug?: string;
  createdAt?: string;
  category?: "CUSTOM" | "SYSTEM";
  isSystem?: boolean;
  _count?: {
    events: number;
  };
}

interface TagsManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  onDeleteTag?: (tagId: string) => Promise<void>;
  isDeleting?: boolean;
  className?: string;
}

export function TagsManagerDialog({
  open,
  onOpenChange,
  tags,
  onDeleteTag,
  isDeleting = false,
  className,
}: TagsManagerDialogProps) {
  const t = useT();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteClick = (tag: Tag) => {
    setTagToDelete(tag);
  };

  const handleConfirmDelete = async () => {
    if (!tagToDelete || !onDeleteTag) return;

    setDeletingTagId(tagToDelete.id);
    try {
      await onDeleteTag(tagToDelete.id);
      setTagToDelete(null);
    } catch (error) {
      console.error("Failed to delete tag:", error);
    } finally {
      setDeletingTagId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("sm:max-w-[500px]", className)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5" />
              {t("common.tags.manage")}
            </DialogTitle>
            <DialogDescription>
              {t("common.tags.managerDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Поиск */}
            <Input
              placeholder={t("common.tags.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Список тегов */}
            <ScrollArea className="max-h-[50vh] sm:max-h-[300px] pr-4">
              {filteredTags.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TagIcon className="h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {search ? t("common.tags.empty") : t("common.tags.emptyDefault")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant="secondary" className="font-normal">
                          {tag.name}
                        </Badge>
                        {tag.createdAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(tag.createdAt, locale)}
                          </span>
                        )}
                      </div>

                      {onDeleteTag && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(tag)}
                          disabled={deletingTagId === tag.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {deletingTagId === tag.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Предупреждение */}
            <div className="flex items-start gap-2 rounded-lg border border-transparent bg-warning-soft text-warning-soft-foreground p-3">
              <AlertCircle className="h-4 w-4 text-warning-soft-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-warning-soft-foreground">
                {t("common.tags.deleteWarning")}
              </p>
            </div>

            {/* Кнопка закрытия */}
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("actions.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={!!tagToDelete} onOpenChange={(open) => !open && setTagToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.tags.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.tags.deleteDescription", { tag: tagToDelete?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
