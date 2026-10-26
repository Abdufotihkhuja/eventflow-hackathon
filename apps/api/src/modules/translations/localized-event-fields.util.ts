import { resolveLocalizedBusinessField } from './localized-business-field.util';

type AnyRecord = Record<string, any>;

export interface LocalizedEventBusinessFields {
  title: string;
  shortDescription: string | null;
  venue: string | null;
  city: string | null;
  organizationName: string;
}

/**
 * Резолвит локализованные бизнес-поля события и его организации в выбранную
 * локаль с фолбэком на скалярные значения.
 *
 * Работает поверх той же `resolveLocalizedBusinessField`, что и
 * `public.service.localizePublicEvent`, поэтому результат идентичен тому,
 * что отдают публичные эндпоинты — пользователь увидит один и тот же перевод
 * на /events/[slug] и на /profile/events.
 *
 * Ожидает, что переданный event содержит `translations` и
 * (опционально) `organization.translations` — repository должен их выбирать.
 */
export function localizeEventBusinessFields(
  event: AnyRecord | null | undefined,
  locale?: string,
): LocalizedEventBusinessFields {
  const e = (event ?? {}) as AnyRecord;
  const organization = (e.organization ?? {}) as AnyRecord;

  const orgFallback = organization.companyName || organization.name || '';
  const localizedOrgName =
    resolveLocalizedBusinessField(
      organization.translations,
      'companyName',
      locale,
      orgFallback,
    ) ||
    resolveLocalizedBusinessField(
      organization.translations,
      'name',
      locale,
      orgFallback,
    ) ||
    orgFallback;

  return {
    title:
      resolveLocalizedBusinessField(
        e.translations,
        'title',
        locale,
        typeof e.title === 'string' ? e.title : '',
      ) || (typeof e.title === 'string' ? e.title : ''),
    shortDescription:
      resolveLocalizedBusinessField(
        e.translations,
        'shortDescription',
        locale,
        typeof e.shortDescription === 'string' ? e.shortDescription : null,
      ) || null,
    venue:
      resolveLocalizedBusinessField(
        e.translations,
        'venue',
        locale,
        typeof e.venue === 'string' ? e.venue : null,
      ) || null,
    city:
      resolveLocalizedBusinessField(
        e.translations,
        'city',
        locale,
        typeof e.city === 'string' ? e.city : null,
      ) || null,
    organizationName: localizedOrgName,
  };
}
