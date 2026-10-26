# Модуль "Управление пользователями"

## Описание

Модуль для управления командой организаторов мероприятий с гибкой системой ролей и прав доступа.

## Функциональность

### 1. **Роли пользователей**

- **Owner (Владелец)** - Полный доступ ко всем функциям системы
- **Admin (Администратор)** - Управление событиями, пользователями и настройками
- **Event Manager (Менеджер событий)** - Создание и редактирование событий, управление участниками
- **Event Coordinator (Координатор событий)** - Управление участниками и координация событий
- **Support (Техподдержка)** - Просмотр информации и поддержка пользователей
- **Viewer (Наблюдатель)** - Просмотр статистики и информации о событиях

### 2. **Система прав доступа**

Гибкая система permissions позволяет настраивать права для каждого пользователя индивидуально:

#### События

- `events.view` - Просмотр событий
- `events.create` - Создание новых событий
- `events.edit` - Редактирование событий
- `events.publish` - Публикация черновиков
- `events.delete` - Удаление событий

#### Участники

- `participants.view` - Просмотр списка участников
- `participants.manage` - Управление участниками
- `participants.export` - Экспорт данных участников

#### Аналитика

- `analytics.view` - Просмотр дашборда и статистики
- `analytics.export` - Экспорт отчётов

#### Пользователи

- `users.view` - Просмотр списка команды
- `users.invite` - Приглашение новых пользователей
- `users.manage` - Полное управление пользователями и правами

#### Настройки

- `settings.view` - Просмотр настроек системы
- `settings.manage` - Изменение настроек

### 3. **Статусы пользователей**

- **Active** - Активный пользователь с полным доступом
- **Invited** - Приглашён, ожидает активации
- **Inactive** - Неактивный аккаунт
- **Suspended** - Приостановлен (блокировка доступа)

### 4. **Возможности**

- ✅ Создание и редактирование пользователей
- ✅ Назначение ролей и прав доступа
- ✅ Отправка email-приглашений
- ✅ Блокировка/разблокировка пользователей
- ✅ Удаление пользователей
- ✅ Поиск по имени и email
- ✅ Фильтрация по ролям и статусам
- ✅ Статистика по командам
- ✅ Повторная отправка приглашений

## Структура

```
src/
├── api/
│   └── services/
│       ├── user.types.ts          # Типы и константы
│       └── organization.types.ts  # Типы сотрудников и ролей
├── entities/
│   └── user/
│       └── lib/
│           └── constants.ts       # Экспорт констант
├── features/
│   └── users/
│       ├── api/                   # TanStack Query хуки для organization members
│       │   ├── use-members-query.ts
│       │   ├── use-create-member.ts
│       │   ├── use-update-member.ts
│       │   ├── use-delete-member.ts
│       │   ├── use-resend-member-invite.ts
│       │   └── use-update-member-permissions.ts
│       ├── lib/                   # Формы и валидация
│       │   ├── schemas/
│       │   │   └── user-schema.ts # Zod схемы
│       │   └── use-user-form.ts   # React Hook Form
│       └── ui/                    # UI компоненты
│           ├── user-form/
│           │   └── user-form.tsx  # Форма пользователя
│           └── permissions-manager/
│               └── permissions-manager.tsx # Менеджер прав
└── pages/
    └── users/
        ├── lib/
        │   ├── mock-data.ts       # Mock данные (используются сейчас)
        │   └── index.ts
        └── ui/
            ├── users-page.tsx           # Главная страница
            ├── user-card.tsx            # Карточка пользователя
            └── users-page-skeleton.tsx  # Skeleton loader
```

## Текущее состояние

Модуль подключён к актуальному API сотрудников организации.

- ✅ Список сотрудников загружается через `/api/v1/organizations/members`
- ✅ Создание и редактирование используют member endpoints
- ✅ Повторная отправка приглашения идёт через `useResendMemberInvite`
- ✅ Управление правами идёт через `useUpdateMemberPermissions`

## API Endpoints

```typescript
GET    /api/v1/organizations/members
POST   /api/v1/organizations/members
PATCH  /api/v1/organizations/members/:id
DELETE /api/v1/organizations/members/:id
POST   /api/v1/organizations/members/:id/resend-invite
GET    /api/v1/organizations/roles
GET    /api/v1/permissions
```

## Использование

### Получение списка сотрудников

```tsx
import { useMembersQuery } from '@features/users'

function MyComponent() {
  const { data, isLoading } = useMembersQuery({
    search: 'john',
  })

  return <div>{/* ... */}</div>
}
```

### Создание сотрудника

```tsx
import { useCreateMember, useCreateUserForm, UserForm } from '@features/users'

function CreateMemberModal() {
  const form = useCreateUserForm()
  const mutation = useCreateMember()

  const handleSubmit = async values => {
    await mutation.mutateAsync(values)
    // Успех!
  }

  return <UserForm form={form} onSubmit={handleSubmit} isLoading={mutation.isPending} />
}
```

### Обновление сотрудника

```tsx
import { useUpdateMember, useUpdateUserForm, UserForm } from '@features/users'

function EditMemberModal({ member }) {
  const form = useUpdateUserForm({
    defaultValues: {
      firstName: member.firstName,
      lastName: member.lastName,
      roleId: member.roleId,
    },
  })
  const mutation = useUpdateMember()

  const handleSubmit = async values => {
    await mutation.mutateAsync({ id: member.id, data: values })
  }

  return <UserForm form={form} onSubmit={handleSubmit} isEdit isLoading={mutation.isPending} />
}
```

## UI/UX особенности

- **Дизайн в стиле проекта** - Использует brand colors, Tailwind utilities, shadcn/ui компоненты
- **Адаптивность** - Grid layout адаптируется под разные экраны
- **Интерактивность** - Hover эффекты, transitions, skeleton loaders
- **Фильтры** - Мгновенная фильтрация без перезагрузки страницы
- **Модальные окна** - Sheet для форм, AlertDialog для подтверждений
- **Accessibility** - Keyboard navigation, ARIA labels, semantic HTML

## Безопасность

- Валидация на клиенте через Zod
- Типизация всех данных через TypeScript
- Проверка прав доступа (реализуется на бэкенде)
- Подтверждение критических операций (удаление)

## Дальнейшее развитие

- [ ] Массовые операции (блокировка/удаление нескольких пользователей)
- [ ] Импорт пользователей из CSV/Excel
- [ ] История изменений (audit log)
- [ ] Уведомления пользователям
- [ ] Детальная страница пользователя
- [ ] Настройка кастомных ролей
