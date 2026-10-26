function normalizeOrigin(rawUrl: string | undefined, fallback: string): string {
  const url = rawUrl?.trim() || fallback;
  return url.replace(/\/+$/, "");
}

export const organizerAppUrl = normalizeOrigin(
  process.env.NEXT_PUBLIC_APP_URL,
  "https://app.eventflow.uz"
);

export const organizerLoginUrl = `${organizerAppUrl}/login`;

/**
 * Ссылка на вход в рабочее пространство из личного кабинета.
 *
 * Приложения живут на разных origin и не делят сессию, поэтому по голой ссылке
 * человека встречал пустой логин без объяснений. Тот же handoff, что и на
 * странице входа: workspace подставит email и покажет «Продолжите в кабинете
 * организации» вместо обычного «Добро пожаловать».
 */
export function workspaceEntryUrl(email?: string | null): string {
  const destination = new URL(organizerLoginUrl);
  if (email?.trim()) {
    destination.searchParams.set("email", email.trim());
    destination.searchParams.set("source", "public-login");
  }
  return destination.toString();
}
