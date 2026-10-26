import { Navigate, useSearchParams } from 'react-router-dom'

/**
 * Совместимость со старыми ссылками `/invite/activate?token=...`.
 * Перенаправляет на новый экран принятия `/invite/accept`, сохраняя токен.
 */
export function ActivateRedirect() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const target = token ? `/invite/accept?token=${encodeURIComponent(token)}` : '/invite/accept'

  return <Navigate to={target} replace />
}
