import type { Translator } from "@eventflow/i18n";

export function formatPublicEventCount(t: Translator, count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  const key =
    mod10 === 1 && mod100 !== 11
      ? "public.events.count.one"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "public.events.count.few"
        : "public.events.count.other";

  return t(key, { count });
}
