export type Tier = 'low' | 'medium' | 'high'

export interface Quality {
  tier: Tier
  maxDpr: number
  minDpr: number
  bloom: boolean
  reflection: boolean
  msaa: number
  beams: boolean
}

const PRESETS: Record<Tier, Omit<Quality, 'tier'>> = {
  high: { maxDpr: 2, minDpr: 1, bloom: true, reflection: true, msaa: 4, beams: true },
  medium: { maxDpr: 1.5, minDpr: 0.85, bloom: true, reflection: false, msaa: 2, beams: true },
  low: { maxDpr: 1, minDpr: 0.7, bloom: false, reflection: false, msaa: 0, beams: false },
}

/** Elige un nivel de calidad según la GPU, la memoria y el tipo de dispositivo. */
export function detectQuality(gl: WebGL2RenderingContext | WebGLRenderingContext): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const coarse = matchMedia('(pointer: coarse)').matches
  // Algunos navegadores incrustados informan de screen = 0×0: se usa también el viewport.
  const screenMin = Math.min(screen.width, screen.height) || Infinity
  const small = Math.min(screenMin, window.innerWidth, window.innerHeight) < 600
  const cores = nav.hardwareConcurrency || 4
  const memory = nav.deviceMemory ?? 8

  let gpu = ''
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  if (info) gpu = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
  const software = /swiftshader|llvmpipe|software|basic render/i.test(gpu)
  const weakGpu = /mali-[4t]|adreno \(tm\) [3-5]\d\d|powervr|intel\(r\) (hd|uhd) graphics [2-6]\d{2}\b/i.test(gpu)

  let tier: Tier = 'high'
  if (software || cores <= 2 || memory <= 2) tier = 'low'
  else if (coarse || small || weakGpu || cores <= 4 || memory <= 4) tier = 'medium'

  const forced = new URLSearchParams(location.search).get('quality')
  if (forced === 'low' || forced === 'medium' || forced === 'high') tier = forced

  return { tier, ...PRESETS[tier] }
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}
