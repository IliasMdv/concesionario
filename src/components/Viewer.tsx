import { useEffect, useRef } from 'react'
import { stage } from '../lib/stage'
import { Experience } from '../three/experience'
import { detectQuality } from '../three/quality'

interface Props {
  attempt: number
  onProgress: (ratio: number) => void
  onReady: (experience: Experience) => void
  onError: (error: unknown) => void
}

/** Sondea las capacidades de la GPU con un contexto temporal. */
function probeQuality() {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2')
  if (!gl) throw new Error('WebGL 2 no está disponible en este navegador.')
  const quality = detectQuality(gl)
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  return quality
}

export function Viewer({ attempt, onProgress, onReady, onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const callbacks = useRef({ onProgress, onReady, onError })
  callbacks.current = { onProgress, onReady, onError }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let experience: Experience | null = null
    let cancelled = false
    try {
      experience = new Experience(canvas, probeQuality())
    } catch (err) {
      callbacks.current.onError(err)
      return
    }
    const exp = experience
    exp.onContextLost = () => callbacks.current.onError(new Error('Se perdió el contexto gráfico de la GPU.'))
    stage.experience = exp
    exp
      .load((r) => !cancelled && callbacks.current.onProgress(r))
      .then(() => {
        if (cancelled) return
        stage.queueMeasure()
        callbacks.current.onReady(exp)
        if (import.meta.env.DEV) {
          import('../lib/renders').then(({ installRenderTool }) => installRenderTool(exp))
        }
      })
      .catch((err) => !cancelled && callbacks.current.onError(err))
    return () => {
      cancelled = true
      if (stage.experience === exp) stage.experience = null
      exp.dispose()
    }
  }, [attempt])

  // Un lienzo nuevo por intento: un contexto perdido no se reutiliza.
  return <canvas key={attempt} ref={canvasRef} className="viewer" aria-hidden="true" />
}
