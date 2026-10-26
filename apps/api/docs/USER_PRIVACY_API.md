# API настроек приватности пользователя

Документация для endpoints управления настройками приватности простого пользователя.

---

## Обзор

Простые пользователи могут управлять видимостью своего профиля и контактных данных для других пользователей платформы.

### Настройки приватности:

1. **Видимость профиля** (`isPublicProfile`):
   - `true` - Профиль виден всем пользователям
   - `false` - Профиль виден только вам (приватный)

2. **Видимость email** (`showEmail`):
   - `true` - Email показывается другим пользователям
   - `false` - Email скрыт от других пользователей

3. **Видимость телефона** (`showPhone`):
   - `true` - Телефон показывается другим пользователям
   - `false` - Телефон скрыт от других пользователей

---

## Endpoints

### 1. Обновить настройки приватности

**Endpoint:** `PATCH /api/v1/account/me/privacy`

**Описание:** Обновление настроек приватности профиля пользователя.

**Требования:**
- Авторизация: Bearer Token (JWT)
- Роль: `USER`

#### Request Body

```json
{
  "isPublicProfile": true,
  "showEmail": false,
  "showPhone": false
}
```

#### Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "Иван Иванов",
  "avatarUrl": "https://example.com/avatars/avatar.jpg",
  "phone": "+998901234567",
  "location": "Ташкент, Узбекистан",
  "bio": "Разработчик с 5-летним опытом...",
  "authProvider": "EMAIL",
  "providerId": null,
  "isEmailVerified": true,
  "isPublicProfile": true,
  "showEmail": false,
  "showPhone": false,
  "deletedAt": null,
  "createdAt": "2024-12-14T10:30:00.000Z",
  "updatedAt": "2025-01-03T12:00:00.000Z"
}
```

#### Примеры использования

**cURL:**

```bash
curl -X PATCH http://localhost:3000/api/v1/account/me/privacy \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isPublicProfile": false,
    "showEmail": false,
    "showPhone": false
  }'
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:3000/api/v1/account/me/privacy', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    isPublicProfile: false,
    showEmail: false,
    showPhone: false,
  }),
});

const data = await response.json();
console.log(data);
```

---

### 2. Экспортировать данные пользователя

**Endpoint:** `GET /api/v1/account/me/export`

**Описание:** Экспорт всех данных пользователя в формате JSON. Включает профиль, регистрации на события, посещения, сертификаты и активные сессии.

**Требования:**
- Авторизация: Bearer Token (JWT)
- Роль: `USER`

#### Response (200 OK)

```json
{
  "exportedAt": "2025-01-03T12:00:00.000Z",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "Иван Иванов",
    "avatarUrl": "https://example.com/avatars/avatar.jpg",
    "phone": "+998901234567",
    "location": "Ташкент, Узбекистан",
    "bio": "Разработчик с 5-летним опытом...",
    "authProvider": "EMAIL",
    "providerId": null,
    "isEmailVerified": true,
    "isPublicProfile": true,
    "showEmail": false,
    "showPhone": false,
    "deletedAt": null,
    "createdAt": "2024-12-14T10:30:00.000Z",
    "updatedAt": "2025-01-03T12:00:00.000Z",
    "registrations": [
      {
        "id": "650e8400-e29b-41d4-a716-446655440001",
        "eventId": "750e8400-e29b-41d4-a716-446655440002",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "APPROVED",
        "qrCode": "QR123456",
        "rejectionReason": null,
        "createdAt": "2024-12-20T10:00:00.000Z",
        "updatedAt": "2024-12-20T10:00:00.000Z",
        "event": {
          "id": "750e8400-e29b-41d4-a716-446655440002",
          "title": "Tech Conference 2025",
          "startDate": "2025-06-15T10:00:00.000Z",
          "endDate": "2025-06-15T18:00:00.000Z",
          "format": "HYBRID"
        },
        "answers": [
          {
            "id": "850e8400-e29b-41d4-a716-446655440003",
            "answer": "Frontend разработка",
            "question": {
              "question": "Ваша специализация?",
              "type": "TEXT"
            }
          }
        ],
        "attendances": [
          {
            "id": "950e8400-e29b-41d4-a716-446655440004",
            "checkInAt": "2025-06-15T09:30:00.000Z",
            "checkInDate": "2025-06-15"
          }
        ],
        "certificate": {
          "id": "a50e8400-e29b-41d4-a716-446655440005",
          "certificateUrl": "https://example.com/certificates/cert.pdf",
          "generatedAt": "2025-06-15T19:00:00.000Z",
          "downloadCount": 3
        }
      }
    ],
    "refreshTokens": [
      {
        "id": "b50e8400-e29b-41d4-a716-446655440006",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "ipAddress": "192.168.1.1",
        "lastUsedAt": "2025-01-03T11:00:00.000Z",
        "expiresAt": "2025-02-03T12:00:00.000Z",
        "createdAt": "2025-01-03T12:00:00.000Z"
      }
    ]
  }
}
```

#### Примеры использования

**cURL:**

```bash
curl -X GET http://localhost:3000/api/v1/account/me/export \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:3000/api/v1/account/me/export', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const data = await response.json();

// Сохранить как файл
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `user-data-${new Date().toISOString()}.json`;
a.click();
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешное выполнение операции |
| 401 | Не авторизован (отсутствует или невалидный токен) |
| 403 | Доступ запрещен (неверная роль пользователя) |
| 404 | Пользователь не найден |
| 500 | Внутренняя ошибка сервера |

---

## Использование настроек приватности

### Логика применения настроек

1. **isPublicProfile = false (Приватный профиль)**:
   - Профиль не виден другим пользователям
   - Данные пользователя не отображаются в публичных списках
   - Доступ к профилю есть только у самого пользователя

2. **isPublicProfile = true (Публичный профиль)**:
   - Профиль виден всем пользователям
   - Применяются настройки `showEmail` и `showPhone`

3. **showEmail = false**:
   - Email скрыт от других пользователей при просмотре профиля
   - Email всегда виден самому пользователю

4. **showPhone = false**:
   - Телефон скрыт от других пользователей при просмотре профиля
   - Телефон всегда виден самому пользователю

### Значения по умолчанию

При регистрации нового пользователя устанавливаются следующие значения:

```json
{
  "isPublicProfile": true,
  "showEmail": false,
  "showPhone": false
}
```

---

## Интеграция на фронтенде

### Пример компонента настроек приватности (React)

```typescript
import { useState } from 'react';

interface PrivacySettings {
  isPublicProfile: boolean;
  showEmail: boolean;
  showPhone: boolean;
}

export function PrivacySettingsPage() {
  const [settings, setSettings] = useState<PrivacySettings>({
    isPublicProfile: true,
    showEmail: false,
    showPhone: false,
  });

  const updateSettings = async (updates: Partial<PrivacySettings>) => {
    const response = await fetch('/api/v1/account/me/privacy', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      const data = await response.json();
      setSettings({
        isPublicProfile: data.isPublicProfile,
        showEmail: data.showEmail,
        showPhone: data.showPhone,
      });
    }
  };

  const exportData = async () => {
    const response = await fetch('/api/v1/account/me/export', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${new Date().toISOString()}.json`;
      a.click();
    }
  };

  return (
    <div className="privacy-settings">
      <h2>Настройки приватности</h2>

      <div className="profile-visibility">
        <h3>Видимость профиля</h3>
        <label>
          <input
            type="radio"
            checked={settings.isPublicProfile}
            onChange={() => updateSettings({ isPublicProfile: true })}
          />
          Публичный - Профиль виден всем пользователям
        </label>
        <label>
          <input
            type="radio"
            checked={!settings.isPublicProfile}
            onChange={() => updateSettings({ isPublicProfile: false })}
          />
          Приватный - Профиль виден только вам
        </label>
      </div>

      <div className="contact-visibility">
        <h3>Видимость контактов</h3>
        <label>
          <input
            type="checkbox"
            checked={settings.showEmail}
            onChange={(e) => updateSettings({ showEmail: e.target.checked })}
          />
          Показывать email
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.showPhone}
            onChange={(e) => updateSettings({ showPhone: e.target.checked })}
          />
          Показывать телефон
        </label>
      </div>

      <div className="export-data">
        <h3>Экспорт данных</h3>
        <p>Скачайте копию всех ваших данных в формате JSON</p>
        <button onClick={exportData}>Экспортировать данные</button>
      </div>
    </div>
  );
}
```

---

## Миграция базы данных

Для применения изменений выполните миграцию:

```bash
npx prisma migrate deploy
```

Или для dev окружения:

```bash
npx prisma migrate dev
```

Миграция добавит следующие поля в таблицу `users`:

- `is_public_profile` (Boolean, default: true)
- `show_email` (Boolean, default: false)
- `show_phone` (Boolean, default: false)

