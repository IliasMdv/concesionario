import gsap from 'gsap'
import { BASE_SHOT, buildTrack, sampleTrack, type Key, type Layout, type Shot } from '../three/director'
import type { Experience } from '../three/experience'

/**
 * Bucle único de la página: lee el scroll, lo suaviza, calcula el plano del
 * director y reparte el resultado (3D, textos de la película, interfaz).
 * Usa el ticker de GSAP para que todo comparta el mismo requestAnimationFrame.
 */

export interface StageFrame {
  /** Scroll suavizado (px). */
  y: number
  vw: number
  vh: number
  /** Progreso 0–1 de la película fijada. */
  film: number
  shot: Shot
  reduced: boolean
  now: number
}

type Listener = (frame: StageFrame) => void

class Stage {
  experience: Experience | null = null
  readonly frame: StageFrame = {
    y: 0,
    vw: 1,
    vh: 1,
    film: 0,
    shot: { ...BASE_SHOT },
    reduced: false,
    now: 0,
  }
  private keys: Key[] = []
  private layout: Layout = { vh: 1, filmTop: 0, filmLength: 1, sections: [] }
  private listeners = new Set<Listener>()
  private smoothY = -1
  private running = false
  private measureQueued = false
  private lastY = -1
  private lastFilm = -1

  start() {
    if (this.running) return
    this.running = true
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    this.frame.reduced = motion.matches
    motion.addEventListener('change', (e) => {
      this.frame.reduced = e.matches
      this.experience?.invalidate()
    })
    window.addEventListener('resize', this.queueMeasure)
    new ResizeObserver(this.queueMeasure).observe(document.body)
    document.fonts?.ready.then(this.queueMeasure)
    this.measure()
    gsap.ticker.add(this.tick)
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(this.frame)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Plano que corresponde a una posición concreta de scroll (sin suavizado). */
  shotAt(y: number) {
    return sampleTrack(this.keys, y, { ...BASE_SHOT })
  }

  /** Posición de scroll para un progreso concreto de la película. */
  filmToScroll(progress: number) {
    return this.layout.filmTop + progress * this.layout.filmLength
  }

  queueMeasure = () => {
    if (this.measureQueued) return
    this.measureQueued = true
    requestAnimationFrame(() => {
      this.measureQueued = false
      this.measure()
    })
  }

  measure() {
    const vh = window.innerHeight
    const film = document.getElementById('film')
    const filmTop = film ? film.getBoundingClientRect().top + window.scrollY : 0
    const filmLength = film ? Math.max(1, film.offsetHeight - (film.querySelector<HTMLElement>('.film__frame')?.offsetHeight ?? vh)) : 1
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-shot]')).map((el) => ({
      id: el.dataset.shot as string,
      top: el.getBoundingClientRect().top + window.scrollY,
    }))
    this.layout = { vh, filmTop, filmLength, sections }
    this.keys = buildTrack(this.layout)
    this.frame.vw = window.innerWidth
    this.frame.vh = vh
    this.lastY = -1
    this.experience?.invalidate()
  }

  private tick = (time: number, deltaMs: number) => {
    const target = window.scrollY
    const dt = Math.min(deltaMs, 64) / 1000
    if (this.smoothY < 0 || this.frame.reduced) this.smoothY = target
    else {
      this.smoothY += (target - this.smoothY) * (1 - Math.exp(-dt * 8.5))
      if (Math.abs(target - this.smoothY) < 0.25) this.smoothY = target
    }
    const f = this.frame
    f.now = time * 1000
    const moved = this.smoothY !== this.lastY
    if (moved) {
      this.lastY = this.smoothY
      f.y = this.smoothY
      f.film = Math.min(1, Math.max(0, (this.smoothY - this.layout.filmTop) / this.layout.filmLength))
      sampleTrack(this.keys, this.smoothY, f.shot, f.reduced)
      if (f.reduced) {
        f.shot.roll = 0
        f.shot.speed = 0
      }
    }
    this.experience?.frame(f.shot, f.now)
    if (moved || f.film !== this.lastFilm) {
      this.lastFilm = f.film
      this.listeners.forEach((l) => l(f))
    }
  }
}

export const stage = new Stage()
