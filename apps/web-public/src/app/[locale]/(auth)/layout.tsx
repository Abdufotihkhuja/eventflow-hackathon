import type { ReactNode } from "react";

/**
 * Layout для страниц аутентификации.
 *
 * Минимальный визуал: лёгкая «теплая» подложка сверху, без декоративных
 * градиентных blob-ов и grid-pattern. Декор смотрелся как «AI-generated» и
 * особенно на мобильных вызывал лишний overflow / визуальный шум.
 */
export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Едва заметная заливка сверху, как у landing */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "linear-gradient(180deg, var(--ember-50) 0%, rgba(255,255,255,0) 100%)",
        }}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </main>
  );
}
