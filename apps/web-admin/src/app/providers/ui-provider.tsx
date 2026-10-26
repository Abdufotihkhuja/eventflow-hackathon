import { TooltipProvider } from '@shared/ui'

type UIProviderProps = {
  children: React.ReactNode
}

export function UIProvider({ children }: UIProviderProps) {
  return <TooltipProvider>{children}</TooltipProvider>
}
