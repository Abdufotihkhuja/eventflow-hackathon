/**
 * @page /blog/[slug]/not-found
 * @description Страница 404 для несуществующих статей блога
 */

import { LocalizedLink as Link } from "@shared/ui/localized-link";

export default function NotFound(): React.JSX.Element {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 text-6xl font-bold text-ink-400">404</h1>
      <h2 className="mb-4 text-2xl font-semibold text-ink-200">
        Статья не найдена
      </h2>
      <p className="mb-8 text-ink-100">
        К сожалению, запрашиваемая статья не существует или была удалена.
      </p>
      <div className="flex gap-4">
        <Link
          href="/blog"
          className="rounded-full bg-ink-400 px-6 py-3 font-semibold text-white transition-all hover:bg-ink-300"
        >
          Вернуться к блогу
        </Link>
        <Link
          href="/"
          className="rounded-full border-2 border-bone-400 px-6 py-3 font-semibold text-ink-400 transition-all hover:border-ink-400"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
