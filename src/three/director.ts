/**
 * Director de fotografía: convierte la posición de scroll en un «plano»
 * (cámara orbital + iluminación). Es una función pura del scroll, así que la
 * secuencia avanza y retrocede de forma idéntica en ambos sentidos.
 *
 * Convención: el coche mira hacia -Z. az = 0 → cámara detrás (zaga),
 * az = π → cámara delante, az = π/2 → costado derecho (+X).
 */

export interface Shot {
  /** Punto al que mira la cámara. */
  tx: number
  ty: number
  tz: number
  /** Órbita: azimut, elevación (rad) y distancia (m). */
  az: number
  el: number
  r: number
  fov: number
  roll: number
  /** Desplazamiento óptico del encuadre (fracción del ancho/alto) en escritorio y en vertical. */
  sx: number
  sy: number
  msx: number
  msy: number
  /** Cuánto se preserva el encuadre horizontal en pantallas estrechas (0–1). */
  fit: number
  env: number
  envRot: number
  key: number
  rim: number
  top: number
  head: number
  tail: number
  sunset: number
  drive: number
  speed: number
  dim: number
  exposure: number
  bloom: number
}

export type ShotPatch = Partial<Shot>
export type Ease = 'inOut' | 'out' | 'linear'

export interface Key {
  at: number
  shot: Shot
  ease: Ease
}

export const SHOT_KEYS = [
  'tx', 'ty', 'tz', 'az', 'el', 'r', 'fov', 'roll', 'sx', 'sy', 'msx', 'msy', 'fit',
  'env', 'envRot', 'key', 'rim', 'top', 'head', 'tail', 'sunset', 'drive', 'speed', 'dim', 'exposure', 'bloom',
] as const satisfies readonly (keyof Shot)[]

const PI = Math.PI

export const BASE_SHOT: Shot = {
  tx: 0, ty: 0.55, tz: 0,
  az: 2.5, el: 0.07, r: 12.5, fov: 24, roll: 0,
  sx: 0, sy: 0, msx: 0, msy: 0.08, fit: 0.9,
  env: 0, envRot: -1.5, key: 0, rim: 0, top: 0,
  head: 0, tail: 0, sunset: 0, drive: 0, speed: 0,
  dim: 0, exposure: 1, bloom: 0.55,
}

/** Película principal: progreso 0–1 de la sección fijada. */
export const FILM: [number, ShotPatch, Ease?][] = [
  // Escena 1 — Aparición: oscuridad, contraluz, barrido de luz.
  [0.0, { rim: 0.35 }],
  [0.03, { rim: 1, top: 0.35, env: 0.04, r: 11.6, envRot: -1.2 }],
  [0.085, { env: 0.6, key: 0.55, top: 1, envRot: -0.25, r: 9.8, az: 2.6 }],
  [0.125, { env: 0.92, key: 1, envRot: 0.25, r: 9.1, az: 2.68, top: 0.55, rim: 0.7 }],
  // Escena 2 — Frontal: aproximación y encendido de faros.
  [0.17, { az: PI, el: 0.035, r: 6.6, fov: 26, ty: 0.5, tz: -0.6, top: 0.12, envRot: 0.75, fit: 0.75, sx: 0.2, msy: 0.12 }],
  [0.205, { head: 1, r: 5.7, bloom: 0.8 }],
  [0.245, { r: 5.35, el: 0.055, envRot: 1.1 }],
  // Escena 3 — Lateral: órbita hasta el perfil completo.
  [0.3, { az: PI / 2 + 0.02, el: 0.03, r: 8.4, fov: 25, ty: 0.55, tz: 0.05, head: 0.22, envRot: 1.7, top: 0, sx: 0, sy: -0.1, msy: 0.02, fit: 1, bloom: 0.55 }],
  [0.37, { az: PI / 2 - 0.1, r: 8.1, envRot: 2.15 }],
  // Escena 4 — Detalles: llanta, óptica, flanco.
  [0.405, { az: 1.95, el: 0.1, r: 4.4, tx: 0.5, ty: 0.45, tz: -0.9, fov: 30, head: 0.25, sy: 0, fit: 0.55 }],
  [0.435, { tx: 0.83, ty: 0.36, tz: -1.155, az: 1.74, el: 0.06, r: 1.95, fov: 32, envRot: 2.4, fit: 0.4 }],
  [0.465, { az: 1.6, r: 1.85, envRot: 2.65 }],
  [0.49, { tx: 0.55, ty: 0.6, tz: -1.55, az: 2.2, el: 0.18, r: 2.7 }],
  [0.515, { tx: 0.6, ty: 0.68, tz: -1.85, az: 2.52, el: 0.16, r: 1.5, head: 1, bloom: 0.9 }],
  [0.54, { az: 2.64, r: 1.42 }],
  [0.565, { tx: 0.72, ty: 0.68, tz: -0.35, az: 1.8, el: 0.2, r: 3.1, head: 0.3, bloom: 0.55 }],
  [0.59, { tx: 0.9, ty: 0.72, tz: 0.55, az: 1.25, el: 0.14, r: 2.05 }],
  [0.61, { az: 1.12, r: 1.95, envRot: 3.0 }],
  // Escena 5 — Zaga: pilotos encendidos y vista sobre el motor.
  [0.655, { tx: 0, ty: 0.62, tz: 1.3, az: 0.35, el: 0.12, r: 6.3, fov: 28, tail: 1, head: 0, envRot: 3.3, fit: 0.8, bloom: 0.8, sx: -0.17 }],
  [0.69, { az: -0.05, el: 0.42, r: 5.1, envRot: 3.6 }],
  [0.715, { az: -0.25, el: 0.36, r: 5.3 }],
  // Escena 6 — Plano dinámico: travelling bajo, dolly-zoom y velocidad.
  [0.745, { tx: 0, ty: 0.42, tz: -0.4, az: 2.05, el: 0.0, r: 5.8, fov: 38, roll: 0.07, sx: 0, sy: 0.06, head: 1, tail: 0.6, speed: 1, drive: 12, envRot: 4.2, fit: 0.7, bloom: 0.9 }],
  [0.8, { az: 3.55, r: 3.7, fov: 54, roll: -0.06, drive: 74 }, 'linear'],
  [0.845, { az: 4.15, el: 0.04, r: 7.2, fov: 28, roll: 0, drive: 96, speed: 0, ty: 0.5, tz: 0, sy: 0 }, 'out'],
  // Escena 7 — Presentación final con el atardecer de fondo.
  [0.9, { az: PI + 0.62, el: 0.09, r: 8.7, fov: 26, sx: 0.21, msx: 0, msy: 0.14, sunset: 1, head: 1, tail: 0.5, env: 0.95, envRot: 5.0, key: 1, fit: 0.95, bloom: 0.75 }],
  [1.0, { az: PI + 0.72, r: 8.4, envRot: 5.3 }],
]

/** Planos de las secciones posteriores a la película (por id de sección). */
export const SECTION_SHOTS: Record<string, ShotPatch> = {
  tecnologia: { az: 2.0, el: 0.62, r: 9.8, fov: 30, tx: 0, ty: 0.3, tz: 0, sx: 0.27, msx: 0, msy: 0.2, sunset: 0.5, head: 0.6, tail: 0.3, dim: 0.12, envRot: 6.0, fit: 0.9 },
  galeria: { az: 0.75, el: 0.06, r: 8.6, fov: 26, ty: 0.5, sx: 0, sy: 0, msy: 0, dim: 0.74, sunset: 0.6, envRot: 6.6 },
  ficha: { az: -PI / 2, el: 0.05, r: 8.3, fov: 25, sx: 0, dim: 0.84, envRot: 7.2, head: 0.4, tail: 0.6 },
  configurador: { az: -2.42, el: 0.12, r: 8.4, fov: 26, ty: 0.5, sx: 0.2, msx: 0, msy: 0.2, dim: 0, sunset: 0.85, head: 1, tail: 0.4, envRot: 7.8, fit: 0.95 },
  contacto: { az: -2.6, el: 0.2, r: 9.5, sx: 0, msy: 0, dim: 0.62, envRot: 8.2 },
}

const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  linear: (t: number) => t,
}

export interface Layout {
  vh: number
  filmTop: number
  filmLength: number
  sections: { id: string; top: number }[]
}

export function buildTrack(layout: Layout): Key[] {
  const keys: Key[] = []
  let current: Shot = { ...BASE_SHOT }
  const push = (at: number, patch: ShotPatch, e: Ease = 'inOut') => {
    current = { ...current, ...patch }
    keys.push({ at, shot: current, ease: e })
  }
  for (const [p, patch, e] of FILM) push(layout.filmTop + p * layout.filmLength, patch, e)

  const filmEnd = layout.filmTop + layout.filmLength
  for (const section of layout.sections) {
    const patch = SECTION_SHOTS[section.id]
    if (!patch) continue
    const start = Math.max(section.top - layout.vh * 0.95, keys[keys.length - 1].at, filmEnd)
    const end = Math.max(section.top - layout.vh * 0.15, start + 1)
    push(start, {})
    push(end, patch)
  }
  return keys
}

export function sampleTrack(keys: Key[], y: number, out: Shot, cut = false): Shot {
  if (keys.length === 0) return Object.assign(out, BASE_SHOT)
  if (y <= keys[0].at) return Object.assign(out, keys[0].shot)
  const last = keys[keys.length - 1]
  if (y >= last.at) return Object.assign(out, last.shot)
  let i = 0
  while (i < keys.length - 2 && keys[i + 1].at <= y) i++
  const a = keys[i]
  const b = keys[i + 1]
  const span = b.at - a.at
  const raw = span > 0 ? (y - a.at) / span : 1
  // Con movimiento reducido no hay transiciones: cortes secos entre planos.
  const t = cut ? (raw < 0.5 ? 0 : 1) : ease[b.ease](raw)
  for (const k of SHOT_KEYS) out[k] = a.shot[k] + (b.shot[k] - a.shot[k]) * t
  return out
}
