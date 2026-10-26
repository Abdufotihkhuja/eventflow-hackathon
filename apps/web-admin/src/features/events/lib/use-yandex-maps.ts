import * as React from 'react'

const SCRIPT_ID = 'yandex-maps-script'

function getApiKey(): string {
  return (import.meta as unknown as { env: { VITE_YANDEX_MAPS_API_KEY?: string } }).env
    .VITE_YANDEX_MAPS_API_KEY ?? ''
}

export function useYandexMaps() {
  const [isReady, setIsReady] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const apiKey = getApiKey()
    if (!apiKey?.trim()) {
      setError('Ключ Yandex Maps не задан (VITE_YANDEX_MAPS_API_KEY)')
      return
    }
    if (typeof window === 'undefined') return

    const setReady = () => {
      if (window.ymaps) {
        window.ymaps.ready(() => setIsReady(true))
      }
    }

    if (window.ymaps) {
      setReady()
      return
    }

    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      const check = setInterval(() => {
        if (window.ymaps) {
          setReady()
          clearInterval(check)
        }
      }, 50)
      return () => clearInterval(check)
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`
    script.async = true
    script.onload = setReady
    script.onerror = () => setError('Не удалось загрузить Yandex Maps')
    document.head.appendChild(script)
  }, [])

  return { isReady, error }
}
