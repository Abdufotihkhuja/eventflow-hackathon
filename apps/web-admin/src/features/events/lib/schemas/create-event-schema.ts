import { z } from 'zod'

import { AccessType, EventFormat, EventType } from '@entities/event'

import { BANNER_TEMPLATES } from '../banner-templates'

const eventTypeValues = Object.values(EventType)
const accessTypeValues = Object.values(AccessType)
const eventFormatValues = Object.values(EventFormat)
const bannerTemplateValues = Object.values(BANNER_TEMPLATES)

// Схема для TableContent (содержимое таблицы)
// Структура согласно документации BlockNote:
// https://www.blocknotejs.org/docs/features/blocks/tables
const tableContentSchema = z.object({
  type: z.literal('tableContent'),
  columnWidths: z.array(z.number()), // Массив чисел (null не допускается!)
  headerRows: z.number(),
  rows: z.array(
    z.object({
      cells: z.array(
        z.object({
          type: z.literal('tableCell'),
          props: z.object({
            colspan: z.number().optional(),
            rowspan: z.number().optional(),
            textColor: z.string().optional(),
            textAlignment: z.string().optional(),
            backgroundColor: z.string().optional(),
          }),
          content: z.array(z.any()),
        })
      ),
    })
  ),
})

// Схема для BlockNote контента (массив блоков)
// content может быть: строкой, массивом (инлайн контент) или объектом (для таблиц)
const blockNoteContentSchema = z.array(
  z.object({
    id: z.string().optional(),
    type: z.string(),
    props: z.record(z.string(), z.unknown()).optional(),
    content: z
      .union([
        z.string(), // Строковый контент
        z.array(z.any()), // Массив инлайн элементов
        tableContentSchema, // Объект tableContent для таблиц
        z.record(z.string(), z.unknown()), // Любой другой объект
      ])
      .optional(),
    children: z.array(z.any()).optional(),
  })
)

// Описание может быть массивом BlockNote блоков или строкой
// Массив проверяется первым, т.к. это основной формат

// Zod 4 по дефолту возвращает «Invalid input: expected string, received undefined»
// для пустых required-полей. Этот хелпер возвращает локализованное сообщение
// при invalid_type, не перехватывая остальные ошибки (.refine, .min и т.п.).
const requiredString = (message: string) =>
  z.string({
    error: issue => (issue.code === 'invalid_type' ? message : undefined),
  })

const descriptionSchema = z.union([
  blockNoteContentSchema, // Массив блоков (приоритет)
  requiredString('Минимум 10 символов').min(10, 'Минимум 10 символов'), // Строка как fallback
])

// Схема для спикера
export const speakerSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1, 'Укажите имя').max(100, 'Максимум 100 символов'),
  lastName: z.string().min(1, 'Укажите фамилию').max(100, 'Максимум 100 символов'),
  position: z.string().min(2, 'Минимум 2 символа').max(100, 'Максимум 100 символов'),
  company: z.string().max(100, 'Максимум 100 символов').optional().or(z.literal('')),
  bio: z.string().max(500, 'Максимум 500 символов').optional().or(z.literal('')),
  avatarUrl: z.string().url('Некорректная ссылка').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Некорректная ссылка').optional().or(z.literal('')),
  websiteUrl: z.string().url('Некорректная ссылка').optional().or(z.literal('')),
})

// Схема для элемента агенды
export const agendaItemSchema = z.object({
  id: z.string(),
  time: z.string().min(1, 'Укажите время'),
  duration: z.number().min(1, 'Минимум 1 минута').max(1440, 'Максимум 1440 минут'),
  title: z.string().min(2, 'Минимум 2 символа').max(200, 'Максимум 200 символов'),
  description: z.string().max(500, 'Максимум 500 символов').optional(),
  type: z.enum(['presentation', 'workshop', 'break', 'networking', 'panel', 'keynote']),
  speakerIds: z.array(z.string()).optional(),
  location: z.string().max(200, 'Максимум 200 символов').optional(),
})

const slugSchema = z
  .string()
  .max(200, 'Максимум 200 символов')
  .regex(/^[a-z0-9-]*$/, 'Только латиница (a-z), цифры и дефис')
  .optional()
  .or(z.literal(''))

/**
 * Координаты приходят из API строками (Prisma Decimal), а из карты — числами.
 * Без приведения z.number() ловит «Invalid input» и форму невозможно сохранить.
 */
const optionalCoordinateSchema = (min: number, max: number) =>
  z.preprocess(
    value => {
      if (value === '' || value == null) return undefined
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : value
      }
      return value
    },
    z.number().min(min).max(max).optional().nullable()
  )

export const createEventSchema = z
  .object({
    title: requiredString('Минимум 3 символа').min(3, 'Минимум 3 символа').max(200, 'Максимум 200 символов'),

    slug: slugSchema,

    // Описание — строка или BlockNote JSON
    description: descriptionSchema,

    // Краткое описание для превью
    shortDescription: z.string().max(300, 'Максимум 300 символов').optional(),

    type: z.enum(eventTypeValues as [string, ...string[]]),

    accessType: z.enum(accessTypeValues as [string, ...string[]]).default(AccessType.OPEN),

    format: z.enum(eventFormatValues as [string, ...string[]]),

    startDate: requiredString('Укажите дату начала')
      .min(1, 'Укажите дату начала')
      .refine(val => !isNaN(Date.parse(val)), {
        message: 'Некорректная дата',
      }),

    endDate: requiredString('Укажите дату окончания')
      .min(1, 'Укажите дату окончания')
      .refine(val => !isNaN(Date.parse(val)), {
        message: 'Некорректная дата',
      }),

    registrationDeadline: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), {
        message: 'Некорректная дата',
      })
      .optional()
      .or(z.literal('')),

    // Локация (для оффлайн/гибрид)
    venue: z.string().max(200, 'Максимум 200 символов').optional(),
    address: z.string().max(300, 'Максимум 300 символов').optional(),
    city: z.string().max(100, 'Максимум 100 символов').optional(),
    latitude: optionalCoordinateSchema(-90, 90),
    longitude: optionalCoordinateSchema(-180, 180),
    placeId: z.string().max(500).optional().nullable(),

    // Для онлайн событий
    onlineUrl: z.string().url('Введите корректную ссылку').optional().or(z.literal('')),

    price: z.coerce.number().min(0, 'Цена не может быть отрицательной').optional(),

    currency: z.string().default('UZS').optional(),

    // Event Media - загруженный файл (url) или шаблон
    eventMedia: z
      .object({
        type: z.enum(['file', 'template']),
        url: z.string().optional(), // URL или относительный путь загруженного файла
        template: z.enum(bannerTemplateValues as [string, ...string[]]).optional(),
      })
      .optional(),

    maxParticipants: z
      .coerce.number()
      .min(1, 'Минимум 1 участник')
      .max(100000, 'Максимум 100000 участников')
      .optional(),

    // Комментарии
    commentsEnabled: z.boolean().default(true).optional(),

    // Спикеры
    speakers: z.array(speakerSchema).optional(),

    // Агенда (программа мероприятия)
    agenda: z.array(agendaItemSchema).optional(),

    customQuestions: z
      .array(
        z.object({
          id: z.string(),
          question: z.string().min(1, 'Вопрос не может быть пустым'),
          type: z.enum(['text', 'number', 'select', 'checkbox', 'textarea']),
          required: z.boolean(),
          options: z.array(z.string()).optional(),
        })
      )
      .optional(),
  })
  .refine(
    data => {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      return end >= start
    },
    {
      message: 'Дата окончания должна быть позже даты начала',
      path: ['endDate'],
    }
  )
  .refine(
    data => {
      // Если указан дедлайн регистрации, он должен быть не позже даты начала события
      if (data.registrationDeadline && data.registrationDeadline.length > 0) {
        const deadline = new Date(data.registrationDeadline)
        const start = new Date(data.startDate)
        return deadline <= start
      }
      return true
    },
    {
      message: 'Дедлайн регистрации должен быть не позже даты начала события',
      path: ['registrationDeadline'],
    }
  )
  .refine(
    data => {
      // Для онлайн событий обязательна ссылка
      if (data.format === EventFormat.ONLINE) {
        return !!data.onlineUrl && data.onlineUrl.length > 0
      }
      return true
    },
    {
      message: 'Для онлайн события необходима ссылка на встречу',
      path: ['onlineUrl'],
    }
  )
  .refine(
    data => {
      // Для оффлайн и гибридных событий обязательна локация
      if (data.format === EventFormat.OFFLINE || data.format === EventFormat.HYBRID) {
        return !!data.venue && data.venue.length > 0
      }
      return true
    },
    {
      message: 'Для оффлайн события необходимо указать место проведения',
      path: ['venue'],
    }
  )
  .refine(
    data => {
      // Для платных событий обязательна цена
      if (data.type === EventType.PAID) {
        return typeof data.price === 'number' && data.price > 0
      }
      return true
    },
    {
      message: 'Для платного события укажите цену',
      path: ['price'],
    }
  )

export type CreateEventFormValues = z.infer<typeof createEventSchema>
