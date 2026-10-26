import * as React from 'react'

import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'

import { 
  type Block, 
  type PartialBlock,
  defaultBlockSpecs,
} from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote } from '@blocknote/react'

import { uploadsService } from '@api/services/uploadsService'
import { getMediaUrl } from '@api/config'
import { cn } from '@shared/lib/cn'
import { normalizeBlockNoteTables } from '@shared/lib'

export type BlockNoteContent = Block[]

type RichTextEditorProps = {
  value?: BlockNoteContent | string
  onChange?: (content: BlockNoteContent) => void
  onTextChange?: (text: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
  theme?: 'light' | 'dark'
}

// Белый список разрешенных типов блоков (защита от XSS)
// Соответствует стандартным блокам BlockNote v0.46.1
const ALLOWED_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'toggleListItem', // Раскрывающийся список
  'toggleHeading', // Раскрывающийся заголовок
  'codeBlock',
  'table',
  'quote',
  'image',
  'video',
  'file',
  'audio', // Хотя не стандартный, оставляем для совместимости
])

// Белый список разрешенных стилей
const ALLOWED_STYLES = new Set([
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'textColor',
  'backgroundColor',
])

/**
 * Санитизация URL — удаляет опасные протоколы
 */
function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim().toLowerCase()
  // Разрешаем только безопасные протоколы
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/')
  ) {
    return url
  }
  // Блокируем javascript:, data: (кроме изображений), vbscript: и т.д.
  return undefined
}

/**
 * Рекурсивная санитизация блока
 */
function sanitizeBlock(block: PartialBlock): PartialBlock | null {
  // Проверяем тип блока
  if (block.type && !ALLOWED_BLOCK_TYPES.has(block.type)) {
    return null
  }

  // Санитизируем props
  const sanitizedProps: Record<string, unknown> = {}
  if (block.props && typeof block.props === 'object') {
    for (const [key, value] of Object.entries(block.props)) {
      // Санитизируем URL в src, url, href
      if ((key === 'src' || key === 'url' || key === 'href') && typeof value === 'string') {
        const sanitized = sanitizeUrl(value)
        if (sanitized) {
          sanitizedProps[key] = sanitized
        }
        // Если URL не прошел санитизацию, но это критичное поле для блока изображения,
        // все равно сохраняем блок (BlockNote может обработать его)
        else if (block.type === 'image' && key === 'url') {
          // Для блоков изображений сохраняем оригинальный URL, если он не прошел санитизацию
          // Это может быть необходимо для некоторых случаев
          sanitizedProps[key] = value
        }
      } else {
        sanitizedProps[key] = value
      }
    }
  }

  // Санитизируем content — используем any для совместимости с BlockNote типами
  let sanitizedContent: PartialBlock['content']
  if (typeof block.content === 'string') {
    sanitizedContent = block.content
  } else if (Array.isArray(block.content)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sanitizedContent = block.content.map((item: any) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const sanitizedItem = { ...item }
        // Санитизируем стили
        if ('styles' in sanitizedItem && typeof sanitizedItem.styles === 'object') {
          const styles = sanitizedItem.styles as Record<string, unknown>
          const filteredStyles: Record<string, unknown> = {}
          for (const [styleKey, styleValue] of Object.entries(styles)) {
            if (ALLOWED_STYLES.has(styleKey)) {
              filteredStyles[styleKey] = styleValue
            }
          }
          sanitizedItem.styles = filteredStyles
        }
        // Санитизируем ссылки
        if ('href' in sanitizedItem && typeof sanitizedItem.href === 'string') {
          sanitizedItem.href = sanitizeUrl(sanitizedItem.href) ?? ''
        }
        return sanitizedItem
      }
      return item
    })
  } else if (block.content && typeof block.content === 'object') {
    // Для таблиц content - это объект TableContent, просто сохраняем его
    sanitizedContent = block.content
  }

  // Рекурсивно санитизируем children
  let sanitizedChildren: PartialBlock[] | undefined
  if (block.children && Array.isArray(block.children)) {
    sanitizedChildren = block.children
      .map(child => sanitizeBlock(child as PartialBlock))
      .filter((b): b is PartialBlock => b !== null)
  }

  // Используем type assertion для совместимости с BlockNote типами
  return {
    ...block,
    props: sanitizedProps,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: sanitizedContent as any,
    children: sanitizedChildren,
  } as PartialBlock
}

/**
 * Санитизация массива блоков
 */
function sanitizeBlocks(blocks: PartialBlock[]): PartialBlock[] {
  return blocks.map(sanitizeBlock).filter((b): b is PartialBlock => b !== null)
}

/**
 * Старая функция нормализации таблиц - теперь используется общая из shared/lib
 * Оставлена для совместимости, но просто делегирует вызов
 */
function normalizeTables(blocks: PartialBlock[]): PartialBlock[] {
  // Используем общую функцию нормализации
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return normalizeBlockNoteTables(blocks as any) as PartialBlock[]
}

// Парсинг начального контента с санитизацией
function parseInitialContent(
  value: BlockNoteContent | string | undefined
): PartialBlock[] | undefined {
  if (!value) return undefined

  // Пустой массив — возвращаем undefined (BlockNote требует непустой массив)
  if (Array.isArray(value) && value.length === 0) return undefined

  let blocks: PartialBlock[] | undefined

  if (typeof value === 'string') {
    // Если это строка, пробуем распарсить как JSON
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        // Пустой массив в JSON — возвращаем undefined
        if (parsed.length === 0) return undefined
        blocks = parsed as PartialBlock[]
      } else if (parsed.blocks && Array.isArray(parsed.blocks)) {
        if (parsed.blocks.length === 0) return undefined
        blocks = parsed.blocks as PartialBlock[]
      }
    } catch {
      // Если не JSON, создаем параграф с текстом
      blocks = [
        {
          type: 'paragraph',
          content: value,
        },
      ]
    }
  } else if (Array.isArray(value)) {
    blocks = value as PartialBlock[]
  }

  // Нормализуем таблицы для совместимости с BlockNote
  const normalized = blocks ? normalizeTables(blocks) : undefined
  
  // Применяем санитизацию
  const sanitized = normalized ? sanitizeBlocks(normalized) : undefined
  
  // Debug: логируем финальные блоки перед передачей в BlockNote
  if (process.env.NODE_ENV === 'development' && sanitized) {
    const hasTables = sanitized.some(
      block =>
        block.type === 'table' ||
        (block.children && Array.isArray(block.children) && block.children.some((c: any) => c.type === 'table'))
    )
    if (hasTables) {
      console.log('[RichTextEditor] Финальные блоки для BlockNote:', JSON.stringify(sanitized, null, 2))
    }
  }
  
  // Если после санитизации массив пустой — возвращаем undefined
  return sanitized && sanitized.length > 0 ? sanitized : undefined
}

// Конвертация блоков в текст для валидации
function blocksToText(blocks: Block[]): string {
  return blocks
    .map(block => {
      const content = block.content as unknown
      if (!content) return ''
      if (typeof content === 'string') return content
      if (Array.isArray(content)) {
        return (content as Array<{ text?: string } | string>)
          .map(item => {
            if (typeof item === 'string') return item
            if (item && typeof item === 'object' && 'text' in item) return item.text ?? ''
            return ''
          })
          .join('')
      }
      return ''
    })
    .join('\n')
}

// Константы для валидации загрузки изображений
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

/**
 * Валидация файла изображения
 */
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Проверка размера
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Файл слишком большой. Максимальный размер: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }

  // Проверка типа
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      valid: false,
      error: 'Неподдерживаемый формат. Разрешены: JPEG, PNG, GIF, WebP',
    }
  }

  return { valid: true }
}

/**
 * Загрузка изображения для BlockNote редактора
 */
async function uploadImageForEditor(file: File): Promise<string> {
  // Валидация
  const validation = validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  try {
    // Загружаем изображение через API
    const response = await uploadsService.uploadImage(file)

    // Возвращаем полный URL
    const fullUrl = getMediaUrl(response.url)
    if (!fullUrl) {
      throw new Error('Не удалось получить URL изображения')
    }

    return fullUrl
  } catch (error) {
    console.error('Ошибка загрузки изображения:', error)
    throw new Error('Не удалось загрузить изображение. Попробуйте еще раз.')
  }
}

function RichTextEditorCore({
  value,
  onChange,
  onTextChange,
  placeholder = 'Начните вводить текст...',
  className,
  editable = true,
  theme,
}: RichTextEditorProps) {
  const initialContent = React.useMemo(() => parseInitialContent(value), [value])
  
  const editor = useCreateBlockNote({
    initialContent,
    // Включаем все стандартные блоки (включая image)
    blockSpecs: defaultBlockSpecs,
    // Включаем загрузку изображений
    uploadFile: editable ? uploadImageForEditor : undefined,
  })
  
  // Обновляем контент редактора при изменении value
  React.useEffect(() => {
    if (value !== undefined) {
      const newContent = parseInitialContent(value)
      if (newContent && newContent.length > 0) {
        try {
          // Проверяем, отличается ли новый контент от текущего
          const currentContent = JSON.stringify(editor.document)
          const newContentStr = JSON.stringify(newContent)
          
          if (currentContent !== newContentStr) {
            // Заменяем все блоки новым контентом
            editor.replaceBlocks(editor.document, newContent as Block[])
          }
        } catch (error) {
          // Если replaceBlocks не работает, логируем ошибку
          console.error('Ошибка обновления контента редактора:', error)
        }
      }
    }
  }, [value, editor])
  
  // Определяем тему на основе класса .dark на документе
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('light')
  
  React.useEffect(() => {
    if (theme) {
      setResolvedTheme(theme)
      return
    }
    
    // Проверяем наличие класса dark
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setResolvedTheme(isDark ? 'dark' : 'light')
    }
    
    checkTheme()
    
    // Следим за изменениями класса
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    
    return () => observer.disconnect()
  }, [theme])
  
  // Обработчик изменений
  const handleChange = React.useCallback(() => {
    const blocks = editor.document
    onChange?.(blocks)
    onTextChange?.(blocksToText(blocks))
  }, [editor, onChange, onTextChange])
  
  return (
    <div 
      className={cn(
        'rich-text-editor',
        'max-w-full overflow-x-hidden',
        'rounded-lg border border-border bg-background',
        'focus-within:border-brand-secondary focus-within:ring-2 focus-within:ring-brand-secondary/20',
        'transition-colors',
        className
      )}
      data-theme={resolvedTheme}
    >
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={resolvedTheme}
        onChange={handleChange}
        data-placeholder={placeholder}
      />
    </div>
  )
}

// Экспортируем RichTextEditor напрямую как RichTextEditorCore
export function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorCore {...props} />
}

// Компонент для отображения контента (read-only)
type RichTextContentProps = {
  // Принимаем любой массив блоков или строку
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: BlockNoteContent | any[] | string | null | undefined
  className?: string
}

export function RichTextContent({ content, className }: RichTextContentProps) {
  // Создаем ключ на основе контента для пересоздания компонента при изменении
  // Это гарантирует, что все блоки (включая изображения) будут правильно отображены
  const contentKey = React.useMemo(() => {
    if (!content) return 'empty-content'
    if (Array.isArray(content) && content.length === 0) return 'empty-content'
    try {
      return JSON.stringify(content)
    } catch {
      return String(content)
    }
  }, [content])

  if (!content) return null
  // Пустой массив - нет контента
  if (Array.isArray(content) && content.length === 0) return null

  // Теперь таблицы поддерживаются нативно через BlockNote
  // Просто рендерим весь контент, включая таблицы
  return (
    <div className="max-w-full overflow-x-hidden break-words [&_*]:max-w-full [&_*]:break-words">
      <RichTextEditor
        key={contentKey}
        value={content as BlockNoteContent | string}
        editable={false}
        className={cn('border-none bg-transparent', className)}
      />
    </div>
  )
}

// Хелпер для получения текста из блоков (экспортируется для валидации)
export { blocksToText }

// Типы для реэкспорта
export type { Block, PartialBlock } from '@blocknote/core'
