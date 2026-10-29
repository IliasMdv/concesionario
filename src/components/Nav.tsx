import { useEffect, useRef, useState } from 'react'
import { DEALER } from '../data/car'
import { SCENES } from '../data/story'
import { stage } from '../lib/stage'
import { useStore } from '../lib/store'

const LINKS = [
  { href: '#tecnologia', label: 'Tecnología' },
  { href: '#galeria', label: 'Galería' },
  { href: '#ficha', label: 'Ficha técnica' },
  { href: '#configurador', label: 'Configurar' },
  { href: '#contacto', label: 'Contacto' },
]

const pad = (n: number) => String(n).padStart(2, '0')

function scrollToY(y: number) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' })
}

export function Nav() {
  const { openLead } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const header = useRef<HTMLElement>(null)
  const rail = useRef<HTMLElement>(null)
  const index = useRef<HTMLSpanElement>(null)
  const name = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let lastScene = -1
    let lastInFilm: boolean | null = null
    return stage.subscribe((f) => {
      const inFilm = f.film < 0.999
      let current = 0
      SCENES.forEach((s, i) => {
        if (f.film >= s.range[0] - 0.012) current = i
      })
      if (bar.current) bar.current.style.transform = `scaleX(${f.film.toFixed(4)})`
      if (current !== lastScene) {
        lastScene = current
        if (index.current) index.current.textContent = pad(current + 1)
        if (name.current) name.current.textContent = SCENES[current].name
        rail.current?.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === current ? 'step' : 'false'))
      }
      if (inFilm !== lastInFilm) {
        lastInFilm = inFilm
        header.current?.classList.toggle('is-after', !inFilm)
        rail.current?.classList.toggle('is-hidden', !inFilm)
      }
      header.current?.classList.toggle('is-scrolled', f.y > 40)
    })
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])

  return (
    <>
      <header className={`nav${menuOpen ? ' is-menu' : ''}`} ref={header}>
        <a className="brand" href="#film" onClick={(e) => (e.preventDefault(), scrollToY(0))}>
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">{DEALER.name}</span>
          <span className="brand__claim">{DEALER.claim}</span>
        </a>

        <div className="nav__scene" aria-hidden="true">
          <span ref={index}>01</span>
          <span className="nav__scene-total">/ {pad(SCENES.length)}</span>
          <span className="nav__scene-name" ref={name}>
            {SCENES[0].name}
          </span>
          <span className="nav__progress">
            <span ref={bar} />
          </span>
        </div>

        <nav className="nav__links" aria-label="Secciones">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav__actions">
          <button type="button" className="btn btn--pill" onClick={() => openLead('drive')}>
            Reservar prueba
          </button>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="menu"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div id="menu" className={`menu${menuOpen ? ' is-open' : ''}`} hidden={!menuOpen}>
        <nav aria-label="Menú principal">
          <a
            href="#film"
            onClick={(e) => {
              e.preventDefault()
              setMenuOpen(false)
              scrollToY(0)
            }}
          >
            <small>00</small>Experiencia
          </a>
          {LINKS.map((l, i) => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
              <small>{pad(i + 1)}</small>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="menu__foot">
          <p>{DEALER.city}</p>
          <p>{DEALER.hours}</p>
        </div>
      </div>

      <aside className="rail" ref={rail} aria-label="Escenas de la presentación">
        {SCENES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-current={i === 0 ? 'step' : 'false'}
            onClick={() => scrollToY(stage.filmToScroll(s.anchor))}
          >
            <span className="rail__label">{s.name}</span>
            <span className="rail__dot" aria-hidden="true" />
          </button>
        ))}
      </aside>
    </>
  )
}
