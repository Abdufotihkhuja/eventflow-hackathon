/**
 * Матрица преференсов уведомлений (BL-21) — per-key × канал push/email.
 *
 * Источник истины — сервер: GET отдаёт ПОЛНУЮ матрицу (включая locked-строку
 * `transactional`), клиент никогда не мёржит дефолты сам (CONTRACT_DIFF §2).
 * PATCH шлёт только изменённую ячейку `{key, channel, enabled}` и получает в
 * ответ полную матрицу — ею и перезаписываем кэш. Тумблер переключается
 * оптимистично: снимок → правка кэша → rollback при ошибке — тот же паттерн,
 * что у `optimisticRead` рядом в ./api и у модерации заявок.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { accountSdk } from "@shared/api";

export type PreferenceChannel = "push" | "email";

/** Ключи матрицы (контрактный enum `PreferenceKey`, аддитивно расширяемый). */
export type PreferenceKey =
  | "event_reminders"
  | "saved_event_alerts"
  | "registration_status"
  | "summary"
  | "organizer_registrations"
  | "organizer_broadcast";

export interface PreferenceRow {
  /** `transactional` — псевдо-строка GET-ответа: показывается с замком,
   *  в PATCH её слать нельзя (сервер ответит 400). */
  key: PreferenceKey | "transactional";
  push: boolean;
  email: boolean;
  locked: boolean;
}

export interface PreferenceChange {
  key: PreferenceKey;
  channel: PreferenceChannel;
  enabled: boolean;
}

export const preferenceKeys = {
  matrix: ["notification-preferences"] as const,
};

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: preferenceKeys.matrix,
    queryFn: async (): Promise<PreferenceRow[]> => {
      const res = await accountSdk.notificationPreferences.getMatrix();
      return ((res as { preferences?: PreferenceRow[] } | undefined)?.preferences ?? []);
    },
  });
}

/** Чистая правка матрицы — вынесена из мутации ради тестов. Locked-строки не
 *  трогаем даже при совпадении ключа: их состояние диктует сервер. */
export function applyPreferenceChange(
  rows: PreferenceRow[],
  change: PreferenceChange,
): PreferenceRow[] {
  return rows.map((row) =>
    row.key === change.key && !row.locked ? { ...row, [change.channel]: change.enabled } : row,
  );
}

type PreferenceSnapshot = PreferenceRow[] | undefined;

export async function optimisticPreferenceChange(
  qc: ReturnType<typeof useQueryClient>,
  change: PreferenceChange,
): Promise<PreferenceSnapshot> {
  // Остановить летящие refetch'и — иначе один из них перезапишет правку.
  await qc.cancelQueries({ queryKey: preferenceKeys.matrix });
  const snapshot = qc.getQueryData<PreferenceRow[]>(preferenceKeys.matrix);
  qc.setQueryData(preferenceKeys.matrix, (old: unknown) =>
    Array.isArray(old) ? applyPreferenceChange(old as PreferenceRow[], change) : old,
  );
  return snapshot;
}

/** Вернуть кэш ровно в состояние до правки — сервер отказал. */
export function rollbackPreferences(
  qc: ReturnType<typeof useQueryClient>,
  snapshot: PreferenceSnapshot,
): void {
  if (snapshot) qc.setQueryData(preferenceKeys.matrix, snapshot);
}

export function useUpdatePreferenceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (change: PreferenceChange): Promise<PreferenceRow[] | undefined> => {
      // `as never` на границе SDK: `key`/`channel` в контракте — генерённые
      // TS-enum'ы, куда литералы не присваиваются (паттерн org-events/mutations).
      const res = await accountSdk.notificationPreferences.update({ changes: [change] } as never);
      return (res as { preferences?: PreferenceRow[] } | undefined)?.preferences;
    },
    onMutate: (change) => optimisticPreferenceChange(qc, change),
    // Ответ PATCH — полная матрица, и она есть правда: пока летел запрос,
    // матрицу могли поменять с другого устройства.
    onSuccess: (rows) => {
      if (rows) qc.setQueryData(preferenceKeys.matrix, rows);
    },
    onError: (_e, _change, snapshot) => {
      rollbackPreferences(qc, snapshot);
      void qc.invalidateQueries({ queryKey: preferenceKeys.matrix });
    },
  });
}
