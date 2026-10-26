/**
 * Фильтры для задач
 */

import { useState } from 'react'
import { Button } from '@shared/ui/shadcn/button'
import { Input } from '@shared/ui/shadcn/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/shadcn/select'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/shadcn/popover'
import { Label } from '@shared/ui/shadcn/label'
import {
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  getTaskTypeLabel,
  getTaskPriorityLabel,
  getTaskStatusLabel,
  type TaskFilters,
} from '@entities/task'
import { Filter, Search, X } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

interface TaskFiltersProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
}

export function TaskFiltersComponent({ filters, onFiltersChange }: TaskFiltersProps) {
  const t = useT()
  const [searchValue, setSearchValue] = useState(filters.search || '')

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    onFiltersChange({ ...filters, search: value || undefined })
  }

  const clearFilters = () => {
    setSearchValue('')
    onFiltersChange({ boardId: filters.boardId })
  }

  const hasActiveFilters =
    filters.status?.length ||
    filters.priority?.length ||
    filters.type?.length ||
    filters.assigneeId ||
    filters.search

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Поиск */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('tasks.filters.searchPlaceholder')}
          value={searchValue}
          onChange={e => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Фильтры */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            {t('tasks.filters.title')}
            {hasActiveFilters && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                !
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{t('tasks.filters.title')}</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-0 text-xs"
                >
                  <X className="mr-1 h-3 w-3" />
                  {t('actions.clear')}
                </Button>
              )}
            </div>

            {/* Статус */}
            <div className="space-y-2">
              <Label>{t('tasks.fields.status')}</Label>
              <Select
                value={filters.status?.[0] || ''}
                onValueChange={value =>
                  onFiltersChange({
                    ...filters,
                    status: value
                      ? [value as (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES]]
                      : undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('tasks.filters.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('tasks.filters.allStatuses')}</SelectItem>
                  {Object.values(TASK_STATUSES).map(status => (
                    <SelectItem key={status} value={status}>
                      {getTaskStatusLabel(t)(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Приоритет */}
            <div className="space-y-2">
              <Label>{t('tasks.fields.priority')}</Label>
              <Select
                value={filters.priority?.[0] || ''}
                onValueChange={value =>
                  onFiltersChange({
                    ...filters,
                    priority: value
                      ? [value as (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES]]
                      : undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('tasks.filters.allPriorities')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('tasks.filters.allPriorities')}</SelectItem>
                  {Object.values(TASK_PRIORITIES).map(priority => (
                    <SelectItem key={priority} value={priority}>
                      {getTaskPriorityLabel(t)(priority)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Тип */}
            <div className="space-y-2">
              <Label>{t('tasks.fields.type')}</Label>
              <Select
                value={filters.type?.[0] || ''}
                onValueChange={value =>
                  onFiltersChange({
                    ...filters,
                    type: value
                      ? [value as (typeof TASK_TYPES)[keyof typeof TASK_TYPES]]
                      : undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('tasks.filters.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('tasks.filters.allTypes')}</SelectItem>
                  {Object.values(TASK_TYPES).map(type => (
                    <SelectItem key={type} value={type}>
                      {getTaskTypeLabel(t)(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
