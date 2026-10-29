import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SOURCES, SPEC_GROUPS } from '../data/car'
import { GALLERY, type GalleryItem } from '../data/story'
import { useReveal } from '../lib/reveal'
import { stage } from '../lib/stage'

gsap.registerPlugin(ScrollTrigger)

const BASE = import.meta.env.BASE_URL

const FEATURES = [
  {
    title: 'E-Diff3 + F1-Trac',
    text: 'Diferencial electrónico y control de tracción integrados. Ferrari los diseñó para mejorar un 32 % la aceleración en curva respecto a sus predecesores.',
  },
  {
    title: 'Techo rígido retráctil',
    text: 'Patente de Ferrari, íntegramente de aluminio: se despliega en 14 segundos y pesa 25 kg menos que una capota de lona convencional.',
  },
  {
    title: 'Deflector de viento eléctrico',
    text: 'Regulable, frena y difunde el aire en el habitáculo para poder conversar con normalidad por encima de 200 km/h.',
  },
  {
    title: 'Doble embrague, 7 marchas',
    text: 'Cambio F1 de doble embrague (Getrag) con levas en el volante y sin opción manual.',
  },
  {
    title: 'Suspensión magnetorreológica',
    text: 'Amortiguadores adaptativos desarrollados junto a BWI Group que ajustan su firmeza de forma continua.',
  },
  {
    title: 'Frenos carbocerámicos',
    text: 'De serie, con ABS y función de prellenado para que el pedal responda antes en la frenada.',
  },
]

const STATEMENT =
  'El habitáculo del 458 contó con las aportaciones de Michael Schumacher. El resultado es un volante que concentra los mandos que antes vivían en el salpicadero, para que las manos no tengan que soltarlo nunca.'

export function Tech() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const ctx = gsap.context(() => {
      const words = el.querySelectorAll('.statement__word')
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.fromTo(
        words,
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: 'none',
          scrollTrigger: { trigger: el.querySelector('.statement'), start: 'top 82%', end: 'bottom 48%', scrub: true },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section id="tecnologia" className="section section--tech" data-shot="tecnologia" ref={root}>
      <div className="section__head" data-reveal>
        <p className="kicker">06 — Tecnología y equipamiento</p>
        <h2 className="title">
          Ingeniería de competición,
          <br />
          <em>homologada para la calle.</em>
        </h2>
      </div>
      <p className="statement" aria-label={STATEMENT}>
        {STATEMENT.split(' ').map((w, i) => (
          <span className="statement__word" key={i} aria-hidden="true">
            {w}{' '}
          </span>
        ))}
      </p>
      <ol className="features">
        {FEATURES.map((f, i) => (
          <li key={f.title} className="feature" data-reveal style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
            <span className="feature__index">{String(i + 1).padStart(2, '0')}</span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function Gallery() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState<GalleryItem | null>(null)
  const [missing, setMissing] = useState<Record<string, boolean>>({})
  const dialog = useRef<HTMLDialogElement>(null)
  useReveal(root)

  useEffect(() => {
    let last = -1
    return stage.subscribe((f) => {
      const el = root.current
      const tr = track.current
      if (!el || !tr) return
      const rect = el.getBoundingClientRect()
      const span = rect.height - f.vh
      const p = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0
      if (Math.abs(p - last) < 1e-4) return
      last = p
      const distance = Math.max(0, tr.scrollWidth - window.innerWidth)
      tr.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`
      if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`
    })
  }, [])

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <section id="galeria" className="section section--gallery" data-shot="galeria" ref={root}>
      <div className="gallery__sticky">
        <div className="gallery__head" data-reveal>
          <div>
            <p className="kicker">07 — Galería</p>
            <h2 className="title">
              Fotogramas <em>del plató</em>
            </h2>
          </div>
          <p className="gallery__note">Renders generados en tiempo real a partir del propio modelo 3D de la página.</p>
        </div>
        <div className="gallery__track" ref={track}>
          {GALLERY.map((item, i) => (
            <figure className="shot" key={item.src}>
              <button type="button" className="shot__frame" onClick={() => setOpen(item)} aria-label={`Ampliar: ${item.title}`}>
                {missing[item.src] ? (
                  <span className="shot__placeholder">{item.title}</span>
                ) : (
                  <img
                    src={BASE + item.src}
                    alt={`${item.title}: ${item.caption}`}
                    loading="lazy"
                    decoding="async"
                    width={1000}
                    height={1250}
                    onError={() => setMissing((m) => ({ ...m, [item.src]: true }))}
                  />
                )}
              </button>
              <figcaption>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <b>{item.title}</b> {item.caption}
              </figcaption>
            </figure>
          ))}
        </div>
        <span className="gallery__progress" aria-hidden="true">
          <span ref={bar} />
        </span>
      </div>
      <dialog className="lightbox" ref={dialog} onClose={() => setOpen(null)} onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
        {open && (
          <figure>
            <img src={BASE + open.src} alt={`${open.title}: ${open.caption}`} />
            <figcaption>
              <b>{open.title}</b> {open.caption}
            </figcaption>
            <button type="button" className="lightbox__close" onClick={() => setOpen(null)} aria-label="Cerrar">
              ×
            </button>
          </figure>
        )}
      </dialog>
    </section>
  )
}

export function Specs() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  return (
    <section id="ficha" className="section section--specs" data-shot="ficha" ref={root}>
      <div className="section__head" data-reveal>
        <p className="kicker">08 — Ficha técnica</p>
        <h2 className="title">
          Los números
          <br />
          <em>sin adornos.</em>
        </h2>
      </div>
      <div className="specs">
        {SPEC_GROUPS.map((g, i) => (
          <div className="specs__group" key={g.title} data-reveal style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
            <h3>{g.title}</h3>
            <dl>
              {g.rows.map((r) => (
                <div className="specs__row" key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <p className="specs__sources" data-reveal>
        * Con llantas forjadas y asientos de competición. Datos del Ferrari 458 Spider (2011 – 2015) según su ficha de lanzamiento. Fuentes:{' '}
        {SOURCES.map((s, i) => (
          <span key={s.href}>
            <a href={s.href} target="_blank" rel="noreferrer">
              {s.label}
            </a>
            {i < SOURCES.length - 1 ? ' · ' : '.'}
          </span>
        ))}
      </p>
    </section>
  )
}
