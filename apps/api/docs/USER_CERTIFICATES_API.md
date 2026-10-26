# API сертификатов и достижений пользователя

Документация для endpoints управления сертификатами и достижениями простого пользователя.

---

## Обзор

Страница "Сертификаты и достижения" позволяет пользователям:
- Просматривать список своих сертификатов
- Добавлять новые сертификаты от различных провайдеров
- Отслеживать статистику (всего, верифицировано, часов обучения)
- Скачивать PDF-файлы сертификатов
- Переходить по ссылкам для верификации

---

## Модель данных

### UserCertificate

```prisma
model UserCertificate {
  id             String    @id @default(uuid()) @db.Uuid
  userId         String    @map("user_id") @db.Uuid
  
  // Основная информация
  title          String    // Название сертификата
  provider       String    // Провайдер/академия
  description    String?   // Описание программы
  
  // Данные сертификата
  issueDate      DateTime  @db.Date // Дата выдачи
  expiryDate     DateTime? @db.Date // Дата истечения
  trainingHours  Int       @default(0) // Часов обучения
  credentialId   String?   // Уникальный ID (EVT-PRO-4829)
  credentialUrl  String?   // Ссылка для проверки
  certificateUrl String?   // Ссылка на PDF
  
  // Навыки и отображение
  skills         String[]  // Навыки/теги
  isVerified     Boolean   @default(false)
  color          String?   // Цвет карточки (HEX)
  
  createdAt      DateTime
  updatedAt      DateTime
}
```

---

## Endpoints

### 1. Получить список сертификатов со статистикой

**Endpoint:** `GET /api/v1/account/me/certificates`

**Query Parameters:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| search | string | Поиск по названию, провайдеру, credential ID |
| filter | enum | Фильтр: `all`, `verified`, `unverified` |

**Response (200 OK):**

```json
{
  "stats": {
    "totalCertificates": 3,
    "verifiedCertificates": 3,
    "totalTrainingHours": 104
  },
  "certificates": [
    {
      "id": "uuid",
      "title": "Eventflow Pro Coordinator",
      "provider": "EVENTFLOW ACADEMY",
      "description": "Продвинутая программа по автоматизации потоков и аналитике Eventflow.",
      "issueDate": "2024-12-15",
      "expiryDate": null,
      "trainingHours": 48,
      "credentialId": "EVT-PRO-4829",
      "credentialUrl": "https://verify.eventflow.com/cert/EVT-PRO-4829",
      "certificateUrl": "https://cdn.eventflow.com/certificates/cert-4829.pdf",
      "skills": ["QR & RFID", "Incident Response", "Stakeholder Ops"],
      "isVerified": true,
      "color": "#F59E0B",
      "createdAt": "2024-12-15T12:00:00.000Z"
    }
  ]
}
```

---

### 2. Получить статистику сертификатов

**Endpoint:** `GET /api/v1/account/me/certificates/stats`

**Response (200 OK):**

```json
{
  "totalCertificates": 3,
  "verifiedCertificates": 3,
  "totalTrainingHours": 104
}
```

---

### 3. Получить сертификат по ID

**Endpoint:** `GET /api/v1/account/me/certificates/:id`

**Response (200 OK):**

```json
{
  "id": "uuid",
  "title": "Eventflow Pro Coordinator",
  "provider": "EVENTFLOW ACADEMY",
  "description": "Продвинутая программа по автоматизации потоков и аналитике Eventflow.",
  "issueDate": "2024-12-15",
  "expiryDate": null,
  "trainingHours": 48,
  "credentialId": "EVT-PRO-4829",
  "credentialUrl": "https://verify.eventflow.com/cert/EVT-PRO-4829",
  "certificateUrl": "https://cdn.eventflow.com/certificates/cert-4829.pdf",
  "skills": ["QR & RFID", "Incident Response", "Stakeholder Ops"],
  "isVerified": true,
  "color": "#F59E0B",
  "createdAt": "2024-12-15T12:00:00.000Z"
}
```

---

### 4. Добавить сертификат

**Endpoint:** `POST /api/v1/account/me/certificates`

**Request Body:**

```json
{
  "title": "Eventflow Pro Coordinator",
  "provider": "EVENTFLOW ACADEMY",
  "description": "Продвинутая программа по автоматизации потоков и аналитике Eventflow.",
  "issueDate": "2024-12-15",
  "expiryDate": "2026-12-15",
  "trainingHours": 48,
  "credentialId": "EVT-PRO-4829",
  "credentialUrl": "https://verify.eventflow.com/cert/EVT-PRO-4829",
  "certificateUrl": "https://cdn.eventflow.com/certificates/cert-4829.pdf",
  "skills": ["QR & RFID", "Incident Response", "Stakeholder Ops"],
  "color": "#F59E0B"
}
```

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| title | string | Да | Название сертификата (макс. 200) |
| provider | string | Да | Название провайдера (макс. 200) |
| description | string | Нет | Описание программы (макс. 2000) |
| issueDate | string (YYYY-MM-DD) | Да | Дата выдачи |
| expiryDate | string (YYYY-MM-DD) | Нет | Дата истечения |
| trainingHours | number (0-10000) | Нет | Часов обучения |
| credentialId | string | Нет | Уникальный ID сертификата (макс. 100) |
| credentialUrl | string (URL) | Нет | Ссылка для проверки |
| certificateUrl | string (URL) | Нет | Ссылка на PDF |
| skills | string[] | Нет | Массив навыков |
| color | string (HEX) | Нет | Цвет карточки (#RRGGBB) |

---

### 5. Обновить сертификат

**Endpoint:** `PATCH /api/v1/account/me/certificates/:id`

**Request Body:** (все поля опциональны)

```json
{
  "description": "Обновлённое описание",
  "trainingHours": 56,
  "skills": ["Service Design", "Journey Mapping"]
}
```

---

### 6. Удалить сертификат

**Endpoint:** `DELETE /api/v1/account/me/certificates/:id`

**Response:** `204 No Content`

---

## Примеры использования

### JavaScript (fetch)

```javascript
// Получить сертификаты
const response = await fetch(
  'http://localhost:3000/api/v1/account/me/certificates',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
);

const { stats, certificates } = await response.json();

console.log(`Всего сертификатов: ${stats.totalCertificates}`);
console.log(`Верифицировано: ${stats.verifiedCertificates}`);
console.log(`Часов обучения: ${stats.totalTrainingHours}`);

// Добавить сертификат
const newCert = await fetch(
  'http://localhost:3000/api/v1/account/me/certificates',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Customer Experience Architect',
      provider: 'CX COLLECTIVE',
      description: 'Сервис-дизайн, картирование CJM и прототипирование backstage процессов.',
      issueDate: '2023-07-03',
      trainingHours: 32,
      credentialId: 'CXA-7334',
      skills: ['Service Design', 'Journey Mapping', 'Workshop Facilitation'],
      color: '#A855F7',
    }),
  }
);
```

### Компонент React

```tsx
interface Certificate {
  id: string;
  title: string;
  provider: string;
  description: string | null;
  issueDate: string;
  trainingHours: number;
  credentialId: string | null;
  credentialUrl: string | null;
  certificateUrl: string | null;
  skills: string[];
  isVerified: boolean;
  color: string | null;
}

interface CertificatesStats {
  totalCertificates: number;
  verifiedCertificates: number;
  totalTrainingHours: number;
}

function CertificatesPage() {
  const [stats, setStats] = useState<CertificatesStats | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCertificates();
  }, [search]);

  const loadCertificates = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);

    const response = await fetch(
      `/api/v1/account/me/certificates?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    setStats(data.stats);
    setCertificates(data.certificates);
  };

  const downloadPDF = (certificateUrl: string) => {
    window.open(certificateUrl, '_blank');
  };

  const verifyCertificate = (credentialUrl: string) => {
    window.open(credentialUrl, '_blank');
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats">
        <div>Всего сертификатов: {stats?.totalCertificates}</div>
        <div>Верифицировано: {stats?.verifiedCertificates}</div>
        <div>Часов обучения: {stats?.totalTrainingHours}</div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск..."
      />

      {/* Certificates */}
      {certificates.map((cert) => (
        <div
          key={cert.id}
          style={{ background: cert.color ? `${cert.color}20` : undefined }}
        >
          <h3>{cert.title}</h3>
          <p>{cert.provider}</p>
          <p>{cert.description}</p>
          <p>Дата выдачи: {new Date(cert.issueDate).toLocaleDateString()}</p>
          <p>Часов обучения: {cert.trainingHours}</p>
          {cert.credentialId && <p>Credential ID: {cert.credentialId}</p>}
          <div className="skills">
            {cert.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
          <div className="actions">
            {cert.credentialUrl && (
              <button onClick={() => verifyCertificate(cert.credentialUrl!)}>
                Проверить
              </button>
            )}
            {cert.certificateUrl && (
              <button onClick={() => downloadPDF(cert.certificateUrl!)}>
                Скачать PDF
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Цвета карточек

Рекомендуемые цвета для различных типов сертификатов:

| Тип | HEX | Описание |
|-----|-----|----------|
| Оранжевый | `#F59E0B` | EventFlow Academy |
| Фиолетовый | `#A855F7` | CX Collective |
| Синий | `#3B82F6` | Технические сертификаты |
| Зелёный | `#22C55E` | Экологические/ESG |
| Красный | `#EF4444` | Безопасность |
| Серый | `#6B7280` | Другое |

---

## Миграция базы данных

```sql
CREATE TABLE "user_certificates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "description" TEXT,
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE,
    "training_hours" INTEGER NOT NULL DEFAULT 0,
    "credential_id" TEXT,
    "credential_url" TEXT,
    "certificate_url" TEXT,
    "skills" TEXT[],
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_certificates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_certificates_user_id_idx" ON "user_certificates"("user_id");
CREATE INDEX "user_certificates_is_verified_idx" ON "user_certificates"("is_verified");

ALTER TABLE "user_certificates" ADD CONSTRAINT "user_certificates_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Для применения:

```bash
npx prisma migrate deploy
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешное выполнение |
| 201 | Сертификат создан |
| 204 | Сертификат удалён |
| 400 | Некорректные данные запроса |
| 401 | Не авторизован |
| 403 | Доступ запрещен |
| 404 | Сертификат не найден |

