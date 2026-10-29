/**
 * Datos del vehículo.
 *
 * Las especificaciones técnicas son las publicadas por Ferrari para el 458 Spider
 * (2011–2015) en su ficha de lanzamiento (Salón de Frankfurt 2011), contrastadas
 * con Wikipedia («Ferrari 458») y cars-data.com. Las unidades en stock, precios,
 * kilometrajes, extras y condiciones de financiación son DATOS DE DEMOSTRACIÓN.
 */

export const CAR = {
  brand: 'Ferrari',
  model: '458 Spider',
  years: '2011 – 2015',
} as const

export const DEALER = {
  name: 'Poniente',
  claim: 'Automóviles de colección',
  city: 'Algeciras · Cádiz',
  phone: '+34 956 000 000',
  email: 'hola@poniente-motor.example',
  hours: 'Lun – Vie 10:00 – 20:00 · Sáb 10:00 – 14:00',
} as const

export interface SpecRow {
  label: string
  value: string
}

export interface SpecGroup {
  title: string
  rows: SpecRow[]
}

export const SPEC_GROUPS: SpecGroup[] = [
  {
    title: 'Motor',
    rows: [
      { label: 'Arquitectura', value: 'V8 a 90° atmosférico, central-trasero' },
      { label: 'Cilindrada', value: '4.499 cm³' },
      { label: 'Diámetro × carrera', value: '94 × 81 mm' },
      { label: 'Relación de compresión', value: '12,5 : 1' },
      { label: 'Potencia máxima', value: '570 CV (419 kW) a 9.000 rpm' },
      { label: 'Par máximo', value: '540 Nm a 6.000 rpm' },
      { label: 'Potencia específica', value: '127 CV/litro' },
      { label: 'Alimentación', value: 'Inyección directa' },
    ],
  },
  {
    title: 'Transmisión',
    rows: [
      { label: 'Cambio', value: 'F1 de doble embrague, 7 velocidades' },
      { label: 'Tracción', value: 'Trasera' },
      { label: 'Control dinámico', value: 'E-Diff3 + F1-Trac' },
    ],
  },
  {
    title: 'Prestaciones',
    rows: [
      { label: '0 – 100 km/h', value: 'Menos de 3,4 s' },
      { label: 'Velocidad máxima', value: '320 km/h' },
      { label: 'Relación peso/potencia', value: '2,51 kg/CV' },
    ],
  },
  {
    title: 'Chasis',
    rows: [
      { label: 'Suspensión', value: 'Amortiguadores magnetorreológicos adaptativos' },
      { label: 'Frenos', value: 'Discos carbocerámicos, ABS de altas prestaciones' },
      { label: 'Neumáticos', value: '235/35 ZR20 del. · 295/35 ZR20 tras.' },
      { label: 'Techo', value: 'Rígido retráctil de aluminio · 14 s' },
    ],
  },
  {
    title: 'Dimensiones y peso',
    rows: [
      { label: 'Longitud', value: '4.527 mm' },
      { label: 'Anchura', value: '1.937 mm' },
      { label: 'Altura', value: '1.211 mm' },
      { label: 'Batalla', value: '2.650 mm' },
      { label: 'Vías del. / tras.', value: '1.672 / 1.606 mm' },
      { label: 'Peso en seco', value: '1.430 kg*' },
      { label: 'Reparto de pesos', value: '42 % del. / 58 % tras.' },
    ],
  },
  {
    title: 'Consumo (ciclo combinado)',
    rows: [
      { label: 'Consumo', value: '11,8 l/100 km' },
      { label: 'Emisiones de CO₂', value: '275 g/km' },
    ],
  },
]

export const SOURCES = [
  {
    label: 'Ficha de lanzamiento de Ferrari (vía JustCars)',
    href: 'https://www.justcars.com.au/news-and-reviews/ferrari-458-spider-revealed/10011',
  },
  { label: 'Wikipedia — Ferrari 458', href: 'https://en.wikipedia.org/wiki/Ferrari_458' },
  { label: 'cars-data.com — 458 Spider', href: 'https://cars-data.com/en/ferrari/458/2011/spider--63115/specs' },
]

export type Finish = 'solid' | 'metallic'

export interface Unit {
  id: string
  paint: string
  hex: string
  finish: Finish
  year: number
  km: number
  price: number
  note: string
}

/** Unidades en exposición (datos de demostración). */
export const UNITS: Unit[] = [
  {
    id: 'rosso',
    paint: 'Rosso Corsa',
    hex: '#a3070c',
    finish: 'solid',
    year: 2013,
    km: 21400,
    price: 189900,
    note: 'Libro de mantenimiento completo',
  },
  {
    id: 'giallo',
    paint: 'Giallo Modena',
    hex: '#f2b705',
    finish: 'solid',
    year: 2012,
    km: 33800,
    price: 172500,
    note: 'Interior en piel negra',
  },
  {
    id: 'nero',
    paint: 'Nero Daytona',
    hex: '#0c0d10',
    finish: 'metallic',
    year: 2014,
    km: 14200,
    price: 204900,
    note: 'Deflector de viento eléctrico revisado',
  },
  {
    id: 'bianco',
    paint: 'Bianco Avus',
    hex: '#e9e8e3',
    finish: 'solid',
    year: 2012,
    km: 27600,
    price: 179900,
    note: 'Pinzas de freno en negro',
  },
  {
    id: 'grigio',
    paint: 'Grigio Silverstone',
    hex: '#5b5f63',
    finish: 'metallic',
    year: 2014,
    km: 11900,
    price: 199500,
    note: 'Un único propietario',
  },
]

export interface RimOption {
  id: string
  label: string
  hex: string
  metalness: number
  roughness: number
  price: number
}

export const RIMS: RimOption[] = [
  { id: 'silver', label: 'Plata original', hex: '#c9ccd1', metalness: 1, roughness: 0.22, price: 0 },
  { id: 'graphite', label: 'Grafito', hex: '#3b3e44', metalness: 1, roughness: 0.3, price: 1800 },
  { id: 'black', label: 'Negro brillo', hex: '#0d0d0f', metalness: 0.6, roughness: 0.12, price: 1800 },
]

export interface Extra {
  id: string
  label: string
  detail: string
  price: number
}

export const EXTRAS: Extra[] = [
  { id: 'warranty', label: 'Garantía Poniente 24 meses', detail: 'Motor, cambio y electrónica', price: 4900 },
  { id: 'ppf', label: 'Lámina de protección PPF', detail: 'Frontal completo, capó y retrovisores', price: 2950 },
  { id: 'ceramic', label: 'Tratamiento cerámico', detail: 'Pintura, llantas y cristales', price: 1200 },
  { id: 'service', label: 'Mantenimiento prepagado', detail: 'Dos revisiones anuales en taller oficial', price: 3400 },
  { id: 'delivery', label: 'Entrega en camión cerrado', detail: 'Península y Baleares', price: 950 },
]

/** Financiación orientativa (demostración): TIN fijo y plazos disponibles. */
export const FINANCE = {
  tin: 6.99,
  terms: [24, 36, 48, 60],
  minDown: 10,
  maxDown: 50,
}

export const fromPrice = Math.min(...UNITS.map((u) => u.price))
