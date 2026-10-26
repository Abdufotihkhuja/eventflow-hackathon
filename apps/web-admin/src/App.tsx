import { RouterProvider } from 'react-router-dom'

import { router } from '@app/providers'

export function App() {
  return <RouterProvider router={router} />
}

export default App
