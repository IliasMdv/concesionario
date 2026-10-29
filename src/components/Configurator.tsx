import { useEffect, useRef, type CSSProperties } from 'react'
import { EXTRAS, FINANCE, RIMS, UNITS } from '../data/car'
import { formatInt, formatPrice } from '../lib/format'
import { useReveal } from '../lib/reveal'
import { stage } from '../lib/stage'
import { useStore } from '../lib/store'

/** Cifra que se anima al cambiar de valor. */
function AnimatedPrice({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const current = useRef(value)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const from = current.current
    current.current = value
    if (from === value || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = formatPrice(value)
      return
    }
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 600)
      const e = 1 - Math.pow(1 - t, 3)
      el.textContent = formatPrice(from + (value - from) * e)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span ref={ref}>{formatPrice(value)}</span>
}

export function Configurator({ ready }: { ready: boolean }) {
  const { config, update, toggleExtra, totals, openLead } = useStore()
  const root = useRef<HTMLElement>(null)
  useReveal(root)

  // La pintura y las llantas del coche 3D siguen a la configuración.
  useEffect(() => {
    if (ready) stage.experience?.setPaint(totals.unit.hex, totals.unit.finish === 'metallic')
  }, [ready, totals.unit])
  useEffect(() => {
    if (ready) stage.experience?.setRims(totals.rim.hex, totals.rim.metalness, totals.rim.roughness)
  }, [ready, totals.rim])

  return (
    <section id="configurador" className="section section--config" data-shot="configurador" ref={root}>
      <div className="config">
        <div className="config__head" data-reveal>
          <p className="kicker">09 — Configura tu unidad</p>
          <h2 className="title">
            Cinco unidades.
            <br />
            <em>Una es la tuya.</em>
          </h2>
        </div>

        <fieldset className="config__block" data-reveal>
          <legend>Unidad y color</legend>
          <div className="units" role="radiogroup" aria-label="Unidad">
            {UNITS.map((u) => (
              <label key={u.id} className={`unit${config.unitId === u.id ? ' is-active' : ''}`}>
                <input
                  type="radio"
                  name="unit"
                  value={u.id}
                  checked={config.unitId === u.id}
                  onChange={() => update({ unitId: u.id })}
                />
                <span className="unit__swatch" style={{ background: u.hex }} aria-hidden="true" />
                <span className="unit__name">{u.paint}</span>
                <span className="unit__meta">
                  {u.year} · {formatInt(u.km)} km
                </span>
                <span className="unit__price">{formatPrice(u.price)}</span>
              </label>
            ))}
          </div>
          <p className="config__hint">{totals.unit.note}</p>
        </fieldset>

        <fieldset className="config__block" data-reveal>
          <legend>Acabado de llantas</legend>
          <div className="chips" role="radiogroup" aria-label="Acabado de llantas">
            {RIMS.map((r) => (
              <label key={r.id} className={`chip${config.rimId === r.id ? ' is-active' : ''}`}>
                <input type="radio" name="rim" value={r.id} checked={config.rimId === r.id} onChange={() => update({ rimId: r.id })} />
                <span className="chip__swatch" style={{ background: r.hex }} aria-hidden="true" />
                {r.label}
                <small>{r.price ? `+${formatPrice(r.price)}` : 'Incluido'}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="config__block" data-reveal>
          <legend>Paquetes Poniente</legend>
          <div className="extras">
            {EXTRAS.map((e) => (
              <label key={e.id} className={`extra${config.extras.includes(e.id) ? ' is-active' : ''}`}>
                <input type="checkbox" checked={config.extras.includes(e.id)} onChange={() => toggleExtra(e.id)} />
                <span className="extra__check" aria-hidden="true" />
                <span className="extra__text">
                  <b>{e.label}</b>
                  <small>{e.detail}</small>
                </span>
                <span className="extra__price">+{formatPrice(e.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="config__block" data-reveal>
          <legend>Financiación orientativa</legend>
          <div className="finance">
            <label className="finance__range">
              <span>
                Entrada <b>{config.downPct} %</b> · {formatPrice(totals.down)}
              </span>
              <input
                type="range"
                min={FINANCE.minDown}
                max={FINANCE.maxDown}
                step={5}
                value={config.downPct}
                onChange={(e) => update({ downPct: Number(e.target.value) })}
                style={{ '--fill': `${((config.downPct - FINANCE.minDown) / (FINANCE.maxDown - FINANCE.minDown)) * 100}%` } as CSSProperties}
              />
            </label>
            <div className="chips" role="radiogroup" aria-label="Plazo">
              {FINANCE.terms.map((t) => (
                <label key={t} className={`chip chip--small${config.term === t ? ' is-active' : ''}`}>
                  <input type="radio" name="term" value={t} checked={config.term === t} onChange={() => update({ term: t })} />
                  {t} meses
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <div className="summary" data-reveal>
          <dl className="summary__lines">
            <div>
              <dt>{totals.unit.paint} · {totals.unit.year}</dt>
              <dd>{formatPrice(totals.base)}</dd>
            </div>
            {totals.rim.price > 0 && (
              <div>
                <dt>Llantas {totals.rim.label.toLowerCase()}</dt>
                <dd>+{formatPrice(totals.rim.price)}</dd>
              </div>
            )}
            {totals.extras.map((e) => (
              <div key={e.id}>
                <dt>{e.label}</dt>
                <dd>+{formatPrice(e.price)}</dd>
              </div>
            ))}
          </dl>
          <div className="summary__total">
            <span>Total</span>
            <strong>
              <AnimatedPrice value={totals.total} />
            </strong>
          </div>
          <p className="summary__monthly">
            o <b>{formatPrice(totals.monthly)}/mes</b> en {config.term} meses con {config.downPct} % de entrada · TIN {String(FINANCE.tin).replace('.', ',')} %
          </p>
          <div className="cta">
            <button type="button" className="btn btn--primary" onClick={() => openLead('info')}>
              Solicitar información
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => openLead('drive')}>
              Reservar prueba de conducción
            </button>
          </div>
          <p className="legal">
            Precios, unidades y condiciones de financiación de demostración. Simulación orientativa sin valor contractual; IVA incluido.
          </p>
        </div>
      </div>
    </section>
  )
}
