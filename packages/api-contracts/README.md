# @eventflow/api-contracts

Контрактный слой платформы. **Источник истины — NestJS-контроллеры** (code-first): спецификация экспортируется из живого приложения, типы генерируются из спецификации, SDK пишутся вручную поверх сгенерированных типов.

```
контроллеры (apps/api) ──openapi:export──▶ openapi/eventflow.openapi.json
                                              │ openapi-typescript --enum
                                              ▼
                                   src/generated/openapi.ts (+ dist/)
                                              │ типы
                                              ▼
                        packages/sdk-{public,account,workspace,admin} (ручные)
```

## Поверхности (surface filters)

`src/{public,account,workspace,admin}.ts` сужают общий `paths` до поверхности каждого фронтенда по префиксам путей. Правила:

- **workspace** — включает `/api/v1/billing` (кабинетный биллинг монетизации), `/api/v1/events`, `/api/v1/organizations` и т.д.
- **public** — `/api/v1/public...` (включая `/api/v1/public/plans` — публичный каталог тарифов).
- **admin** — `/api/v1/super-admin...` (все операторские биллинг-эндпоинты живут ПОД этим префиксом, см. S-1).
- **Вебхуки платёжных провайдеров (`/api/v1/payments/webhooks/...`) НЕ входят ни в один фильтр** — это server-to-server поверхность, у неё нет SDK-клиента и не должно быть.

Новый префикс добавляется В ФИЛЬТР ТОЙ ЖЕ ПРАВКОЙ, что и первый эндпоинт под ним, иначе SDK не увидит типы путей.

## Рецепт: добавить один эндпоинт (zero-drift чеклист, D-11)

1. **Backend**: контроллер + DTO со Swagger-декораторами; денежные поля — строки (`@ApiProperty({ type: String })`, конвенция D-3 BigInt-string-on-wire).
2. **Регенерация**: `npm run contracts:generate` (экспорт спеки + типы), затем `npm --workspace @eventflow/api-contracts run build` (dist закоммичен).
3. **Фильтр поверхности**: если путь под новым префиксом — добавить префикс в соответствующий `src/<surface>.ts`.
4. **SDK**: вручную добавить типизированный метод в `packages/sdk-<surface>/src/index.ts`, используя `OperationRequestBody`/`OperationSuccessResponse` по УЖЕ сгенерированным типам (никаких заимствованных соседних типов — это и есть тихий дрифт, см. кейс 2945bc4).
5. **Пересобрать SDK**: `npm --workspace @eventflow/sdk-<surface> run build`.
6. **Проверка**: `npm run contracts:verify` — регенерирует и падает на любом диффе с закоммиченным контрактом. Этот же гейт стоит в CI (после Build, `--no-gen`) и в `scripts/deploy/07-release-checks.sh`.
7. **Коммит**: спека + типы + dist + фильтр + SDK — одним коммитом с эндпоинтом.

Дрифт — стоп-условие: закоммиченная спека, отстающая от рантайма, блокируется гейтом `scripts/check-contracts-drift.mjs` (D-2).
