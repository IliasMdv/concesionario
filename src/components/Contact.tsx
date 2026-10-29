import { useRef } from 'react'
import { DEALER } from '../data/car'
import { useReveal } from '../lib/reveal'
import { useStore } from '../lib/store'

export function Contact() {
  const { openLead } = useStore()
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  return (
    <section id="contacto" className="section section--contact" data-shot="contacto" ref={root}>
      <p className="kicker" data-reveal>
        10 — Visítanos
      </p>
      <h2 className="contact__title" data-reveal>
        Ven a verlo
        <br />
        <em>al caer el sol.</em>
      </h2>
      <div className="contact__grid">
        <button type="button" className="contact__card" data-reveal onClick={() => openLead('drive')}>
          <span className="kicker">Prueba de conducción</span>
          <b>Reserva 45 minutos al volante con un asesor.</b>
          <span className="link-arrow">Elegir fecha</span>
        </button>
        <button type="button" className="contact__card" data-reveal onClick={() => openLead('info')}>
          <span className="kicker">Información</span>
          <b>Historial, documentación y financiación de cada unidad.</b>
          <span className="link-arrow">Escribirnos</span>
        </button>
        <dl className="contact__data" data-reveal>
          <div>
            <dt>Exposición</dt>
            <dd>{DEALER.city}</dd>
          </div>
          <div>
            <dt>Horario</dt>
            <dd>{DEALER.hours}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>
              <a href={`tel:${DEALER.phone.replace(/\s/g, '')}`}>{DEALER.phone}</a>
            </dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>
              <a href={`mailto:${DEALER.email}`}>{DEALER.email}</a>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="footer__brand">
        <span className="brand__mark" aria-hidden="true" />
        <div>
          <p className="footer__name">{DEALER.name}</p>
          <p>{DEALER.claim}</p>
        </div>
      </div>
      <nav className="footer__nav" aria-label="Pie de página">
        <a href="#tecnologia">Tecnología</a>
        <a href="#galeria">Galería</a>
        <a href="#ficha">Ficha técnica</a>
        <a href="#configurador">Configurar</a>
        <a href="#contacto">Contacto</a>
      </nav>
      <div className="footer__legal">
        <p>
          © {year} {DEALER.name} · Concesionario ficticio creado como proyecto de demostración. Precios, unidades, datos de contacto y
          condiciones comerciales son ilustrativos.
        </p>
        <p>
          Ferrari, 458 Italia y 458 Spider son marcas registradas de Ferrari S.p.A. Este sitio no está afiliado ni respaldado por Ferrari.
        </p>
        <p>
          Modelo 3D «Ferrari 458 Italia» de vicent091036 (licencia{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
          ), distribuido con los{' '}
          <a href="https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf" target="_blank" rel="noreferrer">
            ejemplos de three.js
          </a>
          ; representa la versión Spider con el techo retraído. Materiales, iluminación y escena creados para esta web.
        </p>
      </div>
    </footer>
  )
}
