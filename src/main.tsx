import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/instrument-serif/latin-400.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'

if (import.meta.env.DEV) {
  // Acceso de depuración desde la consola (solo en `npm run dev`).
  Promise.all([import('gsap'), import('./lib/stage')]).then(([{ default: gsap }, { stage }]) =>
    Object.assign(window, { __debug: { gsap, stage } }),
  )
}

// Sin StrictMode: el doble montaje en desarrollo crearía dos renderizadores WebGL sobre el mismo lienzo.
createRoot(document.getElementById('root')!).render(<App />)
