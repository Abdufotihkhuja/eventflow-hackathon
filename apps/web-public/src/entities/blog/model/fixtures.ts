/**
 * @module entities/blog/model/fixtures
 * @description Демо-данные для блог-статей
 */

import type { BlogPost, BlogAuthor, BlogPostCategory, KnownBlogCategory } from "./types";
import { CATEGORY_LABELS } from "../lib/formatters";

/** Строит демо-объект категории из известного слага. */
function mockCategory(slug: KnownBlogCategory): BlogPostCategory {
  return { id: slug, slug, name: CATEGORY_LABELS[slug] };
}

export const BLOG_AUTHORS: BlogAuthor[] = [
  {
    id: "1",
    name: "Мария Иванова",
    bio: "Эксперт по event-маркетингу с 10+ летним опытом. Помогаю организаторам создавать успешные мероприятия и продвигать их через digital-каналы.",
    role: "Главный редактор и Event-маркетолог",
    articlesCount: 24,
    socialLinks: {
      linkedin: "https://linkedin.com/in/maria-ivanova",
      instagram: "https://instagram.com/maria.event",
    },
  },
  {
    id: "2",
    name: "Александр Петров",
    bio: "Специалист по организации мероприятий любого масштаба. От камерных встреч до фестивалей на 10,000+ человек.",
    role: "Event-менеджер и консультант",
    articlesCount: 18,
    socialLinks: {
      linkedin: "https://linkedin.com/in/alexander-petrov",
      facebook: "https://facebook.com/alex.petrov.events",
    },
  },
  {
    id: "3",
    name: "Елена Смирнова",
    bio: "Digital-маркетолог и event-стратег. Специализируюсь на продвижении мероприятий в социальных сетях и работе с influencers.",
    role: "Digital-маркетолог",
    articlesCount: 15,
    socialLinks: {
      instagram: "https://instagram.com/elena.smirn",
      linkedin: "https://linkedin.com/in/elena-smirnova",
    },
  },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "1",
    slug: "seasonal-event-trends",
    title: "Сезонные тренды и инсайты для увеличения продаж билетов",
    excerpt:
      "Праздничный сезон наполнен возможностями. С ростом потребительских расходов на впечатления — увеличение на 16% в 2024 году — самое время проводить праздничные мероприятия.",
    content: `
# Сезонные тренды и инсайты для увеличения продаж билетов

Праздничный сезон наполнен возможностями. С ростом потребительских расходов на впечатления — увеличение на 16% в 2024 году, по данным Deloitte — самое время проводить праздничные мероприятия, которые привлекут толпы.

## Почему сезонные мероприятия работают

Люди ищут уникальные способы отпраздновать важные моменты в году. Будь то рождественская ярмарка, летний музыкальный фестиваль или новогодняя вечеринка — сезонные мероприятия создают эмоциональную связь с аудиторией.

## Ключевые тренды 2025

1. **Гибридные форматы** — сочетание офлайн и онлайн форматов
2. **Устойчивое развитие** — эко-френдли подход к организации
3. **Персонализация** — индивидуальный опыт для каждого гостя
4. **Технологии** — AR/VR элементы на мероприятиях

## Как увеличить продажи

- Начинайте продвижение за 2-3 месяца
- Используйте ранние птички-скидки
- Активно работайте с соцсетями
- Создавайте FOMO-эффект

Следуя этим трендам, вы сможете значительно увеличить продажи билетов и создать незабываемое мероприятие.
    `,
    coverImage: "/images/image.png",
    category: mockCategory("tips-guides"),
    tags: ["trends", "beginner-guide"],
    author: BLOG_AUTHORS[0],
    publishedAt: "2024-11-10T10:00:00Z",
    readTime: 5,
    featured: true,
    trending: true,
  },
  {
    id: "2",
    slug: "halloween-event-promotion",
    title: "Как продвигать Halloween-мероприятия: 15 страшно хороших трюков",
    excerpt:
      "Хотите распродать билеты на ваше Halloween-мероприятие? Ранний старт продаж — ключ к успеху. Узнайте проверенные стратегии продвижения.",
    content: `
# Как продвигать Halloween-мероприятия

Halloween — один из самых прибыльных периодов для event-индустрии. Вот как выделиться среди конкурентов.

## 15 стратегий продвижения

1. Запустите продажи за 6-8 недель до мероприятия
2. Создайте интригующий визуал с тематикой хоррора
3. Используйте инфлюенсеров для промо
4. Организуйте конкурс костюмов с призами
5. Предложите групповые скидки

...и еще 10 эффективных тактик в полной статье!
    `,
    coverImage: "/images/image1.png",
    category: mockCategory("event-marketing"),
    tags: ["halloween", "social-media"],
    author: BLOG_AUTHORS[2],
    publishedAt: "2024-11-05T14:00:00Z",
    readTime: 8,
    trending: true,
  },
  {
    id: "3",
    slug: "email-marketing-music-events",
    title: "Продвинутые стратегии email-маркетинга для музыкальных мероприятий",
    excerpt:
      "Узнайте, как использовать email-маркетинг для превращения подписчиков в посетителей sold-out концертов. Проверенные стратегии и инструменты Eventflow.",
    content: `
# Email-маркетинг для музыкальных событий

Email остается одним из самых эффективных каналов для продвижения мероприятий с конверсией до 15%.

## Структура эффективного письма

- Цепляющая тема письма
- Персонализация по имени и предпочтениям
- Визуальные материалы артистов
- Четкий CTA с кнопкой покупки
- Дедлайны и ограниченность

## Автоматизация кампаний

Настройте автоматические цепочки:
1. Приветственное письмо
2. Напоминание за неделю
3. Last chance за 24 часа
4. Post-event follow-up

Результат: +40% к продажам билетов.
    `,
    coverImage: "/images/image2.png",
    category: mockCategory("event-marketing"),
    tags: ["music", "event-technology"],
    author: BLOG_AUTHORS[0],
    publishedAt: "2024-11-01T09:00:00Z",
    readTime: 7,
    featured: true,
  },
  {
    id: "4",
    slug: "social-media-strategies",
    title:
      "Стратегии продвижения в соцсетях для музыкальных и культурных мероприятий",
    excerpt:
      "Соцсети — не просто место для скролла, это место, где открывается следующая большая ночь. Наш гид по social media поможет сделать каждый скролл значимым.",
    content: `
# Social Media для мероприятий

В 2025 году социальные сети — основной канал discovery для event-аудитории.

## Платформы и стратегии

### Instagram
- Stories для behind-the-scenes
- Reels с хайлайтами прошлых событий
- Коллаборации с артистами

### TikTok  
- Вирусные челленджи
- User-generated content
- Influencer partnerships

### Facebook
- Event pages
- Targeted ads
- Community building

## Метрики успеха

Отслеживайте:
- Reach и impressions
- Engagement rate
- Конверсию в продажи
- UGC mentions

Правильная стратегия в соцсетях может увеличить продажи на 200%.
    `,
    coverImage: "/images/moscow.jpg",
    category: mockCategory("event-marketing"),
    tags: ["social-media", "music"],
    author: BLOG_AUTHORS[2],
    publishedAt: "2024-10-28T11:00:00Z",
    readTime: 10,
  },
  {
    id: "5",
    slug: "music-fans-report-2025",
    title: "Отчет о музыкальных фанатах 2025",
    excerpt:
      "Страсть музыкальных фанатов к живой музыке непоколебима. Вот почему они — главный акт нашего ежегодного музыкального отчета.",
    content: `
# Music Fans Report 2025

Мы провели исследование среди 5000+ музыкальных фанатов и вот что узнали.

## Ключевые находки

- 78% посещают минимум 3 концерта в год
- 62% готовы ехать в другой город ради любимого артиста
- 45% покупают билеты в первый день продаж
- 89% следят за артистами в соцсетях

## Что важно для фанатов

1. **Лайн-ап** — состав артистов решает всё
2. **Цена** — должна быть справедливой
3. **Локация** — доступность и атмосфера
4. **Опыт** — уникальные моменты

## Рекомендации организаторам

Создавайте контент вокруг артистов, предлагайте VIP-пакеты, используйте динамический pricing.
    `,
    coverImage: "/images/new-york.jpg",
    category: mockCategory("news-trends"),
    tags: ["music", "trends"],
    author: BLOG_AUTHORS[1],
    publishedAt: "2024-10-25T08:00:00Z",
    readTime: 6,
    featured: true,
  },
  {
    id: "6",
    slug: "event-budgeting-tips",
    title: "Сэкономьте деньги с советами по бюджетированию от профи",
    excerpt:
      "Профессиональные советы по управлению бюджетом мероприятия, которые помогут сэкономить тысячи рублей без ущерба качеству.",
    content: `
# Бюджетирование мероприятий: гид от экспертов

Правильное планирование бюджета может сэкономить до 30% расходов.

## Структура бюджета

- Площадка: 30-40%
- Кейтеринг: 20-25%
- Техника: 15-20%
- Маркетинг: 10-15%
- Резерв: 10%

## Где можно сэкономить

1. Выбирайте непиковые даты
2. Договаривайтесь о пакетных услугах
3. Используйте digital-промо вместо печати
4. Ищите начинающих, но талантливых подрядчиков

## Инструменты учета

Используйте Google Sheets, Notion или специализированные event-планировщики для отслеживания всех расходов.
    `,
    coverImage: "/images/london.jpg",
    category: mockCategory("event-management"),
    tags: ["beginner-guide"],
    author: BLOG_AUTHORS[1],
    publishedAt: "2024-10-20T13:00:00Z",
    readTime: 8,
  },
];

export const FEATURED_POSTS = BLOG_POSTS.filter((post) => post.featured);
export const TRENDING_POSTS = BLOG_POSTS.filter((post) => post.trending);
