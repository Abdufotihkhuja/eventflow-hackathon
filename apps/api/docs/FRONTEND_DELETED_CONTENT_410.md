# 410 Gone — удалённый контент супер-админом

Когда пользователь переходит по slug удалённого события или статьи (через прямую ссылку, закладку и т.д.), API возвращает **410 Gone** вместо 404.

## Endpoints

| Endpoint | Описание |
| -------- | -------- |
| `GET /api/v1/public/events/by-slug/:slug` | Событие по slug |
| `GET /api/v1/public/events/:id` | Событие по ID |
| `GET /api/v1/events/by-slug/:slug` | Событие по slug (альтернативный роут) |
| `GET /api/v1/blog/by-slug/:slug` | Статья по slug |
| `GET /api/v1/blog/:id` | Статья по ID |

## Ответ 410

**Status:** `410 Gone`

**Body:**
```json
{
  "statusCode": 410,
  "deleted": true,
  "deletionReason": "Текст, который указал супер-админ (опционально)",
  "deletedAt": "2025-02-27T12:00:00.000Z"
}
```

| Поле           | Тип      | Описание                                       |
| -------------- | -------- | ---------------------------------------------- |
| statusCode     | number   | 410                                            |
| deleted        | boolean  | Всегда `true` при 410                          |
| deletionReason | string?  | Причина удаления от супер-админа (опционально) |
| deletedAt      | string   | ISO 8601 дата удаления                         |

## Рекомендации для фронтенда

1. **Проверка статуса:** При ответе `status === 410` показывать экран «Контент удалён».
2. **Сообщение:** Выводить `deletionReason` если есть, иначе общее: «Данное мероприятие/статья было удалено администрацией».
3. **Альтернативы:** Кнопка «На главную», «К каталогу событий», «К блогу».

## Пример обработки (TypeScript)

```typescript
interface DeletedContentResponse {
  statusCode: 410;
  deleted: true;
  deletionReason?: string;
  deletedAt: string;
}

// В обработчике ответа
if (response.status === 410) {
  const data = response.data as DeletedContentResponse;
  const message = data.deletionReason
    ? data.deletionReason
    : 'Данный контент был удалён администрацией';
  showDeletedScreen({ message, deletedAt: data.deletedAt });
}
```
