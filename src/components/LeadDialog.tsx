import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { DEALER, UNITS } from '../data/car'
import { formatPrice } from '../lib/format'
import { leadsMode, submitLead, type LeadResult } from '../lib/leads'
import { useStore } from '../lib/store'

const SLOTS = ['10:00', '11:00', '12:00', '13:00', '17:00', '18:00', '19:00']

const isoDate = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

type Status = { state: 'idle' } | { state: 'sending' } | { state: 'done'; result: LeadResult } | { state: 'error'; message: string }

export function LeadDialog() {
  const { lead, closeLead, totals, config, update } = useStore()
  const dialog = useRef<HTMLDialogElement>(null)
  const [status, setStatus] = useState<Status>({ state: 'idle' })
  const [error, setError] = useState('')

  const minDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return isoDate(d)
  }, [])

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (lead && !d.open) {
      setStatus({ state: 'idle' })
      setError('')
      d.showModal()
      document.documentElement.classList.add('is-modal')
    } else if (!lead && d.open) {
      d.close()
    }
  }, [lead])

  const onClose = () => {
    document.documentElement.classList.remove('is-modal')
    closeLead()
  }

  const configuration = [
    `${totals.unit.paint} ${totals.unit.year}`,
    `llantas ${totals.rim.label.toLowerCase()}`,
    ...totals.extras.map((e) => e.label),
  ].join(' · ')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    const data = new FormData(form)
    const date = String(data.get('date') ?? '')
    if (lead === 'drive' && date && new Date(`${date}T12:00:00`).getDay() === 0) {
      setError('Los domingos la exposición está cerrada. Elige otro día.')
      return
    }
    setError('')
    setStatus({ state: 'sending' })
    try {
      const result = await submitLead({
        kind: lead ?? 'info',
        name: String(data.get('name') ?? '').trim(),
        email: String(data.get('email') ?? '').trim(),
        phone: String(data.get('phone') ?? '').trim(),
        message: String(data.get('message') ?? '').trim() || undefined,
        date: date || undefined,
        slot: String(data.get('slot') ?? '') || undefined,
        unit: totals.unit.id,
        configuration,
        total: totals.total,
        createdAt: new Date().toISOString(),
      })
      setStatus({ state: 'done', result })
    } catch (err) {
      setStatus({ state: 'error', message: err instanceof Error ? err.message : 'Error desconocido' })
    }
  }

  const drive = lead === 'drive'

  return (
    <dialog
      className="lead"
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      aria-labelledby="lead-title"
    >
      <div className="lead__panel">
        <button type="button" className="lead__close" onClick={() => dialog.current?.close()} aria-label="Cerrar">
          ×
        </button>
        {status.state === 'done' ? (
          <div className="lead__done">
            <p className="kicker">Referencia {status.result.reference}</p>
            <h2 id="lead-title">{drive ? 'Prueba solicitada' : 'Solicitud recibida'}</h2>
            {status.result.mode === 'sent' ? (
              <p>Un asesor de {DEALER.name} te contactará en menos de 24 horas laborables.</p>
            ) : (
              <p>
                Modo demostración: la solicitud se ha guardado solo en este navegador y no se ha enviado a ningún servidor. Configura{' '}
                <code>VITE_LEADS_ENDPOINT</code> para recibir solicitudes reales.
              </p>
            )}
            <button type="button" className="btn btn--primary" onClick={() => dialog.current?.close()}>
              Volver a la experiencia
            </button>
          </div>
        ) : (
          <form className="lead__form" onSubmit={onSubmit} noValidate>
            <p className="kicker">{drive ? 'Prueba de conducción' : 'Solicitar información'}</p>
            <h2 id="lead-title">{drive ? 'Reserva tu prueba' : 'Hablemos de tu 458'}</h2>
            <p className="lead__summary">
              {configuration} · <b>{formatPrice(totals.total)}</b>
            </p>

            <div className="field-row">
              <label className="field">
                <span>Nombre y apellidos</span>
                <input name="name" required autoComplete="name" minLength={2} />
              </label>
              <label className="field">
                <span>Correo electrónico</span>
                <input name="email" type="email" required autoComplete="email" />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Teléfono{drive ? '' : ' (opcional)'}</span>
                <input name="phone" type="tel" autoComplete="tel" required={drive} pattern="[+0-9 ]{9,16}" />
              </label>
              <label className="field">
                <span>Unidad</span>
                <select value={config.unitId} onChange={(e) => update({ unitId: e.target.value })}>
                  {UNITS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.paint} · {u.year} · {formatPrice(u.price)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {drive ? (
              <div className="field-row">
                <label className="field">
                  <span>Fecha</span>
                  <input name="date" type="date" required min={minDate} />
                </label>
                <label className="field">
                  <span>Hora</span>
                  <select name="slot" required defaultValue="">
                    <option value="" disabled>
                      Elige una hora
                    </option>
                    {SLOTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <label className="field">
                <span>Mensaje</span>
                <textarea name="message" rows={3} placeholder="Cuéntanos qué quieres saber: historial, revisiones, financiación…" />
              </label>
            )}

            {drive && (
              <label className="check">
                <input type="checkbox" required />
                <span>Tengo permiso de conducir B con más de 3 años de antigüedad.</span>
              </label>
            )}
            <label className="check">
              <input type="checkbox" required />
              <span>Acepto que {DEALER.name} use estos datos solo para responder a esta solicitud.</span>
            </label>

            {(error || status.state === 'error') && (
              <p className="lead__error" role="alert">
                {error || (status.state === 'error' ? `No se pudo enviar: ${status.message}` : '')}
              </p>
            )}
            <button type="submit" className="btn btn--primary btn--block" disabled={status.state === 'sending'}>
              {status.state === 'sending' ? 'Enviando…' : drive ? 'Solicitar la prueba' : 'Enviar solicitud'}
            </button>
            {leadsMode === 'demo' && <p className="legal">Modo demostración: las solicitudes no salen de este navegador.</p>}
          </form>
        )}
      </div>
    </dialog>
  )
}
