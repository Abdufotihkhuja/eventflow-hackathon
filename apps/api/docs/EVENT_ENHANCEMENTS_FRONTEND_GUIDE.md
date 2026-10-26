# Quick Start Guide для Frontend: Новые возможности API мероприятий

Быстрое руководство по интеграции комментариев, сохранённых мероприятий и фильтрации.

---

## 🎯 Что нового

1. **Комментарии** с ответами, лайками и дизлайками
2. **Сохранённые мероприятия** (избранное)
3. **Фильтр по организатору**
4. **Управление комментариями** (для организаторов)

---

## 🚀 Быстрый старт

### 1. Комментарии

#### Показать блок комментариев

```typescript
// Получить комментарии
const response = await fetch(
  `/api/v1/events/${eventId}/comments?page=1&limit=20`,
  {
    headers: {
      'Authorization': `Bearer ${token}` // Опционально
    }
  }
);

const { data, total, totalPages } = await response.json();

// Структура данных
interface Comment {
  id: string;
  eventId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  replies: Comment[];
  likesCount: number;
  dislikesCount: number;
  userLikeStatus: boolean | null; // true = лайк, false = дизлайк, null = нет реакции
}
```

#### Добавить комментарий

```typescript
async function createComment(eventId: string, content: string, parentId?: string) {
  const response = await fetch(`/api/v1/events/${eventId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content, parentId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}

// Использование
await createComment(eventId, 'Отличное мероприятие!');
await createComment(eventId, 'Согласен!', parentCommentId); // Ответ
```

#### Поставить лайк/дизлайк

```typescript
async function toggleLike(commentId: string, isLike: boolean) {
  const response = await fetch(
    `/api/v1/events/${eventId}/comments/${commentId}/like`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isLike })
    }
  );
  
  return response.json(); // { likes: 15, dislikes: 2 }
}

// Использование
await toggleLike(commentId, true);  // Лайк
await toggleLike(commentId, false); // Дизлайк
await toggleLike(commentId, true);  // Убрать лайк (toggle)
```

---

### 2. Сохранённые мероприятия

#### Кнопка "Сохранить"

```typescript
// Компонент SaveButton
import { useState, useEffect } from 'react';

function SaveButton({ eventId }: { eventId: string }) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Проверить статус при загрузке
  useEffect(() => {
    checkSavedStatus();
  }, [eventId]);

  async function checkSavedStatus() {
    const response = await fetch(
      `/api/v1/account/me/saved-events/${eventId}/check`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const { isSaved } = await response.json();
    setIsSaved(isSaved);
  }

  async function toggleSave() {
    setLoading(true);
    try {
      const method = isSaved ? 'DELETE' : 'POST';
      await fetch(`/api/v1/account/me/saved-events/${eventId}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setIsSaved(!isSaved);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={toggleSave} disabled={loading}>
      {isSaved ? '❤️ Сохранено' : '🤍 Сохранить'}
    </button>
  );
}
```

#### Список сохранённых мероприятий

```typescript
async function fetchSavedEvents(page = 1) {
  const response = await fetch(
    `/api/v1/account/me/saved-events?page=${page}&limit=10`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  return response.json();
}

// Использование
const { data: savedEvents, total, totalPages } = await fetchSavedEvents(1);

savedEvents.forEach(saved => {
  console.log(saved.event.title); // Доступ к данным мероприятия
  console.log(saved.savedAt);     // Когда сохранено
});
```

---

### 3. Фильтр по организатору

#### Показать мероприятия организатора

```typescript
async function fetchOrganizerEvents(organizerId: string, page = 1) {
  const params = new URLSearchParams({
    organizationId: organizerId,
    page: page.toString(),
    limit: '10'
  });
  
  const response = await fetch(`/api/v1/public/events?${params}`);
  return response.json();
}

// Использование
const { data: events } = await fetchOrganizerEvents(organizerId);

// Комбинирование с другими фильтрами
const params = new URLSearchParams({
  organizationId: organizerId,
  city: 'Ташкент',
  format: 'OFFLINE',
  page: '1',
  limit: '10'
});
```

---

### 4. Управление комментариями (Организатор)

#### Включить/выключить комментарии

```typescript
async function toggleComments(eventId: string, enabled: boolean) {
  const response = await fetch(`/api/v1/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orgToken}`
    },
    body: JSON.stringify({ commentsEnabled: enabled })
  });
  
  return response.json();
}

// В форме создания/редактирования мероприятия
<label>
  <input
    type="checkbox"
    checked={commentsEnabled}
    onChange={(e) => setCommentsEnabled(e.target.checked)}
  />
  Разрешить комментарии
</label>
```

---

## 📦 Готовые компоненты

### CommentSection (React)

```typescript
import { useState, useEffect } from 'react';

interface CommentSectionProps {
  eventId: string;
  commentsEnabled: boolean;
}

function CommentSection({ eventId, commentsEnabled }: CommentSectionProps) {
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [page]);

  async function fetchComments() {
    setLoading(true);
    const response = await fetch(
      `/api/v1/events/${eventId}/comments?page=${page}&limit=20`
    );
    const { data } = await response.json();
    setComments(data);
    setLoading(false);
  }

  async function handleSubmit(content: string) {
    await fetch(`/api/v1/events/${eventId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    });
    
    fetchComments(); // Обновить список
  }

  if (!commentsEnabled) {
    return <div>Комментарии отключены</div>;
  }

  return (
    <div>
      <CommentForm onSubmit={handleSubmit} />
      {loading ? (
        <Spinner />
      ) : (
        <CommentList comments={comments} />
      )}
      <Pagination page={page} onChange={setPage} />
    </div>
  );
}
```

### CommentItem

```typescript
function CommentItem({ comment }: { comment: Comment }) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  async function handleLike() {
    await toggleLike(comment.id, true);
    // Обновить состояние
  }

  async function handleReply(content: string) {
    await createComment(comment.eventId, content, comment.id);
    setShowReplyForm(false);
    // Обновить список
  }

  return (
    <div className="comment">
      <div className="comment-header">
        <Avatar src={comment.user.avatarUrl} />
        <span>{comment.user.firstName} {comment.user.lastName}</span>
        <time>{formatDate(comment.createdAt)}</time>
      </div>
      
      <p>{comment.content}</p>
      
      <div className="comment-actions">
        <button onClick={handleLike}>
          👍 {comment.likesCount}
        </button>
        <button onClick={() => handleDislike()}>
          👎 {comment.dislikesCount}
        </button>
        <button onClick={() => setShowReplyForm(true)}>
          Ответить
        </button>
      </div>

      {showReplyForm && (
        <CommentForm onSubmit={handleReply} placeholder="Написать ответ..." />
      )}

      {comment.replies.length > 0 && (
        <div className="replies">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 UI/UX рекомендации

### Комментарии

1. **Форма добавления:**
   - Placeholder: "Поделитесь своим мнением..."
   - Кнопка активна только если текст не пустой
   - Показывать счётчик символов (max 2000)

2. **Отображение:**
   - Сортировка: новые сверху
   - Ответы отступом слева
   - Подсветка своих комментариев

3. **Лайки:**
   - Активное состояние (синий для лайка, красный для дизлайка)
   - Анимация при клике
   - Debounce для предотвращения спама

4. **Пагинация:**
   - "Показать ещё" вместо классической пагинации
   - Infinite scroll (опционально)

### Сохранённые мероприятия

1. **Кнопка:**
   - Иконка сердца (пустое/заполненное)
   - Tooltip: "Сохранить в избранное"
   - Анимация при клике

2. **Список:**
   - Сортировка: недавно сохранённые сверху
   - Фильтры: предстоящие/прошедшие
   - Быстрое удаление (свайп или иконка)

### Фильтр по организатору

1. **Страница организатора:**
   - Вкладка "Мероприятия" с автофильтрацией
   - Показывать количество мероприятий

2. **Каталог:**
   - Клик на логотип организатора → фильтр
   - Чип с названием организатора (можно удалить)

---

## ⚠️ Обработка ошибок

### Типичные ошибки

```typescript
try {
  await createComment(eventId, content);
} catch (error) {
  if (error.status === 400) {
    // Комментарии отключены
    toast.error('Комментарии отключены для этого мероприятия');
  } else if (error.status === 403) {
    // Нет прав
    toast.error('Войдите в систему, чтобы оставить комментарий');
  } else if (error.status === 404) {
    // Мероприятие не найдено
    toast.error('Мероприятие не найдено');
  } else {
    toast.error('Произошла ошибка');
  }
}
```

### Сохранённые мероприятия

```typescript
try {
  await saveEvent(eventId);
} catch (error) {
  if (error.status === 409) {
    // Уже сохранено
    toast.info('Мероприятие уже в избранном');
  } else if (error.status === 403) {
    // Нужна авторизация
    toast.error('Войдите, чтобы сохранить мероприятие');
  }
}
```

---

## 🔔 Оптимизация

### 1. Debounce для лайков

```typescript
import { debounce } from 'lodash';

const debouncedLike = debounce(async (commentId, isLike) => {
  await toggleLike(commentId, isLike);
}, 300);
```

### 2. Оптимистичные обновления

```typescript
async function handleLike(comment: Comment) {
  // Сразу обновляем UI
  setComment({
    ...comment,
    likesCount: comment.userLikeStatus ? comment.likesCount - 1 : comment.likesCount + 1,
    userLikeStatus: !comment.userLikeStatus
  });

  try {
    // Отправляем запрос
    await toggleLike(comment.id, true);
  } catch (error) {
    // Откатываем изменения при ошибке
    setComment(comment);
    toast.error('Не удалось поставить лайк');
  }
}
```

### 3. Кэширование проверки сохранения

```typescript
const savedEventsCache = new Set<string>();

async function checkSaved(eventId: string) {
  if (savedEventsCache.has(eventId)) {
    return true;
  }
  
  const { isSaved } = await fetch(`/api/v1/account/me/saved-events/${eventId}/check`);
  if (isSaved) {
    savedEventsCache.add(eventId);
  }
  return isSaved;
}
```

---

## 📱 Адаптивность

### Мобильные устройства

1. **Комментарии:**
   - Уменьшенные аватары (24px)
   - Меньший шрифт для метаданных
   - Кнопка "Ответить" → иконка

2. **Сохранённые:**
   - Swipe для удаления
   - Компактные карточки

3. **Форма комментария:**
   - Автофокус при "Ответить"
   - Кнопка "Отправить" всегда видна

---

## 🧪 Тестирование

### Примеры unit-тестов

```typescript
describe('SaveButton', () => {
  it('should check saved status on mount', async () => {
    render(<SaveButton eventId="123" />);
    await waitFor(() => {
      expect(screen.getByText(/Сохранено/i)).toBeInTheDocument();
    });
  });

  it('should toggle save state', async () => {
    render(<SaveButton eventId="123" />);
    const button = screen.getByRole('button');
    
    await userEvent.click(button);
    
    expect(button).toHaveTextContent(/Сохранено/i);
  });
});
```

---

## 🚀 Готово к использованию!

Все эндпоинты задокументированы в Swagger: `http://localhost:3000/api/docs`

При возникновении вопросов:
- 📄 Полная документация: `docs/EVENT_ENHANCEMENTS_API.md`
- 🏗️ Архитектура: `docs/EVENT_ENHANCEMENTS_ARCHITECTURE.md`
