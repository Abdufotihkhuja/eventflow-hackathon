import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@eventflow/i18n/react'
import './index.css'
import App from './App.tsx'

import { QueryProvider, UIProvider } from '@app/providers'
import { ThemeProvider } from '@shared/lib'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider defaultTheme="system" storageKey="eventflow-theme">
        <QueryProvider>
          <UIProvider>
            <App />
          </UIProvider>
        </QueryProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>
)
