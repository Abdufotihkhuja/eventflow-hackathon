/**
 * Компонент комментария к статье блога
 * @module features/blog/ui/blog-comment-item
 */

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Heart, MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  Button,
  Textarea,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/ui";
import { cn } from "@shared/lib/cn";
import type { BlogComment } from "@api/services";

type BlogCommentItemProps = {
  comment: BlogComment;
  currentUserId?: string;
  onLike?: (commentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  isLikeLoading?: boolean;
};

export function BlogCommentItem({
  comment,
  currentUserId,
  onLike,
  onEdit,
  onDelete,
  isLikeLoading = false,
}: BlogCommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isAuthor = currentUserId === comment.author.id;

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit?.(comment.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div className="flex gap-3 py-4">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {comment.author.avatar ? (
          <img
            src={comment.author.avatar}
            alt={comment.author.name}
            className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {comment.author.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">{comment.author.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: ru,
              })}
              {comment.updatedAt !== comment.createdAt && " (изменено)"}
            </p>
          </div>

          {/* Actions Menu */}
          {isAuthor && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Редактировать
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(comment.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Comment Content or Edit Form */}
        {isEditing ? (
          <div className="space-y-2 mt-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px]"
              placeholder="Напишите комментарий..."
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                Сохранить
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="mt-3 flex items-center gap-4">
            {/* Like Button */}
            <button
              onClick={() => onLike?.(comment.id)}
              disabled={isLikeLoading}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                comment.isLiked
                  ? "text-destructive"
                  : "text-muted-foreground hover:text-destructive",
                isLikeLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  comment.isLiked && "fill-current"
                )}
              />
              <span>{comment.likesCount}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
