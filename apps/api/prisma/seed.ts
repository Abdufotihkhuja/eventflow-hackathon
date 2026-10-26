import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { DEFAULT_ROLES } from '../src/common/constants/permissions.constant';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PERMISSIONS_LIST = [
  // ==================== ПАНЕЛЬ ====================
  {
    code: 'dashboard:view',
    name: 'Просмотр панели',
    category: 'dashboard',
    description: 'Доступ к главной панели организатора',
  },

  // ==================== СОБЫТИЯ ====================
  {
    code: 'events:create',
    name: 'Создание событий',
    category: 'events',
    description: 'Создание новых мероприятий',
  },
  {
    code: 'events:read',
    name: 'Просмотр событий',
    category: 'events',
    description: 'Просмотр списка и деталей мероприятий',
  },
  {
    code: 'events:update',
    name: 'Редактирование событий',
    category: 'events',
    description: 'Изменение существующих мероприятий',
  },
  {
    code: 'events:delete',
    name: 'Удаление событий',
    category: 'events',
    description: 'Удаление мероприятий',
  },
  {
    code: 'events:publish',
    name: 'Публикация событий',
    category: 'events',
    description: 'Публикация и отмена мероприятий',
  },

  // ==================== ПЛОЩАДКИ ДЛЯ АРЕНДЫ ====================
  {
    code: 'places:create',
    name: 'Создание площадок',
    category: 'places',
    description: 'Создание карточек площадок для аренды',
  },
  {
    code: 'places:read',
    name: 'Просмотр площадок',
    category: 'places',
    description: 'Просмотр собственных и доступных площадок',
  },
  {
    code: 'places:update',
    name: 'Редактирование площадок',
    category: 'places',
    description: 'Изменение карточек площадок',
  },
  {
    code: 'places:delete',
    name: 'Удаление площадок',
    category: 'places',
    description: 'Удаление карточек площадок',
  },
  {
    code: 'places:publish',
    name: 'Публикация площадок',
    category: 'places',
    description: 'Публикация и снятие с публикации площадок',
  },
  {
    code: 'places:request',
    name: 'Подача заявок на площадки',
    category: 'places',
    description: 'Отправка заявок на аренду площадок',
  },

  // ==================== СПИКЕРЫ ====================
  {
    code: 'speakers:create',
    name: 'Добавление спикеров',
    category: 'speakers',
    description: 'Добавление спикеров к событиям',
  },
  {
    code: 'speakers:read',
    name: 'Просмотр спикеров',
    category: 'speakers',
    description: 'Просмотр списка спикеров события',
  },
  {
    code: 'speakers:update',
    name: 'Редактирование спикеров',
    category: 'speakers',
    description: 'Изменение информации о спикерах',
  },
  {
    code: 'speakers:delete',
    name: 'Удаление спикеров',
    category: 'speakers',
    description: 'Удаление спикеров из события',
  },

  // ==================== ПРОГРАММА ====================
  {
    code: 'agenda:create',
    name: 'Добавление пунктов программы',
    category: 'agenda',
    description: 'Добавление пунктов в программу события',
  },
  {
    code: 'agenda:read',
    name: 'Просмотр программы',
    category: 'agenda',
    description: 'Просмотр программы события',
  },
  {
    code: 'agenda:update',
    name: 'Редактирование программы',
    category: 'agenda',
    description: 'Изменение программы события',
  },
  {
    code: 'agenda:delete',
    name: 'Удаление пунктов программы',
    category: 'agenda',
    description: 'Удаление пунктов из программы',
  },

  // ==================== ВОПРОСЫ РЕГИСТРАЦИИ ====================
  {
    code: 'questions:create',
    name: 'Добавление вопросов',
    category: 'questions',
    description: 'Добавление вопросов регистрации',
  },
  {
    code: 'questions:read',
    name: 'Просмотр вопросов',
    category: 'questions',
    description: 'Просмотр вопросов регистрации',
  },
  {
    code: 'questions:update',
    name: 'Редактирование вопросов',
    category: 'questions',
    description: 'Изменение вопросов регистрации',
  },
  {
    code: 'questions:delete',
    name: 'Удаление вопросов',
    category: 'questions',
    description: 'Удаление вопросов регистрации',
  },

  // ==================== РЕГИСТРАЦИИ ====================
  {
    code: 'registrations:read',
    name: 'Просмотр регистраций',
    category: 'registrations',
    description: 'Просмотр списка регистраций участников',
  },
  {
    code: 'registrations:approve',
    name: 'Одобрение регистраций',
    category: 'registrations',
    description: 'Одобрение заявок на участие',
  },
  {
    code: 'registrations:reject',
    name: 'Отклонение регистраций',
    category: 'registrations',
    description: 'Отклонение заявок на участие',
  },
  {
    code: 'registrations:export',
    name: 'Экспорт регистраций',
    category: 'registrations',
    description: 'Экспорт списка регистраций',
  },

  // ==================== ПОСЕЩАЕМОСТЬ ====================
  {
    code: 'attendance:read',
    name: 'Просмотр посещаемости',
    category: 'attendance',
    description: 'Просмотр отчётов посещаемости',
  },
  {
    code: 'attendance:checkin',
    name: 'Отметка посещения',
    category: 'attendance',
    description: 'Отметка посещения (check-in)',
  },
  {
    code: 'attendance:export',
    name: 'Экспорт посещаемости',
    category: 'attendance',
    description: 'Экспорт отчётов посещаемости',
  },

  // ==================== БИЛЕТЫ ====================
  {
    code: 'tickets:create',
    name: 'Создание билетов',
    category: 'tickets',
    description: 'Создание типов билетов',
  },
  {
    code: 'tickets:read',
    name: 'Просмотр билетов',
    category: 'tickets',
    description: 'Просмотр информации о билетах',
  },
  {
    code: 'tickets:update',
    name: 'Редактирование билетов',
    category: 'tickets',
    description: 'Изменение типов билетов',
  },
  {
    code: 'tickets:delete',
    name: 'Удаление билетов',
    category: 'tickets',
    description: 'Удаление типов билетов',
  },

  // ==================== СЕРТИФИКАТЫ ====================
  {
    code: 'certificates:generate',
    name: 'Генерация сертификатов',
    category: 'certificates',
    description: 'Создание сертификатов для участников',
  },
  {
    code: 'certificates:read',
    name: 'Просмотр сертификатов',
    category: 'certificates',
    description: 'Просмотр выданных сертификатов',
  },
  {
    code: 'certificates:export',
    name: 'Экспорт сертификатов',
    category: 'certificates',
    description: 'Скачивание и экспорт сертификатов и бейджей',
  },
  {
    code: 'artifact_recipients:manage',
    name: 'Управление получателями артефактов',
    category: 'certificates',
    description: 'Создание и редактирование получателей сертификатов и бейджей',
  },
  {
    code: 'recipient_roles:manage',
    name: 'Управление ролями получателей',
    category: 'certificates',
    description: 'Создание и редактирование ролей получателей события',
  },

  // ==================== РАССЫЛКИ ====================
  {
    code: 'mail:send',
    name: 'Отправка рассылок',
    category: 'mail',
    description: 'Отправка писем участникам событий',
  },

  // ==================== ДОСКИ ЗАДАЧ ====================
  {
    code: 'boards:create',
    name: 'Создание досок',
    category: 'boards',
    description: 'Создание новых досок задач',
  },
  {
    code: 'boards:read',
    name: 'Просмотр досок',
    category: 'boards',
    description: 'Просмотр досок задач',
  },
  {
    code: 'boards:update',
    name: 'Редактирование досок',
    category: 'boards',
    description: 'Изменение настроек досок',
  },
  {
    code: 'boards:delete',
    name: 'Удаление досок',
    category: 'boards',
    description: 'Удаление досок задач',
  },
  {
    code: 'boards:archive',
    name: 'Архивирование досок',
    category: 'boards',
    description: 'Архивирование досок задач',
  },

  // ==================== КОЛОНКИ ====================
  {
    code: 'columns:create',
    name: 'Создание колонок',
    category: 'columns',
    description: 'Создание колонок на досках',
  },
  {
    code: 'columns:read',
    name: 'Просмотр колонок',
    category: 'columns',
    description: 'Просмотр колонок на досках',
  },
  {
    code: 'columns:update',
    name: 'Редактирование колонок',
    category: 'columns',
    description: 'Изменение колонок и их порядка',
  },
  {
    code: 'columns:delete',
    name: 'Удаление колонок',
    category: 'columns',
    description: 'Удаление колонок с досок',
  },

  // ==================== ЗАДАЧИ ====================
  {
    code: 'tasks:create',
    name: 'Создание задач',
    category: 'tasks',
    description: 'Создание новых задач',
  },
  {
    code: 'tasks:read',
    name: 'Просмотр задач',
    category: 'tasks',
    description: 'Просмотр задач и их деталей',
  },
  {
    code: 'tasks:update',
    name: 'Редактирование задач',
    category: 'tasks',
    description: 'Изменение задач',
  },
  {
    code: 'tasks:delete',
    name: 'Удаление задач',
    category: 'tasks',
    description: 'Удаление задач',
  },
  {
    code: 'tasks:assign',
    name: 'Назначение исполнителей',
    category: 'tasks',
    description: 'Назначение исполнителей на задачи',
  },
  {
    code: 'tasks:move',
    name: 'Перемещение задач',
    category: 'tasks',
    description: 'Перемещение задач между колонками',
  },

  // ==================== КОММЕНТАРИИ ====================
  {
    code: 'comments:create',
    name: 'Добавление комментариев',
    category: 'comments',
    description: 'Добавление комментариев к задачам',
  },
  {
    code: 'comments:read',
    name: 'Просмотр комментариев',
    category: 'comments',
    description: 'Просмотр комментариев к задачам',
  },
  {
    code: 'comments:update',
    name: 'Редактирование комментариев',
    category: 'comments',
    description: 'Редактирование своих комментариев',
  },
  {
    code: 'comments:delete',
    name: 'Удаление комментариев',
    category: 'comments',
    description: 'Удаление комментариев',
  },

  // ==================== ЧЕКЛИСТЫ ====================
  {
    code: 'checklists:create',
    name: 'Создание чеклистов',
    category: 'checklists',
    description: 'Создание чеклистов в задачах',
  },
  {
    code: 'checklists:read',
    name: 'Просмотр чеклистов',
    category: 'checklists',
    description: 'Просмотр чеклистов в задачах',
  },
  {
    code: 'checklists:update',
    name: 'Редактирование чеклистов',
    category: 'checklists',
    description: 'Изменение чеклистов и пунктов',
  },
  {
    code: 'checklists:delete',
    name: 'Удаление чеклистов',
    category: 'checklists',
    description: 'Удаление чеклистов из задач',
  },

  // ==================== ТЕГИ ====================
  {
    code: 'tags:create',
    name: 'Создание тегов',
    category: 'tags',
    description: 'Создание тегов для досок',
  },
  {
    code: 'tags:read',
    name: 'Просмотр тегов',
    category: 'tags',
    description: 'Просмотр тегов досок',
  },
  {
    code: 'tags:update',
    name: 'Редактирование тегов',
    category: 'tags',
    description: 'Изменение тегов',
  },
  {
    code: 'tags:delete',
    name: 'Удаление тегов',
    category: 'tags',
    description: 'Удаление тегов с досок',
  },

  // ==================== ВЛОЖЕНИЯ ====================
  {
    code: 'attachments:create',
    name: 'Добавление вложений',
    category: 'attachments',
    description: 'Прикрепление файлов к задачам',
  },
  {
    code: 'attachments:read',
    name: 'Просмотр вложений',
    category: 'attachments',
    description: 'Просмотр и скачивание вложений',
  },
  {
    code: 'attachments:delete',
    name: 'Удаление вложений',
    category: 'attachments',
    description: 'Удаление вложений из задач',
  },

  // ==================== ЧЛЕНЫ ОРГАНИЗАЦИИ ====================
  {
    code: 'members:create',
    name: 'Добавление сотрудников',
    category: 'members',
    description: 'Создание новых сотрудников организации',
  },
  {
    code: 'members:read',
    name: 'Просмотр сотрудников',
    category: 'members',
    description: 'Просмотр списка сотрудников организации',
  },
  {
    code: 'members:update',
    name: 'Редактирование сотрудников',
    category: 'members',
    description: 'Изменение данных сотрудников',
  },
  {
    code: 'members:delete',
    name: 'Удаление сотрудников',
    category: 'members',
    description: 'Удаление сотрудников из организации',
  },
  {
    code: 'members:invite',
    name: 'Приглашение сотрудников',
    category: 'members',
    description: 'Повторная отправка приглашений',
  },

  // ==================== ПОДПИСЧИКИ ====================
  {
    code: 'followers:read',
    name: 'Просмотр подписчиков',
    category: 'followers',
    description: 'Просмотр списка подписчиков организации',
  },
  {
    code: 'followers:export',
    name: 'Экспорт подписчиков',
    category: 'followers',
    description: 'Экспорт списка подписчиков организации',
  },

  // ==================== ЗАЯВКИ ====================
  {
    code: 'contacts:read',
    name: 'Просмотр заявок',
    category: 'contacts',
    description: 'Просмотр заявок на связь с организацией',
  },
  {
    code: 'contacts:update',
    name: 'Обработка заявок',
    category: 'contacts',
    description: 'Изменение статусов заявок на связь',
  },

  // ==================== РОЛИ ====================
  {
    code: 'roles:create',
    name: 'Создание ролей',
    category: 'roles',
    description: 'Создание новых ролей',
  },
  {
    code: 'roles:read',
    name: 'Просмотр ролей',
    category: 'roles',
    description: 'Просмотр списка ролей',
  },
  {
    code: 'roles:update',
    name: 'Редактирование ролей',
    category: 'roles',
    description: 'Изменение настроек ролей',
  },
  {
    code: 'roles:delete',
    name: 'Удаление ролей',
    category: 'roles',
    description: 'Удаление ролей',
  },
  {
    code: 'roles:manage',
    name: 'Полное управление ролями',
    category: 'roles',
    description: 'Полный доступ к управлению ролями',
  },

  // ==================== НАСТРОЙКИ ====================
  {
    code: 'settings:view',
    name: 'Просмотр настроек',
    category: 'settings',
    description: 'Просмотр настроек организации',
  },
  {
    code: 'settings:manage',
    name: 'Управление настройками',
    category: 'settings',
    description: 'Изменение настроек организации',
  },

  // ==================== ОРГАНИЗАЦИЯ ====================
  {
    code: 'organization:update',
    name: 'Редактирование организации',
    category: 'organization',
    description: 'Изменение данных организации',
  },
  {
    code: 'organization:delete',
    name: 'Удаление организации',
    category: 'organization',
    description: 'Полное удаление организации',
  },

  // ==================== АНАЛИТИКА ====================
  {
    code: 'analytics:view',
    name: 'Просмотр аналитики',
    category: 'analytics',
    description: 'Доступ к аналитике и отчётам',
  },
  {
    code: 'analytics:export',
    name: 'Экспорт аналитики',
    category: 'analytics',
    description: 'Экспорт аналитических данных',
  },

  // ==================== ТАРИФЫ И ОПЛАТА ====================
  {
    code: 'billing:view',
    name: 'Просмотр тарифов и оплаты',
    category: 'billing',
    description: 'Просмотр тарифов, дополнений и счетов',
  },
  {
    code: 'billing:manage',
    name: 'Управление тарифами и оплатой',
    category: 'billing',
    description: 'Изменение тарифа и платных дополнений',
  },

  // ==================== ЗАГРУЗКИ ====================
  {
    code: 'uploads:create',
    name: 'Загрузка файлов',
    category: 'uploads',
    description: 'Загрузка файлов в систему',
  },
  {
    code: 'uploads:delete',
    name: 'Удаление файлов',
    category: 'uploads',
    description: 'Удаление загруженных файлов',
  },

  // ==================== БЛОГ ====================
  {
    code: 'blog:create',
    name: 'Создание статей',
    category: 'blog',
    description: 'Создание новых статей блога',
  },
  {
    code: 'blog:read',
    name: 'Просмотр статей',
    category: 'blog',
    description: 'Просмотр статей блога организации',
  },
  {
    code: 'blog:update',
    name: 'Редактирование статей',
    category: 'blog',
    description: 'Изменение существующих статей',
  },
  {
    code: 'blog:delete',
    name: 'Удаление статей',
    category: 'blog',
    description: 'Удаление статей блога',
  },
  {
    code: 'blog:publish',
    name: 'Публикация статей',
    category: 'blog',
    description: 'Публикация и снятие статей с публикации',
  },
  {
    code: 'blog:submit',
    name: 'Отправка на модерацию',
    category: 'blog',
    description: 'Отправка статей на модерацию супер-админу',
  },
];

const EVENT_TAGS = [
  // ==================== FORMAT (Форматы) ====================
  { name: 'Конференция', slug: 'conference', category: 'FORMAT' as const },
  { name: 'Воркшоп', slug: 'workshop', category: 'FORMAT' as const },
  { name: 'Вебинар', slug: 'webinar', category: 'FORMAT' as const },
  { name: 'Нетворкинг', slug: 'networking', category: 'FORMAT' as const },
  { name: 'Хакатон', slug: 'hackathon', category: 'FORMAT' as const },

  // ==================== AUDIENCE (Аудитория) ====================
  {
    name: 'Для начинающих',
    slug: 'for-beginners',
    category: 'AUDIENCE' as const,
  },
  {
    name: 'Для профессионалов',
    slug: 'for-professionals',
    category: 'AUDIENCE' as const,
  },
  {
    name: 'Для студентов',
    slug: 'for-students',
    category: 'AUDIENCE' as const,
  },
  { name: 'Для бизнеса', slug: 'for-business', category: 'AUDIENCE' as const },

  // ==================== TOPIC (Темы) ====================
  { name: 'Технологии', slug: 'technologies', category: 'TOPIC' as const },
  { name: 'Дизайн', slug: 'design', category: 'TOPIC' as const },
  { name: 'Менеджмент', slug: 'management', category: 'TOPIC' as const },
  { name: 'Продажи', slug: 'sales', category: 'TOPIC' as const },
  { name: 'Стартапы', slug: 'startups', category: 'TOPIC' as const },
];

async function main() {
  console.log('🌱 Начало seed...');

  // Создаём permissions
  console.log('📝 Создание permissions...');
  for (const perm of PERMISSIONS_LIST) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }
  console.log(`✅ Создано ${PERMISSIONS_LIST.length} permissions`);

  console.log('🔐 Обновление permissions для стандартных ролей организаций...');
  const permissionRows = await prisma.permission.findMany();
  const permissionMap = new Map(
    permissionRows.map((item) => [item.code, item.id]),
  );
  for (const roleData of Object.values(DEFAULT_ROLES)) {
    const roles = await prisma.organizationRole.findMany({
      where: { name: roleData.name },
    });
    for (const role of roles) {
      const rolePermissions = roleData.permissions
        .map((code) => permissionMap.get(code))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({
          roleId: role.id,
          permissionId,
        }));
      if (rolePermissions.length === 0) continue;
      await prisma.rolePermission.createMany({
        data: rolePermissions,
        skipDuplicates: true,
      });
    }
  }
  console.log('✅ Permissions стандартных ролей обновлены');

  // Создаём системные теги для мероприятий
  console.log('🏷️  Создание системных тегов для мероприятий...');
  for (const tag of EVENT_TAGS) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const existingTag = await prisma.eventTag.findFirst({
      where: {
        slug: tag.slug,
        organizationId: null,
      },
    });

    if (!existingTag) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await prisma.eventTag.create({
        data: {
          name: tag.name,
          slug: tag.slug,
          category: tag.category,
          isSystem: true,
          organizationId: null,
        },
      });
    }
  }
  console.log(`✅ Создано ${EVENT_TAGS.length} системных тегов`);

  // Создаём супер-админа по умолчанию (только если не существует)
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@eventflow.com';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperSecure123!';

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const existingAdmin = await prisma.superAdmin.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    console.log('👤 Создание супер-админа...');
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await prisma.superAdmin.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Super Admin',
      },
    });
    console.log(`✅ Супер-админ создан: ${adminEmail}`);
  } else {
    console.log('ℹ️  Супер-админ уже существует');
  }

  console.log('🎉 Seed завершён успешно!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
