import { useCallback, useState } from 'react'

import Cropper, { type Area } from 'react-easy-crop'
import { Minus, Plus, RotateCcw, RotateCw } from 'lucide-react'

import { cn } from '@shared/lib/cn'

import { Button } from './shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './shadcn/dialog'

type ImageCropperDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  aspect?: number
  cropShape?: 'rect' | 'round'
  title?: string
  description?: string
  outputWidth?: number
  outputHeight?: number
  onCropComplete: (blob: Blob) => void
}

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
  outputWidth?: number,
  outputHeight?: number
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const radians = (rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))
  const rotW = image.width * cos + image.height * sin
  const rotH = image.width * sin + image.height * cos

  canvas.width = rotW
  canvas.height = rotH

  ctx.translate(rotW / 2, rotH / 2)
  ctx.rotate(radians)
  ctx.drawImage(image, -image.width / 2, -image.height / 2)

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height)

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.putImageData(data, 0, 0)

  const exportCanvas =
    outputWidth && outputHeight && (outputWidth !== canvas.width || outputHeight !== canvas.height)
      ? document.createElement('canvas')
      : canvas

  if (exportCanvas !== canvas) {
    exportCanvas.width = outputWidth
    exportCanvas.height = outputHeight
    exportCanvas.getContext('2d')!.drawImage(canvas, 0, 0, outputWidth, outputHeight)
  }

  return new Promise((resolve, reject) => {
    exportCanvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
      0.95
    )
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageSrc,
  aspect = 1,
  cropShape = 'rect',
  title = 'Обрезка изображения',
  description = 'Перетаскивайте и масштабируйте изображение',
  outputWidth,
  outputHeight,
  onCropComplete,
}: ImageCropperDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleApply = useCallback(async () => {
    if (!croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const blob = await getCroppedBlob(
        imageSrc,
        croppedAreaPixels,
        rotation,
        outputWidth,
        outputHeight
      )
      onCropComplete(blob)
      onOpenChange(false)
    } catch {
      // silent
    } finally {
      setIsProcessing(false)
    }
  }, [
    croppedAreaPixels,
    imageSrc,
    rotation,
    outputWidth,
    outputHeight,
    onCropComplete,
    onOpenChange,
  ])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setRotation(0)
        setCroppedAreaPixels(null)
      }
      onOpenChange(next)
    },
    [onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative h-[40vh] min-h-[220px] sm:h-[50vh] sm:min-h-[300px] bg-black/95">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="px-4 py-3 space-y-3 border-t sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs font-medium text-muted-foreground w-16 sm:w-20 shrink-0">
              Масштаб
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setZoom(z => Math.max(1, z - 0.1))}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className={cn(
                'flex-1 h-1.5 appearance-none rounded-full bg-muted cursor-pointer',
                '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm',
                '[&::-webkit-slider-thumb]:cursor-pointer'
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setZoom(z => Math.min(3, z + 0.1))}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs font-medium text-muted-foreground w-16 sm:w-20 shrink-0">
              Поворот
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setRotation(r => r - 90)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={e => setRotation(Number(e.target.value))}
              className={cn(
                'flex-1 h-1.5 appearance-none rounded-full bg-muted cursor-pointer',
                '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm',
                '[&::-webkit-slider-thumb]:cursor-pointer'
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setRotation(r => r + 90)}
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <DialogFooter className="px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isProcessing}>
            Отмена
          </Button>
          <Button onClick={handleApply} disabled={isProcessing || !croppedAreaPixels}>
            {isProcessing ? 'Обработка...' : 'Применить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
