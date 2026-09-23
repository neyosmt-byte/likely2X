import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { AccessBoundary } from './app/AccessBoundary.tsx'
import { CryptoAppProviders } from './app/Providers.tsx'
import { CryptoRouter } from './app/Router.tsx'
import './styles/theme.css'

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><CryptoAppProviders><AccessBoundary><CryptoRouter /></AccessBoundary></CryptoAppProviders></BrowserRouter></StrictMode>)
