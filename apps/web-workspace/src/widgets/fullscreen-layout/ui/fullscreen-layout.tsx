/**
 * Fullscreen layout для kanban-доски и других полноэкранных компонентов
 */

import { Outlet } from 'react-router-dom'

export function FullscreenLayout() {
  return (
    <div className="h-screen w-screen overflow-y-auto bg-background">
      <Outlet />
    </div>
  )
}
