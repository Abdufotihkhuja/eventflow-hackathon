/**
 * Empty state для блога
 * @module features/blog/ui/blog-empty-state
 */

import { Link } from "react-router-dom";
import { FileText, PenLine, TrendingUp, Users } from "lucide-react";
import { Button } from "@shared/ui";

type BlogEmptyStateProps = {
  variant?: "my-blog" | "public-blog" | "saved-blog";
};

export function BlogEmptyState({ variant = "public-blog" }: BlogEmptyStateProps) {
  if (variant === "my-blog") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="max-w-md text-center space-y-6">
          {/* Icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-primary/10 rounded-full" />
            <div className="relative flex items-center justify-center w-full h-full">
              <FileText className="h-12 w-12 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold">Начните делиться знаниями</h3>
            <p className="text-muted-foreground text-lg">
              Создайте свою первую статью и расскажите миру о вашем опыте
              организации мероприятий
            </p>
          </div>

          {/* Features */}
          <div className="grid gap-3 text-sm text-left">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <PenLine className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Rich Text редактор</p>
                <p className="text-muted-foreground text-xs">
                  Изображения, таблицы, форматирование
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Аналитика и статистика</p>
                <p className="text-muted-foreground text-xs">
                  Просмотры, лайки, комментарии
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Модерация и публикация</p>
                <p className="text-muted-foreground text-xs">
                  Контроль качества контента
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Link to="/my-blog/new">
            <Button size="lg" className="w-full shadow-lg shadow-primary/20">
              <FileText className="mr-2 h-5 w-5" />
              Создать первую статью
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (variant === "saved-blog") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="max-w-md text-center space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-warning-soft rounded-full" />
            <div className="relative flex items-center justify-center w-full h-full">
              <svg
                className="h-12 w-12 text-warning"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-bold">Нет сохранённых статей</h3>
            <p className="text-muted-foreground text-lg">
              Сохраняйте интересные статьи, чтобы вернуться к ним позже
            </p>
          </div>

          <Link to="/blog">
            <Button variant="outline" size="lg">
              Перейти к блогу
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="max-w-md text-center space-y-6">
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-muted rounded-full" />
          <div className="relative flex items-center justify-center w-full h-full">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-2xl font-bold">Статей пока нет</h3>
          <p className="text-muted-foreground text-lg">
            Скоро здесь появится интересный контент от организаторов мероприятий
          </p>
        </div>
      </div>
    </div>
  );
}
