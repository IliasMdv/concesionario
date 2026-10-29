import { useEffect, useRef } from 'react'
import { FALLBACK_FRAMES, SCENES } from '../data/story'
import { stage } from '../lib/stage'

const BASE = import.meta.env.BASE_URL

/**
 * Alternativa sin WebGL: fotogramas renderizados del mismo modelo 3D que se
 * funden según la escena activa. Los textos y la narrativa siguen funcionando.
 */
export function Fallback() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let last = -1
    return stage.subscribe((f) => {
      let current = 0
      SCENES.forEach((s, i) => {
        if (f.film >= s.range[0] - 0.02) current = i
      })
      if (f.film >= 1) current = SCENES.length - 1
      if (current === last) return
      last = current
      root.current?.querySelectorAll('img').forEach((img, i) => img.classList.toggle('is-active', i === current))
    })
  }, [])

  return (
    <div className="fallback" ref={root} aria-hidden="true">
      {FALLBACK_FRAMES.map((src, i) => (
        <img key={src} src={BASE + src} alt="" className={i === 0 ? 'is-active' : ''} decoding="async" />
      ))}
      <p className="fallback__note">Versión estática: tu navegador no permite WebGL, así que mostramos fotogramas del modelo 3D.</p>
    </div>
  )
}
