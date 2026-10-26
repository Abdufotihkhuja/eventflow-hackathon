# Таб «Сертификаты» — реализация UI и интеграция с backend

Реализован полноценный UI вкладки «Сертификаты» и подключение к API в соответствии с [CERTIFICATES_ORGANIZATION_FRONTEND.md](./CERTIFICATES_ORGANIZATION_FRONTEND.md).

## Что реализовано

### 1. Редактор шаблона сертификата

- **Размер сертификата**: фиксированный **842×595 px (A4**, альбомная ориентация). Подсказка и плейсхолдер с размером и пометкой «A4» отображаются в UI.
- **Загрузка файла**: выбор изображения (PNG, JPG) через input file. После выбора открывается **экран вырезки** — пользователь перетаскивает изображение, чтобы выбрать область 842×595; по кнопке «Применить вырезку» картинка обрезается под фиксированный размер, затем показывается превью и кнопка «Загрузить». При выборе «Добавить шаблон» до загрузки файла показывается плейсхолдер 842×595 (A4).
- **Холст с полями**: три области на превью — **Имя**, **Фамилия**, **QR**. Каждая область:
  - перетаскивается (drag);
  - изменяется по размеру (resize);
  - позиция и размер задаются в **процентах** (0–100) от размеров холста.
  - область **QR всегда квадратная** (при ресайзе сохраняется соотношение 1:1).
- **Сохранение**: кнопка «Загрузить» — создаёт шаблон через API (POST templates) с файлом и позициями. Кнопка «Сохранить позиции» — обновляет позиции выбранного шаблона (PATCH templates/:id). Кнопка «Удалить шаблон» — удаляет выбранный шаблон (DELETE templates/:id) с подтверждением в диалоге. Список шаблонов загружается с сервера (GET templates); можно выбрать шаблон из списка или добавить новый.

**Компоненты**: `CertificateTemplateEditor`, `CertificateTemplateCanvas` в `@features/events/ui/certificate-template-editor`. Используется библиотека `react-rnd`.

**Типы (локальные)**: в `certificate-template-editor/types.ts` — константы `CERTIFICATE_WIDTH`, `CERTIFICATE_HEIGHT` (842, 595), `TemplateFieldArea` (`x`, `y`, `width`, `height` в %), `CertificateTemplateFieldsState`. API-типы и позиции полей — в `api/services/certificate.types.ts`.

### 2. Статистика

- Блок из трёх карточек: **Выдано**, **Скачано**, **Осталось**. Данные из GET `/events/:eventId/certificates` (total и сумма downloadCount).

### 3. Выдача сертификатов

- **«Выдать всем посетившим»**: POST `/events/:eventId/certificates/generate` с `{ onlyAttended: true }`.
- **«Выбрать вручную»**: модалка со списком участников (`useEventRegistrationsQuery`); кнопка «Выдать выбранным» отправляет POST generate с `{ registrationIds }`.

### 4. Список выданных сертификатов

- Таблица из GET `/events/:eventId/certificates` (участник, email, дата выдачи, скачиваний). Кнопка «Скачать» — GET `/events/:eventId/certificates/:certificateId/download` (blob → открытие в новой вкладке).

## Интеграция с backend (реализована)

- **Шаблоны**: `certificateTemplatesService` (getTemplates, createTemplate, updateTemplate) с полями `firstNamePosition`, `lastNamePosition`, `qrPosition` в FormData.
- **Генерация**: `eventsService.generateCertificates(eventId, { registrationIds?, onlyAttended? })`.
- **Список и скачивание**: `eventCertificatesService.getCertificates`, `eventCertificatesService.downloadCertificate` (blob → object URL для открытия PDF).

Контракт и обработка на backend: [CERTIFICATES_BACKEND_SPEC.md](./CERTIFICATES_BACKEND_SPEC.md). Описание API для фронта: [CERTIFICATES_ORGANIZATION_FRONTEND.md](./CERTIFICATES_ORGANIZATION_FRONTEND.md).

## Файлы

| Путь | Назначение |
|------|------------|
| `src/features/events/ui/certificate-template-editor/` | Редактор шаблона (типы, холст, обёртка) |
| `src/pages/my-events/details/ui/tabs/event-certificates-tab.tsx` | Таб: редактор, статистика, выдача, таблица |

## Зависимости

- `react-rnd` — drag и resize областей на превью шаблона.
