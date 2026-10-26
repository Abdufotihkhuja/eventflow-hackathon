# @eventflow/sdk-admin

Ручной типизированный клиент супер-админской поверхности (`AdminApiPaths` = пути под `/api/v1/auth | /api/v1/session | /api/v1/super-admin | /api/v1/translations`).

## Дисциплина (S-15, обязательна для всех биллинг-эндпоинтов)

Каждый новый админский эндпоинт (S-1: тарифы, платежи, оверрайды, comp-гранты, приостановка, цены, реклама, аудит) попадает сюда **в том же коммите**, что и контроллер, по рецепту из `packages/api-contracts/README.md`:

1. эндпоинт живёт под `/api/v1/super-admin/...` — фильтр `admin.ts` уже покрывает префикс;
2. `npm run contracts:generate` + rebuild api-contracts;
3. метод в `src/index.ts` строго на типах `OperationRequestBody`/`OperationSuccessResponse` НОВОГО пути (не заимствовать соседние типы);
4. денежные суммы — строки (BigInt-string-on-wire, D-3): в клиенте НЕ парсить в number, передавать как есть в i18n-форматирование;
5. `npm --workspace @eventflow/sdk-admin run build`; `npm run contracts:verify` зелёный.

Мутации денег/энтайтлментов требуют `reason`, где политика этого требует (OQ-7) — поле обязательно в типе метода, не «опционально на всякий случай».
