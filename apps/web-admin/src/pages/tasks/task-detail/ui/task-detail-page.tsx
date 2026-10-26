/**
 * Страница детальной информации о задаче
 * Премиум дизайн в стиле Linear/Notion
 */

import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button, Card, Badge } from '@shared/ui'
import {
  ArrowLeft,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Star,
  MoreHorizontal,
} from 'lucide-react'
import { MOCK_TASKS, MOCK_BOARDS } from '../../boards/lib'
import { TaskDetailHeader } from './task-detail-header'
import { TaskDetailContent } from './task-detail-content'
import { TaskDetailSidebar } from './task-detail-sidebar'

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()

  const task = useMemo(() => {
    return MOCK_TASKS.find(t => t.id === taskId)
  }, [taskId])

  const board = useMemo(() => {
    if (!task) return null
    return MOCK_BOARDS.find(b => b.id === task.boardId)
  }, [task])

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 border border-border shadow-soft-lg bg-card">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-danger-soft mb-6">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">
              Задача не найдена
            </h3>
            <p className="text-muted-foreground mb-8">
              Возможно, задача была удалена или у вас нет доступа к ней.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <Button onClick={() => navigate('/tasks/boards')}>К доскам</Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Navigation */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Назад"
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              {/* Breadcrumbs */}
              <nav className="hidden sm:flex items-center gap-2 text-sm">
                <Link
                  to="/tasks/boards"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Доски
                </Link>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                {board && (
                  <>
                    <Link
                      to={`/tasks/boards/${board.id}`}
                      className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: board.color }}
                      />
                      {board.title}
                    </Link>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
                <span className="font-medium text-foreground truncate max-w-[200px]">
                  {task.title}
                </span>
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="hidden md:flex gap-1.5 py-1 px-2.5 rounded-lg bg-muted border-border"
              >
                <span className="text-muted-foreground">ID:</span>
                <code className="font-mono text-foreground">TASK-{task.id}</code>
              </Badge>

              <Button variant="ghost" size="icon" aria-label="Избранное" className="h-9 w-9 rounded-lg">
                <Star className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Открыть в новой вкладке" className="h-9 w-9 rounded-lg">
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Действия" className="h-9 w-9 rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <TaskDetailHeader task={task} board={board ?? null} />
            <TaskDetailContent task={task} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <TaskDetailSidebar task={task} board={board ?? null} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default TaskDetailPage
