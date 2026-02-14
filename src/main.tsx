import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { NaturalLanguagePrototype } from './prototype/NaturalLanguagePrototype'

// Simple path-based routing (handles base path from vite.config.ts)
const path = window.location.pathname
const basePath = import.meta.env.BASE_URL || '/'

function Root() {
  // Remove base path to get the route
  const route = path.startsWith(basePath)
    ? path.slice(basePath.length - 1) // Keep leading slash
    : path

  if (route === '/prototype' || route === '/prototype/') {
    return <NaturalLanguagePrototype />
  }
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
