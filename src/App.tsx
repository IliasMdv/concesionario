import { useCallback, useEffect, useRef, useState } from 'react'
import { Configurator } from './components/Configurator'
import { Contact, Footer } from './components/Contact'
import { Fallback } from './components/Fallback'
import { Film } from './components/Film'
import { LeadDialog } from './components/LeadDialog'
import { Loader, type LoadStatus } from './components/Loader'
import { Nav } from './components/Nav'
import { Gallery, Specs, Tech } from './components/Sections'
import { Viewer } from './components/Viewer'
import { stage } from './lib/stage'
import { StoreProvider } from './lib/store'
import { hasWebGL } from './three/quality'

type Mode = 'webgl' | 'static'

export default function App() {
  const [mode, setMode] = useState<Mode>(() => (hasWebGL() ? 'webgl' : 'static'))
  const [status, setStatus] = useState<LoadStatus>(() => (hasWebGL() ? 'loading' : 'ready'))
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  const scrim = useRef<HTMLDivElement>(null)

  useEffect(() => {
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    stage.start()
    return stage.subscribe((f) => {
      if (scrim.current) scrim.current.style.opacity = f.shot.dim.toFixed(3)
    })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', status !== 'ready')
  }, [status])

  const onProgress = useCallback((r: number) => setProgress((p) => Math.max(p, r * 0.92)), [])
  const onReady = useCallback(() => {
    setProgress(1)
    setStatus('ready')
  }, [])
  const statusRef = useRef(status)
  statusRef.current = status
  const onError = useCallback((err: unknown) => {
    console.error(err)
    // Si la GPU falla con la página ya en marcha, se pasa al modo estático sin interrumpir.
    if (statusRef.current === 'ready') {
      setMode('static')
      return
    }
    setMessage(err instanceof Error ? err.message : undefined)
    setStatus('error')
  }, [])

  const retry = () => {
    setProgress(0)
    setMessage(undefined)
    setStatus('loading')
    setAttempt((a) => a + 1)
  }
  const goStatic = () => {
    setMode('static')
    setStatus('ready')
  }

  const ready = status === 'ready'

  return (
    <StoreProvider>
      {mode === 'webgl' ? (
        <Viewer attempt={attempt} onProgress={onProgress} onReady={onReady} onError={onError} />
      ) : (
        <Fallback />
      )}
      <div className="scrim" ref={scrim} aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <Nav />
      <main>
        <Film ready={ready} />
        <Tech />
        <Gallery />
        <Specs />
        <Configurator ready={ready && mode === 'webgl'} />
        <Contact />
      </main>
      <Footer />
      <LeadDialog />
      {mode === 'webgl' && <Loader progress={progress} status={status} message={message} onRetry={retry} onStatic={goStatic} />}
    </StoreProvider>
  )
}
