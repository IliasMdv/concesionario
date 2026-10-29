/**
 * Herramienta de desarrollo: genera los fotogramas de la galería y del modo
 * sin WebGL a partir del propio modelo 3D y los guarda en public/renders/
 * mediante el middleware de vite.config.ts (solo existe en `npm run dev`).
 *
 * Uso: abrir la web en desarrollo con ?renders, o ejecutar en consola
 * `await window.__poniente.captureRenders()`.
 */
import { SCENES } from '../data/story'
import type { Experience } from '../three/experience'
import { stage } from './stage'

interface Job {
  name: string
  film: number
  width: number
  height: number
}

const JOBS: Job[] = [
  ...SCENES.map((s) => ({ name: `scene-${s.id}`, film: s.anchor, width: 1600, height: 900 })),
  { name: 'gallery-front', film: 0.245, width: 1000, height: 1250 },
  { name: 'gallery-profile', film: 0.37, width: 1000, height: 1250 },
  { name: 'gallery-wheel', film: 0.465, width: 1000, height: 1250 },
  { name: 'gallery-light', film: 0.54, width: 1000, height: 1250 },
  { name: 'gallery-rear', film: 0.69, width: 1000, height: 1250 },
  { name: 'gallery-hero', film: 1, width: 1000, height: 1250 },
]

export function installRenderTool(experience: Experience) {
  const captureRenders = async () => {
    const saved: string[] = []
    for (const job of JOBS) {
      const shot = stage.shotAt(stage.filmToScroll(job.film))
      const data = experience.renderStill(shot, job.width, job.height)
      const res = await fetch(`/__renders?name=${job.name}`, { method: 'POST', body: data })
      if (!res.ok) throw new Error(`No se pudo guardar ${job.name}: ${res.status}`)
      saved.push(job.name)
    }
    experience.invalidate()
    return saved
  }
  ;(window as unknown as { __poniente: unknown }).__poniente = { captureRenders, experience }
  if (new URLSearchParams(location.search).has('renders')) {
    captureRenders().then((names) => console.info('[renders] guardados:', names.join(', ')))
  }
}
