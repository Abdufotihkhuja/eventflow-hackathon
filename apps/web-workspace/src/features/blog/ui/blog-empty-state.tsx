/**
 * Empty state для блога
 * @module features/blog/ui/blog-empty-state
 */

import { Link } from 'react-router-dom'
import { Bookmark, FileText } from 'lucide-react'
import { EmptyState } from '@shared/ui'

type BlogEmptyStateProps = {
  variant?: 'my-blog' | 'public-blog' | 'saved-blog'
}

export function BlogEmptyState({ variant = 'public-blog' }: BlogEmptyStateProps) {
  if (variant === 'my-blog') {
    return (
      <EmptyState
        icon={FileText}
        title="Начните делиться знаниями"
        description="Создайте свою первую статью и расскажите миру о вашем опыте организации мероприятий."
        action={{
          label: 'Создать первую статью',
          asChild: true,
          children: (
            <Link to="/my-blog/new">
              <FileText className="mr-2 h-4 w-4" />
              Создать первую статью
            </Link>
          ),
        }}
        className="py-16"
      />
    )
  }

  if (variant === 'saved-blog') {
    return (
      <EmptyState
        icon={Bookmark}
        title="Нет сохранённых статей"
        description="Сохраняйте интересные статьи, чтобы вернуться к ним позже."
        action={{
          label: 'Перейти к блогу',
          variant: 'outline',
          asChild: true,
          children: <Link to="/blog">Перейти к блогу</Link>,
        }}
        className="py-16"
      />
    )
  }

  return (
    <EmptyState
      icon={FileText}
      title="Статей пока нет"
      description="Скоро здесь появится интересный контент от организаторов мероприятий."
      className="py-16"
    />
  )
}
