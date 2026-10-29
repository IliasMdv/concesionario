import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { DEALER } from '../data/car'

export type LoadStatus = 'loading' | 'ready' | 'error'

interface Props {
  progress: number
  status: LoadStatus
  message?: string
  onRetry: () => void
  onStatic: () => void
}

export function Loader({ progress, status, message, onRetry, onStatic }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)
  const shown = Math.round(progress * 100)

  useEffect(() => {
    if (status !== 'ready' || !root.current) return
    const el = root.current
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const tl = gsap.timeline({ onComplete: () => setGone(true) })
    if (reduced) tl.to(el, { autoAlpha: 0, duration: 0.5 })
    else {
      tl.to(el.querySelector('.loader__bar span'), { scaleX: 1, duration: 0.4, ease: 'power2.out' })
      tl.to(el.querySelectorAll('.loader__inner > *'), { autoAlpha: 0, y: -16, duration: 0.5, stagger: 0.05, ease: 'power2.in' }, '+=0.1')
      tl.to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.inOut' }, '-=0.2')
    }
    return () => {
      tl.kill()
    }
  }, [status])

  if (gone) return null

  return (
    <div className="loader" ref={root} role="status" aria-live="polite">
      <div className="loader__inner">
        <p className="loader__brand">
          <span className="brand__mark" aria-hidden="true" /> {DEALER.name}
        </p>
        {status === 'error' ? (
          <div className="loader__error">
            <h2>No se pudo preparar la escena 3D</h2>
            <p>{message ?? 'Comprueba la conexión e inténtalo de nuevo.'}</p>
            <div className="cta">
              <button type="button" className="btn btn--primary" onClick={onRetry}>
                Reintentar
              </button>
              <button type="button" className="btn btn--ghost" onClick={onStatic}>
                Ver versión estática
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="loader__count" aria-label={`Cargando ${shown} %`}>
              {String(shown).padStart(3, '0')}
            </p>
            <div className="loader__bar" aria-hidden="true">
              <span style={{ transform: `scaleX(${progress})` }} />
            </div>
            <p className="loader__caption">
              Ferrari 458 Spider · Preparando el plató 3D
              <span>{progress < 1 ? 'Descargando modelo y materiales' : 'Compilando luces y reflejos'}</span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
