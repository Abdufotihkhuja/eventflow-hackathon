/**
 * Модалка с полными деталями задачи
 * Комментарии, вложения, история, чек-листы
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
  Button,
  Input,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ScrollArea,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui";
import {
  Calendar,
  User,
  Tag,
  MessageSquare,
  Paperclip,
  History,
  CheckSquare,
  Plus,
  Send,
  Loader2,
  FileText,
  Image,
  File,
  Download,
  Trash2,
  Clock,
  AlertCircle,
  MoveRight,
  Edit,
  UserPlus,
  UserMinus,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { ApiError } from "@api/types";
import { formatDateTime, type Translator } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";

const ALLOWED_ATTACHMENT_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "txt",
  "zip",
] as const;

function isAllowedAttachmentType(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext
    ? ALLOWED_ATTACHMENT_EXTENSIONS.includes(
        ext as (typeof ALLOWED_ATTACHMENT_EXTENSIONS)[number],
      )
    : false;
}
import { cn } from "@shared/lib";
import { getMediaUrl, API_BASE_URL } from "@api/config";
import {
  useCommentsQuery,
  useAttachmentsQuery,
  useTaskActivitiesQuery,
  useUpdateTask,
} from "@features/tasks";
import {
  useAddComment,
  useDeleteComment,
  useAddAttachment,
  useDeleteAttachment,
} from "@features/tasks";
import { boardsKeys } from "@features/boards/api";
import { useQueryClient } from "@tanstack/react-query";
import type { BoardTask } from "@api/services";

const PRIORITY_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "LOW", labelKey: "tasks.priority.low" },
  { value: "MEDIUM", labelKey: "tasks.priority.medium" },
  { value: "HIGH", labelKey: "tasks.priority.high" },
  { value: "CRITICAL", labelKey: "tasks.priority.highest" },
];

interface TaskDetailModalProps {
  task: BoardTask | null;
  boardId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: (updatedTask: BoardTask) => void;
}

const PRIORITY_CONFIG = {
  CRITICAL: {
    labelKey: "tasks.priority.highest",
    color: "border-destructive bg-danger-soft text-danger-soft-foreground",
  },
  HIGH: {
    labelKey: "tasks.priority.high",
    color: "border-warning bg-warning-soft text-warning-soft-foreground",
  },
  MEDIUM: {
    labelKey: "tasks.priority.medium",
    color: "border-warning bg-warning-soft text-warning-soft-foreground",
  },
  LOW: {
    labelKey: "tasks.priority.low",
    color: "border-border bg-neutral-soft text-neutral-soft-foreground",
  },
};

// Типы активности и их отображение
type ActivityType =
  | "CREATED"
  | "UPDATED"
  | "MOVED"
  | "COMMENTED"
  | "ATTACHMENT_ADDED"
  | "ATTACHMENT_REMOVED"
  | "ASSIGNEE_ADDED"
  | "ASSIGNEE_REMOVED"
  | "TAG_ADDED"
  | "TAG_REMOVED"
  | "CHECKLIST_ADDED"
  | "CHECKLIST_ITEM_COMPLETED"
  | "PRIORITY_CHANGED"
  | "DUE_DATE_CHANGED";

interface ActivityDetails {
  title?: string;
  fileName?: string;
  attachmentId?: string;
  commentId?: string;
  fromColumnId?: string;
  toColumnId?: string;
  assigneeName?: string;
  tagName?: string;
  checklistName?: string;
  itemName?: string;
  oldPriority?: string;
  newPriority?: string;
  oldDueDate?: string;
  newDueDate?: string;
  changes?: { priority?: string };
}

interface Activity {
  id: string;
  type: ActivityType | string;
  details: ActivityDetails;
  createdAt: string;
  member?: {
    firstName: string;
    lastName: string;
  } | null;
}

function getActivityDisplay(
  activity: Activity,
  t: Translator,
): { icon: LucideIcon; color: string; text: string } {
  const { type, details } = activity;

  switch (type) {
    case "CREATED":
      return {
        icon: Plus,
        color: "bg-success-soft text-success-soft-foreground",
        text: t("tasks.detail.activity.createdTask", {
          title: details.title || "",
        }),
      };
    case "UPDATED": {
      const newPriority =
        details.newPriority ??
        (details.changes as { priority?: string } | undefined)?.priority;
      if (newPriority) {
        const label = PRIORITY_CONFIG[
          newPriority as keyof typeof PRIORITY_CONFIG
        ]?.labelKey
          ? t(
              PRIORITY_CONFIG[newPriority as keyof typeof PRIORITY_CONFIG]
                .labelKey,
            )
          : newPriority;
        return {
          icon: Edit,
          color: "bg-info-soft text-info-soft-foreground",
          text: t("tasks.detail.activity.changedPriorityTo", {
            priority: label,
          }),
        };
      }
      return {
        icon: Edit,
        color: "bg-info-soft text-info-soft-foreground",
        text: t("tasks.detail.activity.updatedTask"),
      };
    }
    case "MOVED":
      return {
        icon: MoveRight,
        color: "bg-info-soft text-info-soft-foreground",
        text: t("tasks.detail.activity.movedTask"),
      };
    case "COMMENTED":
      return {
        icon: MessageSquare,
        color: "bg-info-soft text-info-soft-foreground",
        text: t("tasks.detail.activity.addedComment"),
      };
    case "ATTACHMENT_ADDED":
      return {
        icon: Paperclip,
        color: "bg-warning-soft text-warning-soft-foreground",
        text: t("tasks.detail.activity.attachedFile", {
          fileName: details.fileName || "",
        }),
      };
    case "ATTACHMENT_REMOVED":
      return {
        icon: Trash2,
        color: "bg-danger-soft text-danger-soft-foreground",
        text: t("tasks.detail.activity.removedFile", {
          fileName: details.fileName || "",
        }),
      };
    case "ASSIGNEE_ADDED":
      return {
        icon: UserPlus,
        color: "bg-success-soft text-success-soft-foreground",
        text: t("tasks.detail.activity.addedAssignee", {
          name: details.assigneeName || "",
        }),
      };
    case "ASSIGNEE_REMOVED":
      return {
        icon: UserMinus,
        color: "bg-warning-soft text-warning-soft-foreground",
        text: t("tasks.detail.activity.removedAssignee", {
          name: details.assigneeName || "",
        }),
      };
    case "TAG_ADDED":
      return {
        icon: Tag,
        color: "bg-info-soft text-info-soft-foreground",
        text: t("tasks.detail.activity.addedTag", {
          tagName: details.tagName || "",
        }),
      };
    case "TAG_REMOVED":
      return {
        icon: Tag,
        color: "bg-neutral-soft text-neutral-soft-foreground",
        text: t("tasks.detail.activity.removedTag", {
          tagName: details.tagName || "",
        }),
      };
    case "CHECKLIST_ADDED":
      return {
        icon: CheckSquare,
        color: "bg-success-soft text-success-soft-foreground",
        text: t("tasks.detail.activity.createdChecklist", {
          checklistName: details.checklistName || "",
        }),
      };
    case "CHECKLIST_ITEM_COMPLETED":
      return {
        icon: CheckCircle,
        color: "bg-success-soft text-success-soft-foreground",
        text: t("tasks.detail.activity.completedChecklistItem", {
          itemName: details.itemName || "",
        }),
      };
    case "PRIORITY_CHANGED":
      return {
        icon: AlertCircle,
        color: "bg-warning-soft text-warning-soft-foreground",
        text: t("tasks.detail.activity.changedPriority"),
      };
    case "DUE_DATE_CHANGED":
      return {
        icon: Calendar,
        color: "bg-danger-soft text-danger-soft-foreground",
        text: t("tasks.detail.activity.changedDueDate"),
      };
    default:
      return {
        icon: Clock,
        color: "bg-neutral-soft text-neutral-soft-foreground",
        text: type.toLowerCase().replace(/_/g, " "),
      };
  }
}

export function TaskDetailModal({
  task,
  boardId,
  open,
  onOpenChange,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [newComment, setNewComment] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState(task?.description || "");

  // Синхронизация description при смене task
  useEffect(() => {
    setDescription(task?.description || "");
  }, [task?.id, task?.description]);

  // Mutations
  const updateTask = useUpdateTask();

  // Queries
  const { data: comments, isLoading: commentsLoading } = useCommentsQuery(
    task?.id,
    open && activeTab === "comments",
  );
  const { data: attachments, isLoading: attachmentsLoading } =
    useAttachmentsQuery(task?.id, open && activeTab === "attachments");
  const { data: activities, isLoading: activitiesLoading } =
    useTaskActivitiesQuery(
      task?.id,
      undefined,
      open && activeTab === "history",
    );

  // Mutations
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const addAttachment = useAddAttachment();
  const deleteAttachment = useDeleteAttachment();

  if (!task) return null;

  const priorityConfig =
    PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ||
    PRIORITY_CONFIG.MEDIUM;

  const handleAddComment = () => {
    if (!newComment.trim() || !task.id) return;
    addComment.mutate(
      {
        taskId: task.id,
        data: { content: newComment.trim() },
      },
      {
        onSuccess: () => {
          setNewComment("");
          toast.success(t("tasks.detail.commentAdded"));
          if (boardId) {
            queryClient.invalidateQueries({
              queryKey: boardsKeys.detail(boardId),
            });
          }
        },
        onError: (err) =>
          toast.error(
            err instanceof Error
              ? err.message
              : t("tasks.detail.commentAddError"),
          ),
      },
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !task.id) return;

    if (!isAllowedAttachmentType(file)) {
      toast.error(t("tasks.detail.attachmentTypeError"));
      return;
    }

    addAttachment.mutate(
      { taskId: task.id, file },
      {
        onSuccess: () => {
          toast.success(t("tasks.detail.attachmentUploaded"));
          if (boardId) {
            queryClient.invalidateQueries({
              queryKey: boardsKeys.detail(boardId),
            });
          }
        },
        onError: (err: ApiError) =>
          toast.error(err?.message || t("tasks.detail.attachmentUploadError")),
      },
    );
  };

  const handleSaveDescription = () => {
    if (!boardId || !task.id || description === (task.description || "")) {
      setIsEditingDescription(false);
      return;
    }
    updateTask.mutate(
      { boardId, taskId: task.id, data: { description } },
      {
        onSuccess: (data) => {
          setIsEditingDescription(false);
          onTaskUpdated?.({ ...task, description: data.description });
          queryClient.invalidateQueries({
            queryKey: boardsKeys.detail(boardId),
          });
        },
        onError: (err) =>
          toast.error(
            err instanceof Error
              ? err.message
              : t("tasks.detail.descriptionSaveError"),
          ),
      },
    );
  };

  const handlePriorityChange = (value: string) => {
    if (!boardId || !task.id) return;
    updateTask.mutate(
      {
        boardId,
        taskId: task.id,
        data: { priority: value as BoardTask["priority"] },
      },
      {
        onSuccess: (data) => {
          onTaskUpdated?.({ ...task, priority: data.priority });
          queryClient.invalidateQueries({
            queryKey: boardsKeys.detail(boardId),
          });
        },
        onError: (err) =>
          toast.error(
            err instanceof Error
              ? err.message
              : t("tasks.detail.priorityChangeError"),
          ),
      },
    );
  };

  const formatDate = (date: string) => {
    return formatDateTime(date, locale);
  };

  const getFileIcon = (filename?: string) => {
    if (!filename) return File;
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return Image;
    if (["pdf", "doc", "docx", "txt"].includes(ext || "")) return FileText;
    return File;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <div className="flex h-full max-h-[90vh]">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl font-semibold mb-2">
                    {task.title}
                  </DialogTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", priorityConfig.color)}
                    >
                      {t(priorityConfig.labelKey)}
                    </Badge>
                    {task.type && (
                      <Badge variant="secondary" className="text-xs">
                        {task.type}
                      </Badge>
                    )}
                    {task.dueDate && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.dueDate)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="mx-6 mt-4 justify-start bg-muted">
                <TabsTrigger value="details" className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  {t("tasks.detail.tabs.details")}
                </TabsTrigger>
                <TabsTrigger value="comments" className="gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  {t("tasks.detail.tabs.comments")}
                  {task.commentsCount > 0 && (
                    <span className="ml-1 text-xs bg-muted px-1.5 rounded">
                      {task.commentsCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="attachments" className="gap-1.5">
                  <Paperclip className="h-4 w-4" />
                  {t("tasks.detail.tabs.files")}
                  {task.attachmentsCount > 0 && (
                    <span className="ml-1 text-xs bg-muted px-1.5 rounded">
                      {task.attachmentsCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5">
                  <History className="h-4 w-4" />
                  {t("tasks.detail.tabs.history")}
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-6">
                  {/* Details Tab */}
                  <TabsContent value="details" className="mt-0 space-y-6">
                    {/* Description */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {t("tasks.fields.description")}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setIsEditingDescription(!isEditingDescription)
                          }
                        >
                          {isEditingDescription
                            ? t("actions.cancel")
                            : t("actions.edit")}
                        </Button>
                      </div>
                      {isEditingDescription ? (
                        <div className="space-y-2">
                          <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t(
                              "tasks.detail.descriptionPlaceholder",
                            )}
                            rows={6}
                            className="resize-none"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveDescription}
                            disabled={updateTask.isPending}
                          >
                            {updateTask.isPending
                              ? t("tasks.form.saving")
                              : t("actions.save")}
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-muted rounded-lg p-4 min-h-[100px]">
                          {task.description ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {task.description}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              {t("tasks.detail.noDescription")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Checklist Progress */}
                    {task.checklistProgress &&
                      task.checklistProgress.total > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            {t("tasks.detail.checklist")}
                          </h4>
                          <div className="bg-muted rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                                {t("tasks.detail.checklistProgress", {
                                  completed: task.checklistProgress.completed,
                                  total: task.checklistProgress.total,
                                })}
                              </span>
                              <span className="text-sm font-medium">
                                {Math.round(
                                  (task.checklistProgress.completed /
                                    task.checklistProgress.total) *
                                    100,
                                )}
                                %
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-success transition"
                                style={{
                                  width: `${(task.checklistProgress.completed / task.checklistProgress.total) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {t("common.tags.manage")}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              style={{
                                backgroundColor: `${tag.color}20`,
                                borderColor: tag.color,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assignees */}
                    {task.assignees && task.assignees.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t("tasks.detail.assignees")}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {task.assignees.map((assignee) => (
                            <div
                              key={assignee.id}
                              className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5"
                            >
                              {assignee.avatar ? (
                                <img
                                  src={assignee.avatar}
                                  alt={`${assignee.firstName} ${assignee.lastName}`}
                                  className="h-6 w-6 rounded-full"
                                />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-brand-soft text-brand-soft-foreground flex items-center justify-center text-xs font-bold">
                                  {assignee.firstName.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm">
                                {assignee.firstName} {assignee.lastName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <h4 className="text-xs text-muted-foreground mb-1">
                          {t("tasks.activity.created")}
                        </h4>
                        <p className="text-sm">{formatDate(task.createdAt)}</p>
                      </div>
                      {task.updatedAt && (
                        <div>
                          <h4 className="text-xs text-muted-foreground mb-1">
                            {t("tasks.activity.updated")}
                          </h4>
                          <p className="text-sm">
                            {formatDate(task.updatedAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Comments Tab */}
                  <TabsContent value="comments" className="mt-0 space-y-4">
                    {/* Add Comment */}
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("tasks.detail.commentPlaceholder")}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && !e.shiftKey && handleAddComment()
                        }
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        aria-label={t("actions.submit")}
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || addComment.isPending}
                      >
                        {addComment.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Comments List */}
                    {commentsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-16 w-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : comments && comments.length > 0 ? (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 group">
                            <div className="h-8 w-8 rounded-full bg-brand-soft text-brand-soft-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {comment.author?.firstName?.charAt(0) ||
                                t("tasks.detail.organizerInitial")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">
                                  {[
                                    comment.author?.firstName,
                                    comment.author?.lastName,
                                  ]
                                    .filter(Boolean)
                                    .join(" ") || t("tasks.detail.organizer")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(comment.createdAt)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={t("actions.delete")}
                                  className="h-9 w-9 opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-visible:opacity-100 transition-opacity ml-auto"
                                  onClick={() =>
                                    deleteComment.mutate({
                                      taskId: task.id,
                                      commentId: comment.id,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>{t("tasks.detail.noComments")}</p>
                        <p className="text-sm">
                          {t("tasks.detail.noCommentsHint")}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Attachments Tab */}
                  <TabsContent value="attachments" className="mt-0 space-y-4">
                    {/* Upload Button */}
                    <div>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                        onChange={handleFileUpload}
                      />
                      <Button asChild variant="outline" className="w-full">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Plus className="h-4 w-4 mr-2" />
                          {t("tasks.detail.uploadFile")}
                        </label>
                      </Button>
                    </div>

                    {/* Attachments List */}
                    {attachmentsLoading ? (
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : attachments && attachments.length > 0 ? (
                      <div className="space-y-2">
                        {attachments.map((attachment) => {
                          const fileName =
                            attachment.fileName ||
                            attachment.filename ||
                            t("tasks.detail.file");
                          const rawUrl = attachment.fileUrl || attachment.url;
                          const fileUrl =
                            getMediaUrl(rawUrl) ||
                            (rawUrl?.startsWith("/")
                              ? `${API_BASE_URL.replace(/\/$/, "")}${rawUrl}`
                              : rawUrl) ||
                            "#";
                          const fileSize =
                            attachment.fileSize || attachment.size || 0;
                          const FileIcon = getFileIcon(fileName);
                          return (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-3 p-3 bg-muted rounded-lg group"
                            >
                              <FileIcon className="h-8 w-8 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {fileName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {attachment.uploadedBy
                                    ? `${attachment.uploadedBy.firstName} ${attachment.uploadedBy.lastName}`
                                    : t("tasks.detail.organizerAdmin")}{" "}
                                  • {(fileSize / 1024).toFixed(1)} KB •{" "}
                                  {formatDate(attachment.createdAt)}
                                </p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                {fileUrl && fileUrl !== "#" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t("actions.download")}
                                    className="h-9 w-9"
                                    asChild
                                  >
                                    <a
                                      href={fileUrl}
                                      download={fileName}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={t("actions.delete")}
                                  className="h-9 w-9"
                                  onClick={() =>
                                    deleteAttachment.mutate({
                                      taskId: task.id,
                                      attachmentId: attachment.id,
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>{t("tasks.detail.noFiles")}</p>
                        <p className="text-sm">
                          {t("tasks.detail.noFilesHint")}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history" className="mt-0">
                    {activitiesLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-48" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : activities && activities.length > 0 ? (
                      <div className="space-y-4">
                        {activities.map((activity) => {
                          // Преобразуем TaskActivity в Activity формат (API: type CREATED/UPDATED/COMMENTED, metadata=details)
                          const activityForDisplay: Activity = {
                            id: activity.id,
                            type: (typeof activity.type === "string"
                              ? activity.type
                                  .toUpperCase()
                                  .replace(/^TASK_/, "")
                                  .replace(/COMMENT_ADDED/, "COMMENTED")
                              : String(activity.type)) as ActivityType,
                            details: (activity.metadata ||
                              {}) as ActivityDetails,
                            createdAt: activity.createdAt,
                            member: activity.member
                              ? {
                                  firstName: activity.member.firstName,
                                  lastName: activity.member.lastName,
                                }
                              : null,
                          };
                          const {
                            icon: ActivityIcon,
                            color,
                            text,
                          } = getActivityDisplay(activityForDisplay, t);
                          return (
                            <div key={activity.id} className="flex gap-3">
                              <div
                                className={cn(
                                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                                  color,
                                )}
                              >
                                <ActivityIcon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">
                                  {activity.member ? (
                                    <span className="font-medium">
                                      {activity.member.firstName}{" "}
                                      {activity.member.lastName}
                                    </span>
                                  ) : (
                                    <span className="font-medium text-muted-foreground">
                                      {t("tasks.detail.organizerAdmin")}
                                    </span>
                                  )}{" "}
                                  {text}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(activity.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>{t("tasks.detail.noHistory")}</p>
                        <p className="text-sm">
                          {t("tasks.detail.noHistoryHint")}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="w-64 border-l bg-muted p-4 space-y-4 hidden lg:block">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                {t("tasks.fields.status")}
              </h4>
              <Badge variant="outline" className="w-full justify-center">
                {t("tasks.status.inProgress")}
              </Badge>
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                {t("tasks.fields.priority")}
              </h4>
              <Select
                value={task.priority}
                onValueChange={handlePriorityChange}
                disabled={!boardId || updateTask.isPending}
              >
                <SelectTrigger className={cn("w-full", priorityConfig.color)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {task.dueDate && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  {t("tasks.detail.dueDate")}
                </h4>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(task.dueDate)}
                </div>
              </div>
            )}

            {task.estimatedHours && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  {t("tasks.fields.estimatedHours")}
                </h4>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {t("tasks.detail.hoursShort", { hours: task.estimatedHours })}
                </div>
              </div>
            )}

            {task.assignees && task.assignees.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  {t("tasks.detail.assignees")}
                </h4>
                <div className="space-y-2">
                  {task.assignees.map((assignee) => (
                    <div key={assignee.id} className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-brand-soft text-brand-soft-foreground flex items-center justify-center text-xs font-bold">
                        {assignee.firstName.charAt(0)}
                      </div>
                      <span className="text-sm truncate">
                        {assignee.firstName} {assignee.lastName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
