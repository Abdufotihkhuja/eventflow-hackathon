import { z } from 'zod'
import type { Translator } from '@eventflow/i18n'

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
const fallbackT: Translator = key => key

// Zod 4 по дефолту возвращает «Invalid input: expected string, received undefined»
// для пустых required-полей. Подмешиваем локализованное сообщение для invalid_type
// без перехвата остальных ошибок (.refine, .min и т.п.).
const requiredString = (message: string) =>
  z.string({
    error: issue => (issue.code === 'invalid_type' ? message : undefined),
  })

const createDescriptionSchema = (t: Translator) =>
  z.union([
    blockNoteContentSchema, // Массив блоков (приоритет)
    requiredString(t('events.validation.min10')).min(10, t('events.validation.min10')), // Строка как fallback
  ])

// Схема для спикера
export const createSpeakerSchema = (t: Translator) => z.object({
  id: z.string(),
  firstName: z.string().min(1, t('events.validation.firstNameRequired')).max(100, t('events.validation.max100')),
  lastName: z.string().min(1, t('events.validation.lastNameRequired')).max(100, t('events.validation.max100')),
  position: z.string().min(2, t('events.validation.min2')).max(100, t('events.validation.max100')),
  company: z.string().max(100, t('events.validation.max100')).optional().or(z.literal('')),
  bio: z.string().max(500, t('events.validation.max500')).optional().or(z.literal('')),
  avatarUrl: z.string().url(t('events.validation.invalidLink')).optional().or(z.literal('')),
  linkedinUrl: z.string().url(t('events.validation.invalidLink')).optional().or(z.literal('')),
  websiteUrl: z.string().url(t('events.validation.invalidLink')).optional().or(z.literal('')),
})

// Схема для элемента агенды
export const createAgendaItemSchema = (t: Translator) => z.object({
  id: z.string(),
  time: z.string().min(1, t('events.validation.timeRequired')),
  duration: z.number().min(1, t('events.validation.min1Minute')).max(1440, t('events.validation.max1440Minutes')),
  title: z.string().min(2, t('events.validation.min2')).max(200, t('events.validation.max200')),
  description: z.string().max(500, t('events.validation.max500')).optional(),
  type: z.enum(['presentation', 'workshop', 'break', 'networking', 'panel', 'keynote']),
  speakerIds: z.array(z.string()).optional(),
  location: z.string().max(200, t('events.validation.max200')).optional(),
})

const createSlugSchema = (t: Translator) => z
  .string()
  .max(200, t('events.validation.max200'))
  .regex(/^[a-z0-9-]*$/, t('events.validation.slugPattern'))
  .optional()
  .or(z.literal(''))

// Опциональное число: очищенное поле («») приходит из инпута как пустая строка,
// а z.coerce превратил бы её в 0 и уронил бы .min() — поэтому сначала нормализуем
// пустое значение в undefined, и только потом проверяем диапазон.
const optionalNumber = <T extends z.ZodType<number, unknown>>(schema: T) =>
  z.preprocess(
    value => (typeof value === 'string' && !value.trim() ? undefined : value ?? undefined),
    schema.optional()
  )

const createOptionalCoordinateSchema = (min: number, max: number) =>
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

export const createCreateEventSchema = (t: Translator) => {
  const speakerSchema = createSpeakerSchema(t)
  const agendaItemSchema = createAgendaItemSchema(t)

  return z
  .object({
    title: requiredString(t('events.validation.min3'))
      .min(3, t('events.validation.min3'))
      .max(200, t('events.validation.max200')),

    slug: createSlugSchema(t),

    // Описание — строка или BlockNote JSON
    description: createDescriptionSchema(t),

    // Краткое описание для превью
    shortDescription: z.string().max(300, t('events.validation.max300')).optional(),

    type: z.enum(eventTypeValues as [string, ...string[]]),

    accessType: z.enum(accessTypeValues as [string, ...string[]]).default(AccessType.OPEN),

    format: z.enum(eventFormatValues as [string, ...string[]]),

    startDate: requiredString(t('events.validation.startDateRequired'))
      .min(1, t('events.validation.startDateRequired'))
      .refine(val => !isNaN(Date.parse(val)), {
        message: t('events.validation.invalidDate'),
      }),

    endDate: requiredString(t('events.validation.endDateRequired'))
      .min(1, t('events.validation.endDateRequired'))
      .refine(val => !isNaN(Date.parse(val)), {
        message: t('events.validation.invalidDate'),
      }),

    registrationDeadline: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), {
        message: t('events.validation.invalidDate'),
      })
      .optional()
      .or(z.literal('')),

    // Локация (для оффлайн/гибрид)
    venue: z.string().max(200, t('events.validation.max200')).optional(),
    address: z.string().max(300, t('events.validation.max300')).optional(),
    city: z.string().max(100, t('events.validation.max100')).optional(),
    latitude: createOptionalCoordinateSchema(-90, 90),
    longitude: createOptionalCoordinateSchema(-180, 180),
    placeId: z.string().max(500).optional().nullable(),

    // Для онлайн событий
    onlineUrl: z.string().url(t('events.validation.invalidLink')).optional().or(z.literal('')),

    price: optionalNumber(
      z.coerce.number().min(0, t('events.validation.priceNonNegative'))
    ),

    currency: z.string().default('UZS').optional(),

    // Event Media - загруженный файл (url) или шаблон
    eventMedia: z
      .object({
        type: z.enum(['file', 'template']),
        url: z.string().optional(), // URL или относительный путь загруженного файла
        template: z.enum(bannerTemplateValues as [string, ...string[]]).optional(),
      })
      .optional(),

    maxParticipants: optionalNumber(
      z.coerce
        .number()
        .int(t('events.validation.min1Participant'))
        .min(1, t('events.validation.min1Participant'))
        .max(100000, t('events.validation.max100000Participants'))
    ),

    // Тематики события (можно несколько)
    categoryIds: z.array(z.string()).optional(),

    // Комментарии
    commentsEnabled: z.boolean().default(true).optional(),

    // Ручной переключатель регистрации (если false — регистрация закрыта вне зависимости от дедлайна/лимита)
    registrationOpen: z.boolean().default(true).optional(),

    // Спикеры
    speakers: z.array(speakerSchema).optional(),

    // Агенда (программа мероприятия)
    agenda: z.array(agendaItemSchema).optional(),

    customQuestions: z
      .array(
        z.object({
          id: z.string(),
          question: z.string().min(1, t('events.validation.questionRequired')),
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
      message: t('events.validation.endAfterStart'),
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
      message: t('events.validation.registrationDeadlineBeforeStart'),
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
      message: t('events.validation.onlineUrlRequired'),
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
      message: t('events.validation.venueRequired'),
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
      message: t('events.validation.paidPriceRequired'),
      path: ['price'],
    }
  )
}

export const speakerSchema = createSpeakerSchema(fallbackT)
export const agendaItemSchema = createAgendaItemSchema(fallbackT)
export const createEventSchema = createCreateEventSchema(fallbackT)

export type CreateEventFormValues = z.infer<typeof createEventSchema>
