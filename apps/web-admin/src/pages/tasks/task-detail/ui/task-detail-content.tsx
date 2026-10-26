/**
 * Основной контент страницы задачи
 * Описание, чеклисты, комментарии с премиум UI
 */

import { useState } from 'react'
import { Button, Card, Textarea, Avatar, AvatarFallback, AvatarImage } from '@shared/ui'
import {
  CheckSquare,
  MessageSquare,
  FileText,
  Plus,
  Send,
  ChevronDown,
  ChevronRight,
  Smile,
  Paperclip,
  AtSign,
} from 'lucide-react'
import { cn } from '@shared/lib'
import type { Task } from '@entities/task'
import { TaskTimelineActivity } from './task-timeline-activity'

interface TaskDetailContentProps {
  task: Task
}

export function TaskDetailContent({ task }: TaskDetailContentProps) {
  const [newComment, setNewComment] = useState('')
  const [expandedChecklists, setExpandedChecklists] = useState<string[]>(
    task.checklists.map(c => c.id)
  )

  const toggleChecklist = (id: string) => {
    setExpandedChecklists(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card className="overflow-hidden border border-border shadow-soft bg-card">
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Описание</h2>
            </div>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <Plus className="h-4 w-4" />
              Редактировать
            </Button>
          </div>

          {task.description ? (
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {task.description}
              </p>
            </div>
          ) : (
            <div className="py-8 text-center border-2 border-dashed border-border rounded-xl">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-3">Описание не добавлено</p>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Добавить описание
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Checklists */}
      {task.checklists.length > 0 && (
        <Card className="overflow-hidden border border-border shadow-soft bg-card">
          <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft">
                  <CheckSquare className="h-5 w-5 text-success-soft-foreground" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  Чек-листы
                </h2>
              </div>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <Plus className="h-4 w-4" />
                Добавить
              </Button>
            </div>

            <div className="space-y-5">
              {task.checklists.map(checklist => {
                const completed = checklist.items.filter(item => item.completed).length
                const total = checklist.items.length
                const progress = (completed / total) * 100
                const isExpanded = expandedChecklists.includes(checklist.id)

                return (
                  <div
                    key={checklist.id}
                    className="rounded-xl border border-border overflow-hidden"
                  >
                    {/* Checklist Header */}
                    <button
                      onClick={() => toggleChecklist(checklist.id)}
                      className="w-full flex items-center justify-between p-4 bg-muted hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-semibold text-foreground">
                          {checklist.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition duration-500',
                              progress === 100 ? 'bg-success' : 'bg-info'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            'text-sm font-medium min-w-[50px] text-right',
                            progress === 100
                              ? 'text-success'
                              : 'text-muted-foreground'
                          )}
                        >
                          {completed}/{total}
                        </span>
                      </div>
                    </button>

                    {/* Checklist Items */}
                    {isExpanded && (
                      <div className="p-4 space-y-1">
                        {checklist.items.map(item => (
                          <label
                            key={item.id}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors group"
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => {}}
                              className="mt-0.5 h-5 w-5 rounded-md border-2 border-border text-primary focus-visible:ring-ring cursor-pointer"
                            />
                            <span
                              className={cn(
                                'flex-1 text-sm transition',
                                item.completed
                                  ? 'text-muted-foreground line-through'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {item.text}
                            </span>
                          </label>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-muted-foreground hover:text-muted-foreground"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Добавить пункт
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Comments Section */}
      <Card className="overflow-hidden border border-border shadow-soft bg-card">
        <div className="p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-soft">
              <MessageSquare className="h-5 w-5 text-info-soft-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Комментарии
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({task.commentsCount})
              </span>
            </h2>
          </div>

          {/* New Comment Input */}
          <div className="flex gap-3 mb-6">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src="" />
              <AvatarFallback className="bg-brand-soft text-brand-soft-foreground text-sm font-bold">
                ВЫ
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="rounded-xl border border-border bg-muted overflow-hidden focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 transition">
                <Textarea
                  placeholder="Напишите комментарий..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="min-h-[80px] border-0 bg-transparent resize-none focus-visible:ring-0 text-sm"
                />
                <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-card">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label="Эмодзи" className="h-9 w-9 rounded-lg">
                      <Smile className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Прикрепить файл" className="h-9 w-9 rounded-lg">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Упомянуть" className="h-9 w-9 rounded-lg">
                      <AtSign className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <Button size="sm" disabled={!newComment.trim()} className="gap-2 rounded-lg">
                    <Send className="h-4 w-4" />
                    Отправить
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List */}
          {task.commentsCount > 0 ? (
            <div className="space-y-4">
              {/* Mock Comments */}
              <CommentItem
                author="Алексей Смирнов"
                avatar=""
                content="Отличная работа! Осталось только добавить валидацию форм и можно отправлять на ревью."
                time="2 часа назад"
              />
              <CommentItem
                author="Мария Петрова"
                avatar=""
                content="Я добавила несколько комментариев к коду, посмотри пожалуйста."
                time="вчера"
              />
            </div>
          ) : (
            <div className="py-8 text-center border-2 border-dashed border-border rounded-xl">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Комментариев пока нет</p>
              <p className="text-sm text-muted-foreground mt-1">
                Будьте первым, кто оставит комментарий
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Activity Timeline */}
      <TaskTimelineActivity task={task} />
    </div>
  )
}

// Comment Item Component
interface CommentItemProps {
  author: string
  avatar: string
  content: string
  time: string
}

function CommentItem({ author, avatar, content, time }: CommentItemProps) {
  return (
    <div className="flex gap-3 p-4 rounded-xl bg-muted">
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarImage src={avatar} />
        <AvatarFallback className="bg-brand-soft text-brand-soft-foreground text-xs font-bold">
          {author
            .split(' ')
            .map(n => n[0])
            .join('')}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-foreground">{author}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <p className="text-sm text-muted-foreground">{content}</p>
      </div>
    </div>
  )
}
