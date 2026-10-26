import type { Event, EventDetail } from "./types";

export const eventsFixture: Event[] = [
  {
    id: "eventflow-summit-2025",
    slug: "eventflow-summit-2025",
    title: "Eventflow Summit 2025",
    description:
      "Официальная конференция для организаторов событий: продвинутые практики, цифровой контроль доступа и управление командами в Eventflow.",
    format: "offline",
    location: "Москва, Digital October",
    allowsGroupRegistration: true,
    hasUnlimitedCapacity: false,
    capacity: 250,
    hasCertificate: true,
    category: "conference",
    startDate: "2025-03-18T09:00:00+03:00",
    endDate: "2025-03-19T18:00:00+03:00",
    access: "open",
    pricing: "paid",
    price: 3500,
    tags: ["конференция", "сертификат", "офлайн"],
    isHighlighted: true,
  },
  {
    id: "eventflow-global-hackathon",
    slug: "eventflow-global-hackathon",
    title: "Global Hackathon by Eventflow",
    description:
      "72-часовой марафон для инженеров и дизайнеров. Создаём инструменты для управления мероприятиями, автоматизируем отмечания присутствия и верификацию участников.",
    format: "hybrid",
    location: "Санкт-Петербург, IT Hub + онлайн",
    allowsGroupRegistration: true,
    hasUnlimitedCapacity: false,
    capacity: 60,
    hasCertificate: false,
    category: "hackathon",
    startDate: "2025-04-11T10:00:00+03:00",
    endDate: "2025-04-13T20:00:00+03:00",
    access: "invite",
    pricing: "free",
    tags: ["хакатон", "гибрид", "командное"],
  },
  {
    id: "eventflow-online-academy",
    slug: "eventflow-online-academy",
    title: "Eventflow Academy: Онлайн-курс для координаторов",
    description:
      "Онлайн-программа из восьми модулей: автоматизация регистрации, аналитика посещаемости, работа с QR-приглашениями и интеграция с CRM.",
    format: "online",
    location: "Виртуально — онлайн",
    allowsGroupRegistration: false,
    hasUnlimitedCapacity: true,
    hasCertificate: true,
    category: "business-training",
    startDate: "2025-02-03T19:00:00+03:00",
    access: "open",
    pricing: "paid",
    price: 5900,
    tags: ["онлайн", "сертификат", "обучение"],
  },
  {
    id: "eventflow-community-meetup",
    slug: "eventflow-community-meetup",
    title: "Eventflow Community Meetup",
    description:
      "Ежемесячная встреча сообщества Eventflow для обмена опытом: короткие доклады, нетворкинг и демонстрации новых фич платформы.",
    format: "offline",
    location: "Казань, технопарк IT-парк",
    allowsGroupRegistration: true,
    hasUnlimitedCapacity: false,
    capacity: 120,
    hasCertificate: false,
    category: "forum",
    startDate: "2025-02-26T18:30:00+03:00",
    access: "open",
    pricing: "free",
    tags: ["митап", "офлайн", "сообщество"],
  },
  {
    id: "eventflow-private-briefing",
    slug: "eventflow-private-briefing",
    title: "Private Briefing: Корпоративная безопасность",
    description:
      "Закрытая офлайн-сессия для крупных компаний: кейсы по управлению пропусками, интеграция Eventflow с внутренними системами и контроль доступа.",
    format: "offline",
    location: "Москва, HQ Eventflow",
    allowsGroupRegistration: false,
    hasUnlimitedCapacity: false,
    capacity: 30,
    hasCertificate: false,
    category: "conference",
    startDate: "2025-03-05T10:00:00+03:00",
    access: "private",
    pricing: "paid",
    price: 7800,
    tags: ["закрытое", "офлайн", "бизнес"],
  },
  {
    id: "eventflow-open-day",
    slug: "eventflow-open-day",
    title: "Eventflow Open Day",
    description:
      "Открытое знакомство с платформой Eventflow: демо-стенды, мастер-классы, консультации по запуску событий и настройке потоков участия.",
    format: "hybrid",
    location: "Новосибирск, Академпарк + онлайн",
    allowsGroupRegistration: true,
    hasUnlimitedCapacity: true,
    hasCertificate: false,
    category: "business-meetings",
    startDate: "2025-05-16T11:00:00+07:00",
    access: "open",
    pricing: "free",
    tags: ["открытое", "гибрид"],
  },
  {
    id: "eventflow-certification-workshop",
    slug: "eventflow-certification-workshop",
    title: "Certification Workshop: Eventflow Pro Coordinator",
    description:
      "Практический тренинг с кейсами и экзаменом. По итогам — официальный сертификат координатора Eventflow уровня Pro.",
    format: "offline",
    location: "Екатеринбург, Eventflow Hub",
    allowsGroupRegistration: false,
    hasUnlimitedCapacity: false,
    capacity: 40,
    hasCertificate: true,
    category: "workshops",
    startDate: "2025-06-07T09:30:00+05:00",
    endDate: "2025-06-07T18:00:00+05:00",
    access: "invite",
    pricing: "paid",
    price: 4200,
    tags: ["сертификат", "тренинг"],
  },
  {
    id: "eventflow-digital-security-lab",
    slug: "eventflow-digital-security-lab",
    title: "Digital Security Lab",
    description:
      "Капсульный лабораторный формат для команд по кибербезопасности: симуляции атак на систему пропусков и быстрый ответ через Eventflow.",
    format: "online",
    location: "Виртуально — онлайн",
    allowsGroupRegistration: true,
    hasUnlimitedCapacity: false,
    capacity: 18,
    hasCertificate: false,
    category: "conference",
    startDate: "2025-02-20T17:00:00+03:00",
    access: "invite",
    pricing: "paid",
    price: 8900,
    tags: ["лаборатория", "онлайн", "безопасность"],
  },
  {
    id: "new-york-virtual-job-fair",
    slug: "new-york-virtual-job-fair",
    title: "New York Virtual Job Fair",
    description:
      "Онлайн-ярмарка вакансий для соискателей Нью-Йорка: прямое общение с работодателями и рекрутерами, быстрые интервью и карьерные консультации.",
    format: "online",
    location: "Виртуально — онлайн",
    allowsGroupRegistration: false,
    hasUnlimitedCapacity: true,
    hasCertificate: false,
    category: "forum",
    startDate: "2025-12-11T10:00:00-05:00",
    endDate: "2025-12-11T14:00:00-05:00",
    access: "open",
    pricing: "free",
    tags: ["виртуально", "карьера", "job fair"],
    imageUrl: "/images/image.png",
    isHighlighted: true,
  },
];

const FALLBACK_FORMAT_LABEL: Record<Event["format"], string> = {
  online: "Онлайн",
  offline: "Офлайн",
  hybrid: "Гибрид",
};

const FALLBACK_ACCESS_LABEL: Record<Event["access"], string> = {
  open: "Открыто",
  request: "По запросу",
  invite: "По приглашению",
  private: "Приватно",
};

const FALLBACK_CATEGORY_LABEL: Record<Event["category"], string> = {
  "business-training": "Бизнес-тренинг",
  "business-meetings": "Бизнес встречи",
  workshops: "Воркшопы",
  conference: "Конференции",
  forum: "Форумы",
  hackathon: "Хакатон",
  ideathon: "Идеатон",
};

function buildEventDetail(
  event: Event,
  detail: Omit<EventDetail, keyof Event>
): EventDetail {
  return {
    ...event,
    ...detail,
    slug: event.slug ?? event.id,
  };
}

export const eventDetailsFixture: EventDetail[] = [
  buildEventDetail(eventsFixture[0], {
    summary:
      "Двухдневная конференция для лидеров событийного рынка: стратегии цифрового контроля доступа, автоматизация чек-ина, best-practices по работе с данными и интеграциями Eventflow.",
    heroBadge: "Главная конференция Eventflow",
    heroTagline:
      "Собираем экспертов и организаторов, чтобы построить масштабные события без хаоса и бумажной бюрократии.",
    heroMetrics: [
      {
        label: "Треков",
        value: "4",
        hint: "Стратегия, продукты, безопасность, технологии",
      },
      {
        label: "Спикеров",
        value: "28",
        hint: "Практики из Eventflow и партнёров",
      },
      { label: "Дней", value: "2", hint: "Очные выступления и воркшопы" },
    ],
    primaryCta: {
      label: "Забронировать билет",
      href: "/register/eventflow-summit-2025",
    },
    secondaryCta: {
      label: "Скачать программу",
      href: "/assets/programs/eventflow-summit-2025.pdf",
    },
    highlights: [
      {
        id: "control",
        title: "Контроль доступа 360°",
        description:
          "Пошаговые сценарии контроля прохода: от эмиссии QR до анализа загруженности зон и SLA бэк-офиса.",
        icon: "shield-check",
      },
      {
        id: "automation",
        title: "Автоматизация потоков",
        description:
          "Разбор кейсов по автоматизации регистрации команд и корпоративных квот, интеграция с HR и CRM.",
        icon: "workflow",
      },
      {
        id: "analytics",
        title: "Аналитика в реальном времени",
        description:
          "Интерактивные дешборды Eventflow: живые дэмо, best practices по мониторингу и алертам.",
        icon: "bar-chart-3",
      },
      {
        id: "networking",
        title: "Нетворкинг",
        description:
          "Умный матчинг участников, встречи 1:1 и закрытый брифинг для enterprise-заказчиков.",
        icon: "users",
      },
    ],
    schedule: [
      {
        id: "day1-registration",
        title: "Регистрация и welcome-завтрак",
        startTime: "2025-03-18T08:30:00+03:00",
        endTime: "2025-03-18T09:30:00+03:00",
        description: "Ранний чек-ин, выдача бейджей, демо-зона Eventflow.",
        type: "registration",
      },
      {
        id: "day1-keynote",
        title: "Keynote: Eventflow roadmap 2025",
        startTime: "2025-03-18T09:45:00+03:00",
        endTime: "2025-03-18T10:30:00+03:00",
        speakerId: "speaker-romanov",
        description:
          "Главные релизы, новые API и планы по масштабированию платформы.",
        type: "keynote",
      },
      {
        id: "day1-panel",
        title: "Панель: Безопасность крупных событий",
        startTime: "2025-03-18T11:00:00+03:00",
        endTime: "2025-03-18T12:15:00+03:00",
        speakerId: "speaker-volkova",
        description:
          "Практики СИБ, юридические риски, интеграция с физической охраной.",
        type: "panel",
      },
      {
        id: "day1-workshop",
        title: "Воркшоп: Настройка потоков Eventflow",
        startTime: "2025-03-18T14:00:00+03:00",
        endTime: "2025-03-18T15:45:00+03:00",
        speakerId: "speaker-zhdanov",
        description:
          "Работаем в песочнице Eventflow: сегменты, RFID, QR, SLA обработки заявок.",
        type: "workshop",
      },
      {
        id: "day1-networking",
        title: "Бизнес-нетворкинг",
        startTime: "2025-03-18T17:30:00+03:00",
        endTime: "2025-03-18T19:00:00+03:00",
        description:
          "Кураторские сессии, мэтчинг по интересам, корпоративные треки.",
        type: "networking",
      },
      {
        id: "day2-closing",
        title: "Закрывающий релиз: AI-помощник Eventflow",
        startTime: "2025-03-19T16:30:00+03:00",
        endTime: "2025-03-19T17:15:00+03:00",
        speakerId: "speaker-romanov",
        description: "Презентация AI-сценариев и roadmap внедрения в продукт.",
        type: "keynote",
      },
    ],
    speakers: [
      {
        id: "speaker-romanov",
        firstName: "Алексей",
        lastName: "Романов",
        role: "CEO Eventflow",
        bio: "Инициатор Eventflow, строит платформу для больших событий. Эксперт по цифровой трансформации мероприятий.",
        company: "Eventflow",
        socials: [
          {
            platform: "linkedin",
            url: "https://www.linkedin.com/in/a-romanov",
          },
        ],
      },
      {
        id: "speaker-volkova",
        firstName: "Мария",
        lastName: "Волкова",
        role: "Директор по безопасности, Eventflow",
        bio: "15 лет в event security, выстроила практики контроля входа для мероприятий на 40k+ гостей.",
        company: "Eventflow",
        socials: [{ platform: "telegram", url: "https://t.me/mvolkova" }],
      },
      {
        id: "speaker-zhdanov",
        firstName: "Илья",
        lastName: "Жданов",
        role: "Head of Product Integrations",
        bio: "Запускает API и партнерские интеграции Eventflow, отвечает за пайплайн CRM/ERP-подключений.",
        company: "Eventflow",
      },
    ],
    logistics: {
      venue: "Digital October",
      address: "Москва, Берсеневская наб., 6, стр. 3",
      mapUrl: "https://maps.example.uz/digital-october",
      timezone: "GMT+3 (Москва)",
      registrationOpens: "2025-03-18T08:00:00+03:00",
      registrationCloses: "2025-03-19T16:00:00+03:00",
      accessNotes:
        "Возьмите удостоверение личности. Для VIP и команд предусмотрены отдельные линии регистрации.",
    },
    resources: [
      {
        id: "resource-agenda",
        label: "Подробная программа",
        description: "PDF с расписанием и спикерами по трекам",
        href: "/assets/programs/eventflow-summit-2025.pdf",
      },
      {
        id: "resource-travel",
        label: "Гид по логистике",
        description: "Как добраться, партнерские отели и промокоды",
        href: "/assets/guides/eventflow-summit-travel.pdf",
      },
    ],
    faqs: [
      {
        id: "faq-access",
        question: "Можно ли передать билет коллеге?",
        answer:
          "Да, но не позднее чем за 48 часов до старта. Обновите данные участника в личном кабинете Eventflow.",
      },
      {
        id: "faq-stream",
        question: "Будет ли онлайн-трансляция?",
        answer:
          'Трансляция доступна holders Pro-билетов в разделе "Мои события". Записи рассылаем в течение 48 часов.',
      },
      {
        id: "faq-parking",
        question: "Есть ли парковка?",
        answer:
          "Есть лимитированная парковка на территории Digital October. Просим бронировать слоты заранее через concierge@eventflow.io.",
      },
    ],
  }),
  buildEventDetail(eventsFixture[1], {
    summary:
      "72-часовой хакатон: создаём прототипы для экосистемы Eventflow — от новых сценариев чек-ина до аналитики посещаемости.",
    heroBadge: "Хакатон Eventflow",
    heroTagline:
      "Соберите команду и реализуйте идею для платформы Eventflow. Локальный и удалённый форматы — одинаковые правила.",
    heroMetrics: [
      { label: "Команд", value: "60", hint: "По 3-5 участников" },
      { label: "Призовой фонд", value: "1 500 000 ₽" },
      { label: "Менторы", value: "18", hint: "Эксперты Eventflow и партнёров" },
    ],
    primaryCta: {
      label: "Подать заявку",
      href: "/apply/eventflow-global-hackathon",
    },
    secondaryCta: {
      label: "Пакет участника",
      href: "/assets/packs/eventflow-hackathon-starter.zip",
    },
    highlights: [
      {
        id: "lab",
        title: "Инфраструктура 24/7",
        description:
          "Рабочие зоны, лаборатории устройств, тестовые стенды для QR и RFID.",
        icon: "cpu",
      },
      {
        id: "mentors",
        title: "Личный ментор",
        description:
          "Каждая команда получает консультанта по продукту Eventflow.",
        icon: "user-circle",
      },
      {
        id: "deployment",
        title: "Доставим в прод",
        description:
          "Лучшие решения встраиваем в Eventflow — контракт и сопровождение.",
        icon: "rocket",
      },
    ],
    schedule: [
      {
        id: "hack-checkin",
        title: "Очный чек-ин и запуск стрима",
        startTime: "2025-04-11T09:00:00+03:00",
        endTime: "2025-04-11T10:00:00+03:00",
        description:
          "Открытие площадки, проверка доступа, раздача стартер-паков.",
        type: "registration",
      },
      {
        id: "hack-brief",
        title: "Бриф: Задачи и критерии",
        startTime: "2025-04-11T10:15:00+03:00",
        endTime: "2025-04-11T11:00:00+03:00",
        speakerId: "speaker-sidorov",
        description: "Детали заданий, технические ограничения, доступ к API.",
        type: "keynote",
      },
      {
        id: "hack-checkpoint",
        title: "Checkpoint 1",
        startTime: "2025-04-12T12:00:00+03:00",
        description:
          "Средний статус команд, синхронизация с менторами, Q&A для remote.",
        type: "panel",
      },
      {
        id: "hack-demo",
        title: "Демо-питч",
        startTime: "2025-04-13T17:00:00+03:00",
        endTime: "2025-04-13T19:00:00+03:00",
        description: "5-минутные выступления, живое тестирование решений жюри.",
        type: "panel",
      },
    ],
    speakers: [
      {
        id: "speaker-sidorov",
        firstName: "Павел",
        lastName: "Сидоров",
        role: "CTO Eventflow",
        bio: "Отвечает за техническую платформу Eventflow. Специализируется на высоконагруженных системах и realtime-аналитике.",
        company: "Eventflow",
      },
      {
        id: "speaker-garcia",
        firstName: "Elena",
        lastName: "Garcia",
        role: "Product Lead, Eventflow",
        bio: "Куратор API и партнерских сервисов. Ведёт направления QR, RFID и mobile.",
        company: "Eventflow EU",
      },
    ],
    logistics: {
      venue: "IT Hub, Санкт-Петербург",
      address: "Биржевая линия, 16 + удалённо",
      mapUrl: "https://maps.example.uz/it-hub-spb",
      timezone: "GMT+3 (Москва)",
      registrationOpens: "2025-04-11T08:30:00+03:00",
      accessNotes:
        "Remote-команды получают доступ в Discord и Eventflow Sandbox за 48 часов до старта.",
    },
    resources: [
      {
        id: "resource-guidelines",
        label: "Правила хакатона",
        href: "/assets/guides/eventflow-hackathon-rules.pdf",
      },
      {
        id: "resource-api",
        label: "API Sandbox",
        href: "https://sandbox.eventflow.dev",
      },
    ],
    faqs: [
      {
        id: "faq-team",
        question: "Можно участвовать без команды?",
        answer:
          "Да, у нас есть matchmaking. Укажите формат участия при регистрации, и мы подберём команду до старта.",
      },
      {
        id: "faq-remote",
        question: "Как работает удалённый формат?",
        answer:
          "Удалённые участники подключаются к общему Discord, получают общий стрим и выделенных менторов. Питч — через общий эфир.",
      },
    ],
  }),
  buildEventDetail(eventsFixture[2], {
    summary:
      "Восьминедельная онлайн-программа для координаторов: выстраиваем процессы регистрации, работы со списками и аналитики посещаемости.",
    heroBadge: "Онлайн-курс",
    heroTagline:
      "Для менеджеров, которые хотят управлять событиями на платформе Eventflow уверенно и без хаоса.",
    heroMetrics: [
      { label: "Модулей", value: "8" },
      { label: "Часов практики", value: "24" },
      { label: "Наставников", value: "6" },
    ],
    primaryCta: {
      label: "Забронировать слот",
      href: "/enroll/eventflow-online-academy",
    },
    secondaryCta: {
      label: "Скачать учебный план",
      href: "/assets/programs/eventflow-academy-curriculum.pdf",
    },
    highlights: [
      {
        id: "mentoring",
        title: "Наставник в каждой группе",
        description: "Практик Eventflow сопровождает и проверяет задания.",
        icon: "graduation-cap",
      },
      {
        id: "capstone",
        title: "Защита кейса",
        description:
          "Финальный проект — полноценный план события на Eventflow.",
        icon: "presentation",
      },
      {
        id: "certificate",
        title: "Сертификат Pro",
        description: "Подтверждает знания по управлению потоками Eventflow.",
        icon: "badge-check",
      },
    ],
    schedule: [
      {
        id: "academy-module1",
        title: "Модуль 1: Основы Eventflow",
        startTime: "2025-02-03T19:00:00+03:00",
        description:
          "Структура платформы, ролевые модели, базовые сценарии регистрации.",
        type: "workshop",
      },
      {
        id: "academy-module4",
        title: "Модуль 4: Интеграции и API",
        startTime: "2025-02-24T19:00:00+03:00",
        description: "Подключение CRM, webhooks и автоматизация коммуникаций.",
        type: "workshop",
      },
      {
        id: "academy-capstone",
        title: "Защита проекта",
        startTime: "2025-03-24T19:00:00+03:00",
        description: "Презентация кейсов и обратная связь от методистов.",
        type: "panel",
      },
    ],
    speakers: [
      {
        id: "speaker-larionova",
        firstName: "Анна",
        lastName: "Ларионова",
        role: "Methodology Lead",
        bio: "Создаёт обучающие программы Eventflow Academy, 12 лет опыта в подготовке координаторов.",
        company: "Eventflow",
      },
      {
        id: "speaker-kim",
        firstName: "Даниил",
        lastName: "Ким",
        role: "Customer Success Lead",
        bio: "Сопровождает enterprise-заказчиков, выстраивает процессы дата-анализa посещаемости.",
        company: "Eventflow",
      },
    ],
    logistics: {
      timezone: "GMT+3 (Москва)",
      registrationOpens: "2025-01-15T10:00:00+03:00",
      registrationCloses: "2025-02-01T23:59:00+03:00",
      accessNotes:
        "Онлайн-формат в платформе Eventflow: записи доступны в течение 90 дней после окончания курса.",
    },
    resources: [
      {
        id: "resource-syllabus",
        label: "Учебный план",
        href: "/assets/programs/eventflow-academy-curriculum.pdf",
      },
      {
        id: "resource-demo",
        label: "Демо платформы",
        href: "https://demo.eventflow.io",
      },
    ],
    faqs: [
      {
        id: "faq-recordings",
        question: "Сколько времени доступна запись?",
        answer:
          "90 дней после завершения курса, затем доступ можно продлить по запросу.",
      },
      {
        id: "faq-payment",
        question: "Можно оплатить по счёту?",
        answer:
          "Да, напишите на academy@eventflow.io, пришлём счёт в течение одного рабочего дня.",
      },
    ],
  }),
  buildEventDetail(eventsFixture[3], {
    summary:
      "Ежемесячная встреча сообщества Eventflow: мини-доклады, демо новых фич и нетворкинг для координаторов и подрядчиков.",
    heroBadge: "Комьюнити митап",
    heroTagline:
      "Живое общение с командой Eventflow и практиками, которые строят события на платформе.",
    heroMetrics: [
      { label: "Докладов", value: "5" },
      { label: "Демо-зона", value: "3", hint: "Новые функции Eventflow" },
      { label: "Формат", value: "Офлайн" },
    ],
    primaryCta: {
      label: "Зарегистрироваться",
      href: "/events/eventflow-community-meetup/register",
    },
    highlights: [
      {
        id: "updates",
        title: "Апдейты продукта",
        description: "Показываем свежие релизы и рассказываем планы.",
        icon: "sparkles",
      },
      {
        id: "success",
        title: "Кейс месяца",
        description: "Организатор делится практиками по Eventflow.",
        icon: "trophy",
      },
      {
        id: "networking",
        title: "Сессии 1:1",
        description: "Помогаем подобрать партнёров и подрядчиков.",
        icon: "handshake",
      },
    ],
    schedule: [
      {
        id: "meetup-checkin",
        title: "Чек-ин и welcome-кофе",
        startTime: "2025-02-26T18:00:00+03:00",
        endTime: "2025-02-26T18:30:00+03:00",
        type: "registration",
      },
      {
        id: "meetup-updates",
        title: "Апдейты продукта",
        startTime: "2025-02-26T18:35:00+03:00",
        speakerId: "speaker-zhdanov",
        type: "keynote",
      },
      {
        id: "meetup-case",
        title: "Кейс: Оцифровка форума",
        startTime: "2025-02-26T19:10:00+03:00",
        speakerId: "speaker-ivanova",
        description:
          "Как региональный форум перевели на Eventflow за 4 недели.",
        type: "panel",
      },
      {
        id: "meetup-networking",
        title: "Нетворкинг",
        startTime: "2025-02-26T20:00:00+03:00",
        type: "networking",
      },
    ],
    speakers: [
      {
        id: "speaker-ivanova",
        firstName: "Екатерина",
        lastName: "Иванова",
        role: "Event Producer",
        bio: "Организует городские форумы на Eventflow, специализируется на работе с партнёрами.",
        company: "NewCity Events",
      },
      {
        id: "speaker-zhdanov",
        firstName: "Илья",
        lastName: "Жданов",
        role: "Head of Product Integrations",
        bio: "Куратор релизов Eventflow для сообществ и партнёров.",
        company: "Eventflow",
      },
    ],
    logistics: {
      venue: "IT-парк",
      address: "Казань, ул. Петербургская, 52",
      mapUrl: "https://maps.example.uz/it-park-kazan",
      timezone: "GMT+3 (Москва)",
      registrationOpens: "2025-02-01T12:00:00+03:00",
      accessNotes:
        "Паспорт или водительское удостоверение для входа. Для партнёров доступны стенды в демо-зоне.",
    },
    faqs: [
      {
        id: "faq-stream",
        question: "Есть ли трансляция?",
        answer: "Нет, митап только офлайн. Запись докладов публикуем в блоге.",
      },
    ],
  }),
  buildEventDetail(eventsFixture[4], {
    summary:
      "Закрытая сессия для enterprise-команд: суставим карту рисков, строим стратегию безопасности и интеграции.",
    heroBadge: "Private Briefing",
    heroTagline:
      "Работаем в малой группе с руководителями безопасности и event-менеджерами крупнейших компаний.",
    heroMetrics: [
      { label: "Участников", value: "30" },
      { label: "Сессий", value: "5" },
      { label: "Формат", value: "Закрытый" },
    ],
    primaryCta: {
      label: "Запросить приглашение",
      href: "/request/eventflow-private-briefing",
    },
    highlights: [
      {
        id: "audit",
        title: "Безопасность",
        description:
          "Проверка процессов доступа, политика инцидентов, нормативка.",
        icon: "shield",
      },
      {
        id: "integration",
        title: "Интеграции",
        description: "Сшиваем Eventflow с системами пропусков и ERP.",
        icon: "server",
      },
      {
        id: "roadmap",
        title: "Индивидуальная дорожная карта",
        description:
          "Формируем план внедрения Eventflow под ваш enterprise-контур.",
        icon: "map",
      },
    ],
    schedule: [
      {
        id: "brief-welcome",
        title: "Welcome и introduction",
        startTime: "2025-03-05T09:30:00+03:00",
        type: "keynote",
      },
      {
        id: "brief-audit",
        title: "Workshop: Процессный аудит",
        startTime: "2025-03-05T10:15:00+03:00",
        type: "workshop",
      },
      {
        id: "brief-roadmap",
        title: "Roadmap session",
        startTime: "2025-03-05T14:30:00+03:00",
        type: "panel",
      },
    ],
    speakers: [
      {
        id: "speaker-romanov",
        firstName: "Алексей",
        lastName: "Романов",
        role: "CEO Eventflow",
        bio: "Строит Eventflow для масштабных enterprise-сценариев.",
        company: "Eventflow",
      },
      {
        id: "speaker-smirnov",
        firstName: "Георгий",
        lastName: "Смирнов",
        role: "Chief Security Officer",
        bio: "Отвечает за безопасность Eventflow в регионах EMEA.",
        company: "Eventflow",
      },
    ],
    logistics: {
      venue: "Eventflow HQ",
      address: "Москва, ул. Николова, 12",
      timezone: "GMT+3 (Москва)",
      accessNotes:
        "При входе требуется NDA. Детали участия подтверждаем персонально.",
    },
  }),
  buildEventDetail(eventsFixture[8], {
    summary:
      "Виртуальная ярмарка вакансий Best Hire Career Fairs: десятки работодателей Нью-Йорка, возможность пообщаться с рекрутерами в реальном времени и выйти на собеседование за одно утро.",
    heroBadge: "Virtual Job Fair",
    heroTagline:
      "Подключайтесь из любой точки и встретитесь с hiring-менеджерами ведущих компаний Нью-Йорка за один день.",
    heroMetrics: [
      { label: "Компаний", value: "35+", hint: "Hiring-менеджеры и рекрутеры" },
      {
        label: "Вакансий",
        value: "120+",
        hint: "От стажировок до middle-позиций",
      },
      { label: "Формат", value: "100% online" },
    ],
    heroImage: "/images/image.png",
    heroImageAlt: "Онлайн-интервью на виртуальной ярмарке вакансий",
    gallery: [
      { src: "/images/image.png", alt: "Виртуальная конференц-комната" },
      { src: "/images/image1.png", alt: "HR-менеджер проводит интервью" },
      { src: "/images/image2.png", alt: "Участники виртуального job fair" },
    ],
    overviewTitle: "New York Virtual Job Fair",
    overviewDescription:
      "Регистрация бесплатна для соискателей. Присоединяйтесь 11 декабря с 10:00 до 14:00 (EST), чтобы напрямую обсудить предложения с компаниями, нанимающими в Нью-Йорке, и ускорить поиск работы.",
    infoBlocks: [
      {
        id: "time",
        title: "Когда",
        description: "11 декабря 2025, 10:00–14:00 (EST)",
        icon: "calendar",
      },
      {
        id: "format",
        title: "Формат",
        description:
          "Полностью виртуальное событие. Подключайтесь из браузера и переходите к видео-интервью без ожидания.",
        icon: "monitor",
      },
      {
        id: "cost",
        title: "Стоимость",
        description:
          "Участие для соискателей бесплатное. Для компаний — по запросу организатора.",
        icon: "ticket",
      },
      {
        id: "industries",
        title: "Индустрии",
        description:
          "IT, финтех, маркетинг, ритейл, образование, здравоохранение и ещё 30+ отраслей.",
        icon: "building",
      },
    ],
    preparationTips: [
      {
        id: "resume",
        title: "Обновите резюме",
        description:
          "Подготовьте актуальную версию, чтобы отправить работодателям прямо во время встречи.",
      },
      {
        id: "tech",
        title: "Проверьте подключение",
        description:
          "Настройте камеру и микрофон, протестируйте интернет, чтобы не пропустить приглашение на интервью.",
      },
      {
        id: "pitch",
        title: "Сформулируйте питч",
        description:
          "Запишите короткое представление о себе и опыте — вы встретитесь с десятками рекрутеров за утро.",
      },
    ],
    benefits: [
      {
        id: "access",
        title: "Доступ к решениям",
        description:
          "Коммуникация напрямую с работодателями Нью-Йорка без посредников и долгой переписки.",
      },
      {
        id: "speed",
        title: "Быстрые интервью",
        description:
          "Видео-встречи с hiring-менеджерами, возможность получить оффер сразу после ярмарки.",
      },
      {
        id: "coverage",
        title: "Широкий охват",
        description:
          "От стартапов до enterprise-компаний — выберите то, что подходит именно вам.",
      },
    ],
    primaryCta: {
      label: "Зарегистрироваться бесплатно",
      href: "https://www.eventbrite.com/e/new-york-job-fair-december-11-2025-new-york-career-fairs-tickets-1041524456687",
    },
    secondaryCta: {
      label: "Гид по подготовке",
      href: "/assets/guides/virtual-job-fair-prep.pdf",
    },
    highlights: [
      {
        id: "live-interviews",
        title: "Живые интервью",
        description:
          "Получите приглашение на интервью прямо во время ярмарки — рекрутеры готовы общаться сразу после регистрации.",
      },
      {
        id: "career-support",
        title: "Карьерные консультации",
        description:
          "Эксперты Best Hire Career Fairs поделятся советами по продвижению резюме и подготовке к финальным этапам отбора.",
      },
      {
        id: "networking",
        title: "Нетворкинг",
        description:
          "Встречайте коллег, обменивайтесь опытом и расширяйте профессиональные связи в безопасном онлайн-формате.",
      },
      {
        id: "multi-industry",
        title: "30+ индустрий",
        description:
          "Компании подбирают специалистов в маркетинге, IT, продажах, логистике, HR и других направлениях.",
      },
    ],
    schedule: [
      {
        id: "virtual-open",
        title: "Открытие и welcome",
        startTime: "2025-12-11T09:45:00-05:00",
        endTime: "2025-12-11T10:00:00-05:00",
        type: "registration",
        description:
          "Подключаемся к платформе, проверяем звук и готовимся к live-встречам с компаниями.",
      },
      {
        id: "spotlight",
        title: "Spotlight: компании-участники",
        startTime: "2025-12-11T10:00:00-05:00",
        endTime: "2025-12-11T10:30:00-05:00",
        type: "panel",
        description:
          "Организатор представляет ключевые компании и рассказывает о форматах собеседований в течение дня.",
        speakerId: "speaker-host",
      },
      {
        id: "live-interviews",
        title: "Live Interviews & Networking",
        startTime: "2025-12-11T10:30:00-05:00",
        endTime: "2025-12-11T13:45:00-05:00",
        type: "networking",
        description:
          "Индивидуальные и групповые сессии с рекрутерами, быстрые интервью и обмен контактами.",
      },
      {
        id: "wrap-up",
        title: "Закрытие и follow-up",
        startTime: "2025-12-11T13:45:00-05:00",
        endTime: "2025-12-11T14:00:00-05:00",
        type: "panel",
        description:
          "Резюме дня, чек-лист для дальнейших шагов и контакты для связи с работодателями.",
        speakerId: "speaker-host",
      },
    ],
    speakers: [
      {
        id: "speaker-host",
        firstName: "Emily",
        lastName: "Carter",
        role: "Event Host, Best Hire Career Fairs",
        bio: "Куратор виртуальных job fair по всей стране, помогает кандидатам подготовиться к интервью и выстроить карьерный трек.",
        company: "Best Hire Career Fairs",
        socials: [
          {
            platform: "linkedin",
            url: "https://www.linkedin.com/company/best-hire",
          },
        ],
      },
    ],
    logistics: {
      timezone: "GMT-5 (New York)",
      accessNotes:
        "Ссылку на платформу отправим на e-mail после регистрации. Рекомендуем использовать современный браузер и гарнитуру.",
    },
    resources: [
      {
        id: "eventbrite",
        label: "Страница регистрации Eventbrite",
        href: "https://www.eventbrite.com/e/new-york-job-fair-december-11-2025-new-york-career-fairs-tickets-1041524456687",
      },
      {
        id: "resume-template",
        label: "Шаблон резюме для Job Fair",
        href: "/assets/templates/job-fair-resume.docx",
      },
    ],
    faqs: [
      {
        id: "faq-cost",
        question: "Сколько стоит участие?",
        answer:
          "Для соискателей участие бесплатное. Компании получают прайс по запросу организатору Best Hire Career Fairs.",
      },
      {
        id: "faq-platform",
        question: "Как подключиться к виртуальной платформе?",
        answer:
          "После регистрации вы получите e-mail с персональной ссылкой. За 15 минут до старта зайдите в личный кабинет и проверьте звук.",
      },
      {
        id: "faq-resume",
        question: "Нужно ли заранее отправлять резюме?",
        answer:
          "Опционально, но рекомендуется иметь PDF-файл под рукой — многие работодатели запросят его прямо во время беседы.",
      },
    ],
  }),
];

function createFallbackDetail(event: Event): EventDetail {
  return {
    ...event,
    slug: event.id,
    summary: event.description,
    heroBadge: "Eventflow",
    heroTagline: event.description,
    heroMetrics: [
      { label: "Формат", value: FALLBACK_FORMAT_LABEL[event.format] },
      { label: "Доступ", value: FALLBACK_ACCESS_LABEL[event.access] },
      { label: "Категория", value: FALLBACK_CATEGORY_LABEL[event.category] },
    ],
    primaryCta: {
      label: "Узнать больше",
      href: `/events/${event.id}/register`,
    },
    highlights: [
      {
        id: "about",
        title: "О событии",
        description: event.description,
      },
    ],
    schedule: [
      {
        id: `${event.id}-start`,
        title: "Старт мероприятия",
        startTime: event.startDate,
        endTime: event.endDate,
        description: "Детализированное расписание будет опубликовано позже.",
        type: "keynote",
      },
    ],
    speakers: [],
    logistics: {
      venue: event.location,
      timezone: "GMT+3 (Москва)",
      accessNotes: "Детали уточняются организаторами.",
    },
  };
}

export function findEventById(id: string): Event | undefined {
  return eventsFixture.find((event) => event.id === id);
}

export function findEventDetailBySlug(slug: string): EventDetail | undefined {
  const detail = eventDetailsFixture.find((event) => event.slug === slug);
  if (detail) {
    return detail;
  }

  const baseEvent = findEventById(slug);
  if (!baseEvent) {
    return undefined;
  }

  return createFallbackDetail(baseEvent);
}
