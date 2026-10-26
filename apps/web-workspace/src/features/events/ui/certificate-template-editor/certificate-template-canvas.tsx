import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Grid3x3,
  Minus,
  Plus,
  RotateCcw,
  Type,
} from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'
import { cn } from '@shared/lib/cn'

import {
  CERTIFICATE_FONT_FAMILIES_CSS_PARAM,
  CERTIFICATE_FONT_OPTIONS,
  CERTIFICATE_TEXT_COLORS,
  clampFontSize,
  DEFAULT_FIELDS_STATE,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  getCertificateFontOption,
  nameFieldHeightPercent,
  normalizeHexColor,
  type CertificateTemplateFieldsState,
  type NameAlign,
  type TemplateFieldArea,
} from './types'

type CertificateTemplateCanvasProps = {
  imageUrl: string
  width: number
  height: number
  /** PDF page width in points — used to scale font size into preview pixels. */
  pageWidthPt: number
  fields: CertificateTemplateFieldsState
  onFieldsChange: (fields: CertificateTemplateFieldsState) => void
  className?: string
  /**
   * Доп. зоны редактора бейджей («Роль» / «Название события»). Обычные
   * draggable/resizable-рамки без привязки к тулбару шрифта имени.
   * Без пропса поведение холста идентично редактору сертификатов.
   */
  extraZones?: { role?: boolean; eventName?: boolean }
  /** WYSIWYG-текст, который отрисуется внутри доп. зон (роль / название события). */
  zoneTexts?: { role?: string; eventName?: string }
  /** Подписи чипов тулбара для доп. зон (по умолчанию — zoneTexts). */
  zoneLabels?: { role?: string; eventName?: string }
  /** Состояние, к которому сбрасывает кнопка «Сбросить» (по умолчанию — сертификатное). */
  defaultFields?: CertificateTemplateFieldsState
}

/** Ключи зон, которые можно таскать по холсту. */
type CanvasZoneKey =
  | 'firstNamePosition'
  | 'lastNamePosition'
  | 'qrPosition'
  | 'rolePosition'
  | 'eventNamePosition'

/**
 * Кегль/цвет доп. зон по умолчанию в пунктах PDF-страницы — зеркалят
 * fallback'и buildBadgePdf (role 8pt #4b5563, event title 7pt #374151).
 * Шаблон может переопределить их через fields.roleFontSize и т.п.
 */
const EXTRA_ZONE_TEXT_STYLE = {
  rolePosition: { fontPt: 8, color: '#4b5563' },
  eventNamePosition: { fontPt: 7, color: '#374151' },
} as const

/** Актуальный текст, кегль и цвет доп. зоны: настройки шаблона поверх дефолтов. */
function resolveExtraZoneStyle(
  key: 'rolePosition' | 'eventNamePosition',
  fields: CertificateTemplateFieldsState,
  zoneTexts: CertificateTemplateCanvasProps['zoneTexts'],
  fallbackText: string
): { text: string; fontPt: number; color: string } {
  const defaults = EXTRA_ZONE_TEXT_STYLE[key]
  if (key === 'rolePosition') {
    return {
      text: fields.roleLabel?.trim() || zoneTexts?.role || fallbackText,
      fontPt: fields.roleFontSize ?? defaults.fontPt,
      color: normalizeHexColor(fields.roleColor) ?? defaults.color,
    }
  }
  return {
    text: fields.eventLabel?.trim() || zoneTexts?.eventName || fallbackText,
    fontPt: fields.eventFontSize ?? defaults.fontPt,
    color: normalizeHexColor(fields.eventColor) ?? defaults.color,
  }
}

function percentToPx(
  area: TemplateFieldArea,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: (area.x / 100) * containerWidth,
    y: (area.y / 100) * containerHeight,
    width: (area.width / 100) * containerWidth,
    height: (area.height / 100) * containerHeight,
  }
}

function pxToPercent(
  x: number,
  y: number,
  width: number,
  height: number,
  containerWidth: number,
  containerHeight: number
): TemplateFieldArea {
  return {
    x: (x / containerWidth) * 100,
    y: (y / containerHeight) * 100,
    width: (width / containerWidth) * 100,
    height: (height / containerHeight) * 100,
  }
}

const ZONE_COLORS: Record<
  string,
  { border: string; bg: string; text: string; ring: string; chip: string }
> = {
  firstNamePosition: {
    border: 'border-info',
    bg: 'bg-info-soft',
    text: 'text-info-soft-foreground',
    ring: 'ring-info-soft',
    chip: 'bg-info',
  },
  lastNamePosition: {
    border: 'border-success',
    bg: 'bg-success-soft',
    text: 'text-success-soft-foreground',
    ring: 'ring-success-soft',
    chip: 'bg-success',
  },
  qrPosition: {
    border: 'border-warning',
    bg: 'bg-warning-soft',
    text: 'text-warning-soft-foreground',
    ring: 'ring-warning-soft',
    chip: 'bg-warning',
  },
  rolePosition: {
    border: 'border-destructive',
    bg: 'bg-danger-soft',
    text: 'text-danger-soft-foreground',
    ring: 'ring-danger-soft',
    chip: 'bg-destructive',
  },
  eventNamePosition: {
    border: 'border-foreground/60',
    bg: 'bg-neutral-soft',
    text: 'text-neutral-soft-foreground',
    ring: 'ring-neutral-soft',
    chip: 'bg-foreground',
  },
}

/** Loads the preview webfonts once so the canvas matches the generated PDF. */
function useCertificateFontsPreload() {
  useEffect(() => {
    const id = 'certificate-fonts-preload'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?${CERTIFICATE_FONT_FAMILIES_CSS_PARAM}&display=swap`
    document.head.appendChild(link)
  }, [])
}

export function CertificateTemplateCanvas({
  imageUrl,
  width,
  height,
  pageWidthPt,
  fields,
  onFieldsChange,
  className,
  extraZones,
  zoneTexts,
  zoneLabels,
  defaultFields,
}: CertificateTemplateCanvasProps) {
  const t = useT()
  useCertificateFontsPreload()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [showGrid, setShowGrid] = useState(false)
  const [activeField, setActiveField] = useState<keyof CertificateTemplateFieldsState | null>(null)
  const aspect = width / height
  const canvasHeight = containerWidth ? Math.round(containerWidth / aspect) : 0
  // PDF page height in points (same rectangle as the image, so the px aspect
  // equals the pt aspect). Name box height is derived from font size + this.
  const pageHeightPt = width ? pageWidthPt * (height / width) : pageWidthPt

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    setContainerWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  const handleDragStop = useCallback(
    (field: CanvasZoneKey) =>
      (_e: unknown, d: { x: number; y: number }) => {
        const area = fields[field]
        if (!area) return
        const isName = field === 'firstNamePosition' || field === 'lastNamePosition'
        const px = percentToPx(area, containerWidth, canvasHeight)
        const next = pxToPercent(d.x, d.y, px.width, px.height, containerWidth, canvasHeight)
        onFieldsChange({
          ...fields,
          [field]: isName
            ? { ...next, height: nameFieldHeightPercent(fields.nameFontSize, pageHeightPt) }
            : next,
        })
      },
    [fields, onFieldsChange, containerWidth, canvasHeight, pageHeightPt]
  )

  const handleResizeStop = useCallback(
    (field: CanvasZoneKey) =>
      (
        _e: unknown,
        _dir: unknown,
        ref: HTMLElement,
        _delta: unknown,
        position: { x: number; y: number }
      ) => {
        const w = ref.offsetWidth
        const h = ref.offsetHeight
        const isQr = field === 'qrPosition'
        const isName = field === 'firstNamePosition' || field === 'lastNamePosition'
        const sizeW = isQr ? Math.min(w, h) : w
        const sizeH = isQr ? Math.min(w, h) : h
        const next = pxToPercent(position.x, position.y, sizeW, sizeH, containerWidth, canvasHeight)
        onFieldsChange({
          ...fields,
          // Name boxes never resize vertically — keep the font-derived height.
          [field]: isName
            ? { ...next, height: nameFieldHeightPercent(fields.nameFontSize, pageHeightPt) }
            : next,
        })
      },
    [fields, onFieldsChange, containerWidth, canvasHeight, pageHeightPt]
  )

  const handleReset = useCallback(() => {
    onFieldsChange({
      ...(defaultFields ?? DEFAULT_FIELDS_STATE),
      nameFont: fields.nameFont,
      nameBold: fields.nameBold,
      nameFontSize: fields.nameFontSize,
      nameColor: fields.nameColor,
      nameAlign: fields.nameAlign,
    })
  }, [
    onFieldsChange,
    defaultFields,
    fields.nameFont,
    fields.nameBold,
    fields.nameFontSize,
    fields.nameColor,
    fields.nameAlign,
  ])

  const setFont = useCallback(
    (fontId: string) =>
      onFieldsChange({ ...fields, nameFont: getCertificateFontOption(fontId).id }),
    [fields, onFieldsChange]
  )
  const toggleBold = useCallback(
    () => onFieldsChange({ ...fields, nameBold: !fields.nameBold }),
    [fields, onFieldsChange]
  )
  const setSize = useCallback(
    (size: number) => {
      const nextSize = clampFontSize(size)
      const nameHeight = nameFieldHeightPercent(nextSize, pageHeightPt)
      onFieldsChange({
        ...fields,
        nameFontSize: nextSize,
        firstNamePosition: { ...fields.firstNamePosition, height: nameHeight },
        lastNamePosition: { ...fields.lastNamePosition, height: nameHeight },
      })
    },
    [fields, onFieldsChange, pageHeightPt]
  )
  const setColor = useCallback(
    (hex: string) => {
      const c = normalizeHexColor(hex)
      if (c) onFieldsChange({ ...fields, nameColor: c })
    },
    [fields, onFieldsChange]
  )
  const setAlign = useCallback(
    (align: NameAlign) => onFieldsChange({ ...fields, nameAlign: align }),
    [fields, onFieldsChange]
  )

  const fontOption = getCertificateFontOption(fields.nameFont)
  const activeColor = (normalizeHexColor(fields.nameColor) ?? '#111111').toLowerCase()

  // Font size (points on the PDF page) → preview pixels on the scaled canvas.
  const pointToPx = containerWidth && pageWidthPt ? containerWidth / pageWidthPt : 0
  const previewFontPx = Math.max(6, Math.round(fields.nameFontSize * pointToPx))
  // Name box height is derived from the font size (not user-resizable).
  const nameHeightPx = canvasHeight
    ? (nameFieldHeightPercent(fields.nameFontSize, pageHeightPt) / 100) * canvasHeight
    : 0

  const zoneConfig = useMemo(() => {
    const zones: Array<{ key: CanvasZoneKey; label: string }> = [
      { key: 'firstNamePosition', label: t('events.certificates.fields.firstName') },
      { key: 'lastNamePosition', label: t('events.certificates.fields.lastName') },
      { key: 'qrPosition', label: t('events.certificates.fields.qr') },
    ]
    if (extraZones?.eventName) {
      zones.push({
        key: 'eventNamePosition',
        label: zoneLabels?.eventName ?? zoneTexts?.eventName ?? '',
      })
    }
    if (extraZones?.role) {
      zones.push({ key: 'rolePosition', label: zoneLabels?.role ?? zoneTexts?.role ?? '' })
    }
    return zones
  }, [t, extraZones?.eventName, extraZones?.role, zoneLabels, zoneTexts])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {zoneConfig.map(({ key, label }) => {
            const colors = ZONE_COLORS[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveField(activeField === key ? null : key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                  activeField === key
                    ? cn('border-foreground/20 bg-muted shadow-sm')
                    : 'border-transparent text-muted-foreground hover:bg-muted/60'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', colors.chip)} />
                {key === 'rolePosition' || key === 'eventNamePosition' ? (
                  <span className="max-w-[9rem] truncate">{label}</span>
                ) : (
                  label
                )}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowGrid(v => !v)}
            className={cn('h-8 gap-1.5 px-2.5', showGrid && 'bg-muted text-foreground')}
            aria-pressed={showGrid}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('events.certificates.canvas.grid')}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('events.certificates.canvas.reset')}</span>
          </Button>
        </div>
      </div>

      {/* Text style controls */}
      <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Type className="h-3.5 w-3.5" />
          {t('events.certificates.textStyle.title')}
          <span className="hidden font-normal normal-case tracking-normal text-muted-foreground/70 sm:inline">
            · {t('events.certificates.textStyle.description')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          {/* Font + bold */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('events.certificates.textStyle.font')}
            </span>
            <Select value={fields.nameFont} onValueChange={setFont}>
              <SelectTrigger className="h-9 w-40" style={{ fontFamily: fontOption.cssFamily }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CERTIFICATE_FONT_OPTIONS.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    <span style={{ fontFamily: option.cssFamily }} className="text-[15px]">
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleBold}
              aria-pressed={fields.nameBold}
              aria-label={t('events.certificates.textStyle.bold')}
              title={t('events.certificates.textStyle.bold')}
              className={cn(
                'h-9 w-9 shrink-0',
                fields.nameBold && 'border-primary/60 bg-primary/10 text-primary'
              )}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </div>

          {/* Size stepper */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('events.certificates.textStyle.size')}
            </span>
            <div className="inline-flex h-9 items-center rounded-lg border border-input bg-background">
              <button
                type="button"
                onClick={() => setSize(fields.nameFontSize - 1)}
                disabled={fields.nameFontSize <= FONT_SIZE_MIN}
                className="flex h-full w-8 items-center justify-center rounded-l-lg text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                aria-label="−"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                value={fields.nameFontSize}
                onChange={e => setSize(Number(e.target.value))}
                className="h-full w-11 border-x border-input bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setSize(fields.nameFontSize + 1)}
                disabled={fields.nameFontSize >= FONT_SIZE_MAX}
                className="flex h-full w-8 items-center justify-center rounded-r-lg text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                aria-label="+"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Color */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('events.certificates.textStyle.color')}
            </span>
            <div className="flex items-center gap-1">
              {CERTIFICATE_TEXT_COLORS.map(color => {
                const isActive = activeColor === color.toLowerCase()
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setColor(color)}
                    aria-label={color}
                    aria-pressed={isActive}
                    className={cn(
                      'h-6 w-6 rounded-full border transition',
                      isActive
                        ? 'ring-2 ring-foreground/40 ring-offset-1 ring-offset-background'
                        : 'border-border/70 hover:scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                )
              })}
              <label
                className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-border/70"
                title={t('events.certificates.textStyle.customColor')}
                style={{
                  background:
                    'conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #a855f7, #ef4444)',
                }}
              >
                <input
                  type="color"
                  value={normalizeHexColor(fields.nameColor) ?? '#111111'}
                  onChange={e => setColor(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label={t('events.certificates.textStyle.customColor')}
                />
              </label>
            </div>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('events.certificates.textStyle.align')}
            </span>
            <div className="inline-flex h-9 items-center rounded-lg border border-input bg-background p-0.5">
              {(
                [
                  {
                    value: 'left' as const,
                    Icon: AlignLeft,
                    label: t('events.certificates.textStyle.alignLeft'),
                  },
                  {
                    value: 'center' as const,
                    Icon: AlignCenter,
                    label: t('events.certificates.textStyle.alignCenter'),
                  },
                  {
                    value: 'right' as const,
                    Icon: AlignRight,
                    label: t('events.certificates.textStyle.alignRight'),
                  },
                ]
              ).map(({ value, Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAlign(value)}
                  aria-pressed={fields.nameAlign === value}
                  aria-label={label}
                  title={label}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md transition',
                    fields.nameAlign === value
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-border/60 bg-muted/30 shadow-inner"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {containerWidth > 0 && (
          <>
            <img
              src={imageUrl}
              alt={t('events.certificates.fields.alt')}
              className="absolute inset-0 h-full w-full object-contain pointer-events-none"
            />

            {showGrid && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)',
                  backgroundSize: '10% 10%',
                  mixBlendMode: 'difference',
                }}
              />
            )}

            {zoneConfig.map(({ key, label }) => {
              const area = fields[key]
              if (!area) return null
              const isQr = key === 'qrPosition'
              const extraStyle =
                key === 'rolePosition' || key === 'eventNamePosition'
                  ? resolveExtraZoneStyle(key, fields, zoneTexts, label)
                  : null
              const isExtra = extraStyle !== null
              const px = percentToPx(area, containerWidth, canvasHeight)
              const size = isQr
                ? { width: Math.min(px.width, px.height), height: Math.min(px.width, px.height) }
                : isExtra
                  ? { width: px.width, height: px.height }
                  : { width: px.width, height: nameHeightPx }
              const colors = ZONE_COLORS[key]
              const isActive = activeField === key

              return (
                <Rnd
                  key={key}
                  position={{ x: px.x, y: px.y }}
                  size={size}
                  onDragStart={() => setActiveField(key)}
                  onResizeStart={() => setActiveField(key)}
                  onDragStop={handleDragStop(key)}
                  onResizeStop={handleResizeStop(key)}
                  bounds="parent"
                  enableUserSelectHack={false}
                  resizeGrid={[2, 2]}
                  dragGrid={[2, 2]}
                  minWidth={20}
                  minHeight={isQr ? 20 : isExtra ? 8 : 1}
                  lockAspectRatio={isQr}
                  enableResizing={
                    isQr || isExtra
                      ? true
                      : {
                          top: false,
                          bottom: false,
                          left: true,
                          right: true,
                          topLeft: false,
                          topRight: false,
                          bottomLeft: false,
                          bottomRight: false,
                        }
                  }
                  className={cn(
                    'flex cursor-move overflow-hidden rounded-md border-2 border-dashed backdrop-blur-[1px] transition-shadow',
                    isQr ? 'items-center justify-center' : 'items-start justify-start',
                    colors.border,
                    colors.bg,
                    isActive ? cn('ring-2 ring-offset-1 ring-offset-background', colors.ring) : ''
                  )}
                >
                  {isQr ? (
                    <span
                      className={cn(
                        'truncate rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs',
                        'bg-background/85 shadow-sm',
                        colors.text
                      )}
                    >
                      {label}
                    </span>
                  ) : extraStyle ? (
                    // Доп. зоны бейджа: текст рендерится WYSIWYG — тем же
                    // семейством, что выбрано для имени, но regular 400, с
                    // кеглем/цветом/текстом шаблона, как в buildBadgePdf.
                    <span
                      className="pointer-events-none block w-full truncate px-0.5 text-left leading-tight"
                      style={{
                        fontFamily: fontOption.cssFamily,
                        fontWeight: 400,
                        fontSize: Math.max(6, Math.round(extraStyle.fontPt * pointToPx)),
                        color: extraStyle.color,
                      }}
                    >
                      {extraStyle.text}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        'pointer-events-none block w-full truncate px-0.5 leading-tight',
                        fields.nameAlign === 'center'
                          ? 'text-center'
                          : fields.nameAlign === 'right'
                            ? 'text-right'
                            : 'text-left'
                      )}
                      style={{
                        fontFamily: fontOption.cssFamily,
                        fontWeight: fields.nameBold ? 700 : 400,
                        fontSize: previewFontPx,
                        color: fields.nameColor,
                      }}
                    >
                      {label}
                    </span>
                  )}
                </Rnd>
              )
            })}
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t('events.certificates.canvas.hint')}</p>
    </div>
  )
}
