import gsap from 'gsap'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { fromPrice, UNITS } from '../data/car'
import { DIMENSIONS, DIMENSIONS_RANGE, HOTSPOTS, SCENES } from '../data/story'
import { formatDecimal, formatPrice } from '../lib/format'
import { stage, type StageFrame } from '../lib/stage'
import { useStore } from '../lib/store'
import type { Projected } from '../three/experience'

/** Texto partido en líneas enmascaradas para revelarlas de abajo arriba. */
function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line) => (
        <span className="line" key={line}>
          <span>{line}</span>
        </span>
      ))}
    </>
  )
}

const IN = 0.03
const OUT = 0.024

function buildTimeline(root: HTMLElement, reduced: boolean) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  const hide = reduced ? { autoAlpha: 0 } : { yPercent: 115 }
  const show = reduced ? { autoAlpha: 1 } : { yPercent: 0 }
  const leave = reduced ? { autoAlpha: 0 } : { yPercent: -115 }

  for (const scene of SCENES) {
    const el = root.querySelector<HTMLElement>(`[data-scene="${scene.id}"]`)
    if (!el) continue
    const lines = el.querySelectorAll('.line > span')
    const fades = el.querySelectorAll('[data-fade]')
    const [a, b] = scene.range
    if (a > 0) {
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.003 }, a)
      if (lines.length) tl.fromTo(lines, hide, { ...show, duration: IN, stagger: 0.006, ease: 'power3.out' }, a)
      if (fades.length)
        tl.fromTo(fades, { autoAlpha: 0, y: reduced ? 0 : 26 }, { autoAlpha: 1, y: 0, duration: IN, stagger: 0.005, ease: 'power2.out' }, a + 0.008)
    }
    if (b < 1) {
      const t = b - OUT - 0.005
      if (lines.length) tl.to(lines, { ...leave, duration: OUT, stagger: 0.004, ease: 'power2.in' }, t)
      if (fades.length) tl.to(fades, { autoAlpha: 0, y: reduced ? 0 : -18, duration: OUT * 0.8, ease: 'power1.in' }, t)
      tl.to(el, { autoAlpha: 0, duration: 0.003 }, b - 0.003)
    }
  }

  // Contadores de prestaciones (escena 6).
  root.querySelectorAll<HTMLElement>('[data-count]').forEach((node, i) => {
    const target = Number(node.dataset.count)
    const decimals = Number(node.dataset.decimals ?? 0)
    const proxy = { v: 0 }
    const write = () => (node.textContent = formatDecimal(proxy.v, decimals))
    write()
    tl.fromTo(proxy, { v: 0 }, { v: target, duration: 0.05, ease: 'power2.out', onUpdate: write }, 0.758 + i * 0.008)
  })

  // Bandas de cine 2.39:1 durante el plano dinámico.
  const bars = root.querySelectorAll('.letterbox')
  tl.fromTo(bars, { scaleY: 0 }, { scaleY: 1, duration: 0.02, ease: 'power2.out' }, 0.735)
  tl.to(bars, { scaleY: 0, duration: 0.02, ease: 'power2.in' }, 0.848)

  // Puntos de interés anclados al coche.
  for (const hs of HOTSPOTS) {
    const parts = root.querySelectorAll(`[data-hs="${hs.id}"]`)
    const [a, b] = hs.range
    tl.fromTo(parts, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.008 }, a)
    const card = root.querySelector(`.hs-card[data-hs="${hs.id}"] .hs-card__inner`)
    if (card && !reduced) tl.fromTo(card, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.014, ease: 'power2.out' }, a + 0.004)
    tl.to(parts, { autoAlpha: 0, duration: 0.008 }, b - 0.008)
  }

  // Cotas de la vista lateral.
  const [d0, d1] = DIMENSIONS_RANGE
  const dims = root.querySelector('.dims')
  const strokes = root.querySelectorAll('.dims__line')
  const labels = root.querySelectorAll('.dim-label')
  tl.fromTo(dims, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.004 }, d0)
  tl.fromTo(strokes, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.03, stagger: 0.008, ease: 'power2.inOut' }, d0)
  tl.fromTo(labels, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.012, stagger: 0.008 }, d0 + 0.018)
  tl.to([dims, labels], { autoAlpha: 0, duration: 0.012 }, d1 - 0.012)

  tl.set({}, {}, 1)
  return tl
}

export function Film({ ready }: { ready: boolean }) {
  const { openLead } = useStore()
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      const tl = buildTimeline(el, reduced)
      gsap.set(el.querySelectorAll('.scene--1 .line > span'), reduced ? { autoAlpha: 0 } : { yPercent: 115 })
      gsap.set(el.querySelectorAll('.scene--1 [data-fade]'), { autoAlpha: 0 })

      const hotspotEls = HOTSPOTS.map((hs) => ({
        hs,
        dot: el.querySelector<HTMLElement>(`.hs-dot[data-hs="${hs.id}"]`),
        card: el.querySelector<HTMLElement>(`.hs-card[data-hs="${hs.id}"]`),
      }))
      const dimEls = DIMENSIONS.map((d) => ({
        d,
        line: el.querySelector<SVGLineElement>(`.dims__line[data-dim="${d.id}"]`),
        ticks: el.querySelectorAll<SVGLineElement>(`.dims__tick[data-dim="${d.id}"]`),
        label: el.querySelector<HTMLElement>(`.dim-label[data-dim="${d.id}"]`),
      }))
      const a: Projected = { x: 0, y: 0, visible: false }
      const b: Projected = { x: 0, y: 0, visible: false }

      const place = (f: StageFrame) => {
        const exp = stage.experience
        if (!exp) return
        const wide = f.vw >= 900
        if (f.film > 0.41 && f.film < 0.64) {
          for (const { hs, dot, card } of hotspotEls) {
            if (f.film < hs.range[0] - 0.01 || f.film > hs.range[1] + 0.01) continue
            exp.project(hs.point, a)
            const tf = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`
            if (dot) dot.style.transform = tf
            if (card) card.style.transform = wide ? tf : ''
          }
        }
        if (f.film > DIMENSIONS_RANGE[0] - 0.01 && f.film < DIMENSIONS_RANGE[1] + 0.01) {
          for (const { d, line, ticks, label } of dimEls) {
            exp.project(d.from, a)
            exp.project(d.to, b)
            line?.setAttribute('x1', a.x.toFixed(1))
            line?.setAttribute('y1', a.y.toFixed(1))
            line?.setAttribute('x2', b.x.toFixed(1))
            line?.setAttribute('y2', b.y.toFixed(1))
            const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
            const nx = (-(b.y - a.y) / len) * 7
            const ny = ((b.x - a.x) / len) * 7
            ticks.forEach((tick, i) => {
              const p = i === 0 ? a : b
              tick.setAttribute('x1', (p.x - nx).toFixed(1))
              tick.setAttribute('y1', (p.y - ny).toFixed(1))
              tick.setAttribute('x2', (p.x + nx).toFixed(1))
              tick.setAttribute('y2', (p.y + ny).toFixed(1))
            })
            const lx = d.anchor === 'end' ? b.x : (a.x + b.x) / 2
            const ly = d.anchor === 'end' ? b.y : (a.y + b.y) / 2
            if (label) label.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`
          }
        }
      }

      const unsubscribe = stage.subscribe((f) => {
        tl.time(f.film)
        place(f)
      })
      return unsubscribe
    }, el)
    return () => ctx.revert()
  }, [])

  // Entrada del título cuando termina la carga.
  useEffect(() => {
    const el = root.current
    if (!ready || !el) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const lines = el.querySelectorAll('.scene--1 .line > span')
    const fades = el.querySelectorAll('.scene--1 [data-fade]')
    const intro = gsap.timeline({ delay: 0.35 })
    if (reduced) intro.to([...lines, ...fades], { autoAlpha: 1, duration: 0.6 })
    else {
      intro.to(lines, { yPercent: 0, duration: 1.4, stagger: 0.12, ease: 'expo.out' })
      intro.to(fades, { autoAlpha: 1, duration: 1, stagger: 0.1, ease: 'power2.out' }, 0.5)
    }
    return () => {
      intro.progress(1).kill()
    }
  }, [ready])

  const minKm = Math.min(...UNITS.map((u) => u.km))

  return (
    <section id="film" className="film" ref={root} aria-label="Presentación cinematográfica del Ferrari 458 Spider">
      <div className="film__frame">
        <div className="letterbox letterbox--top" aria-hidden="true" />
        <div className="letterbox letterbox--bottom" aria-hidden="true" />

        <article className="scene scene--1" data-scene="1">
          <p className="kicker" data-fade>
            Poniente presenta · Unidad seleccionada
          </p>
          <h1 className="hero-title" aria-label="Ferrari 458 Spider">
            <span className="line">
              <span className="hero-title__num">458</span>
            </span>
            <span className="line">
              <span className="hero-title__name">Spider</span>
            </span>
          </h1>
          <div className="scene__aside" data-fade>
            <p>V8 atmosférico de 570 CV, techo rígido de aluminio y el cielo de Algeciras como único límite.</p>
            <span className="scroll-cue">
              <span className="scroll-cue__bar" aria-hidden="true" />
              Desliza para encender
            </span>
          </div>
        </article>

        <article className="scene scene--2 scene--left" data-scene="2">
          <p className="kicker" data-fade>
            01 — Frontal
          </p>
          <h2 className="title">
            <Lines text={'Aerodinámica\nque se adapta'} />
          </h2>
          <p className="body" data-fade>
            Las aletas aeroelásticas de la toma frontal generan carga y, a alta velocidad, se deforman para reducir la entrada de
            aire y la resistencia.
          </p>
          <dl className="stat" data-fade>
            <dt>Potencia específica</dt>
            <dd>
              127 CV <small>por litro</small>
            </dd>
          </dl>
        </article>

        <article className="scene scene--3 scene--top" data-scene="3">
          <p className="kicker" data-fade>
            02 — Perfil
          </p>
          <h2 className="title">
            <Lines text={'Cielo abierto\nen 14 segundos'} />
          </h2>
          <p className="body" data-fade>
            Techo rígido retráctil de aluminio, 25 kg más ligero que una capota de lona, que se pliega delante del motor sin
            restar rigidez al chasis. Carrocería de Pininfarina.
          </p>
        </article>

        <article className="scene scene--4 scene--top" data-scene="4">
          <p className="kicker" data-fade>
            03 — Detalles
          </p>
          <h2 className="title title--sm">
            <Lines text={'Cada pieza\ncuenta algo'} />
          </h2>
        </article>

        <article className="scene scene--5 scene--right" data-scene="5">
          <p className="kicker" data-fade>
            04 — El corazón
          </p>
          <h2 className="title">
            <Lines text={'V8. Nueve mil\nvueltas.'} />
          </h2>
          <p className="body" data-fade>
            4.499 cm³, inyección directa y compresión de 12,5:1. Los 570 CV llegan a 9.000 rpm y salen por un escape triple
            central. Reparto de pesos: 42 % delante, 58 % detrás.
          </p>
          <ul className="mini-stats" data-fade>
            <li>
              <b>570 CV</b> a 9.000 rpm
            </li>
            <li>
              <b>540 Nm</b> a 6.000 rpm
            </li>
          </ul>
        </article>

        <article className="scene scene--6" data-scene="6">
          <p className="kicker" data-fade>
            05 — En movimiento
          </p>
          <h2 className="title title--xl">
            <Lines text="Pura aceleración" />
          </h2>
          <div className="counters">
            <div className="counter" data-fade>
              <span className="counter__value">
                <span data-count="3.4" data-decimals="1">
                  0
                </span>
                <small>s</small>
              </span>
              <span className="counter__label">0 – 100 km/h (menos de)</span>
            </div>
            <div className="counter" data-fade>
              <span className="counter__value">
                <span data-count="320">0</span>
                <small>km/h</small>
              </span>
              <span className="counter__label">Velocidad máxima</span>
            </div>
            <div className="counter" data-fade>
              <span className="counter__value">
                <span data-count="570">0</span>
                <small>CV</small>
              </span>
              <span className="counter__label">A 9.000 rpm</span>
            </div>
          </div>
          <p className="body body--center" data-fade>
            Cambio F1 de doble embrague y 7 marchas, E-Diff3 y F1-Trac trabajando juntos.
          </p>
        </article>

        <article className="scene scene--7 scene--left" data-scene="7">
          <p className="kicker" data-fade>
            Disponible en Poniente
          </p>
          <h2 className="title title--final">
            <Lines text={'Ferrari\n458 Spider'} />
          </h2>
          <p className="price" data-fade>
            <span className="price__from">Desde</span>
            <span className="price__value">{formatPrice(fromPrice)}</span>
            <span className="price__tax">IVA incl. · precio de demostración</span>
          </p>
          <p className="note" data-fade>
            {UNITS.length} unidades certificadas · desde {minKm.toLocaleString('es-ES')} km
          </p>
          <div className="cta" data-fade>
            <button type="button" className="btn btn--primary" onClick={() => openLead('drive')}>
              Reservar prueba de conducción
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => openLead('info')}>
              Solicitar información
            </button>
          </div>
          <a className="link-arrow" href="#configurador" data-fade>
            Configurar mi unidad
          </a>
        </article>

        <svg className="dims" aria-hidden="true">
          {DIMENSIONS.map((d) => (
            <g key={d.id}>
              <line className="dims__line" data-dim={d.id} pathLength={1} />
              <line className="dims__tick" data-dim={d.id} />
              <line className="dims__tick" data-dim={d.id} />
            </g>
          ))}
        </svg>
        {DIMENSIONS.map((d) => (
          <span key={d.id} className="dim-label" data-dim={d.id}>
            {d.label}
          </span>
        ))}

        {HOTSPOTS.map((hs) => (
          <div key={hs.id} className="hs-dot" data-hs={hs.id} aria-hidden="true">
            <span />
          </div>
        ))}
        {HOTSPOTS.map((hs) => (
          <aside key={hs.id} className={`hs-card hs-card--${hs.side}`} data-hs={hs.id}>
            <div className="hs-card__inner">
              <p className="kicker">{hs.label}</p>
              <h3>{hs.title}</h3>
              <p>{hs.text}</p>
            </div>
          </aside>
        ))}
      </div>
    </section>
  )
}
