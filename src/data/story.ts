/** Guion de la película: rangos de progreso (0–1) de cada escena y anclajes 3D. */

export interface SceneDef {
  id: number
  name: string
  /** Rango visible del texto dentro de la película. */
  range: [number, number]
  /** Punto de la película al que salta la navegación lateral. */
  anchor: number
}

export const SCENES: SceneDef[] = [
  { id: 1, name: 'Aparición', range: [0, 0.14], anchor: 0.11 },
  { id: 2, name: 'Frontal', range: [0.168, 0.272], anchor: 0.23 },
  { id: 3, name: 'Perfil', range: [0.295, 0.392], anchor: 0.35 },
  { id: 4, name: 'Detalles', range: [0.41, 0.63], anchor: 0.45 },
  { id: 5, name: 'Zaga', range: [0.65, 0.732], anchor: 0.7 },
  { id: 6, name: 'Movimiento', range: [0.748, 0.856], anchor: 0.8 },
  { id: 7, name: 'Tu unidad', range: [0.89, 1], anchor: 1 },
]

export type Vec3 = readonly [number, number, number]

export interface HotspotDef {
  id: string
  range: [number, number]
  point: Vec3
  /** Lado hacia el que se despliega la etiqueta. */
  side: 'left' | 'right'
  label: string
  title: string
  text: string
}

export const HOTSPOTS: HotspotDef[] = [
  {
    id: 'wheel',
    range: [0.43, 0.485],
    point: [0.97, 0.36, -1.155],
    side: 'left',
    label: 'Ruedas y frenos',
    title: 'Llantas de 20″ y discos carbocerámicos',
    text: 'Neumáticos 235/35 ZR20 delante y 295/35 ZR20 detrás, con discos de freno carbocerámicos.',
  },
  {
    id: 'light',
    range: [0.508, 0.555],
    point: [0.72, 0.7, -1.88],
    side: 'left',
    label: 'Óptica',
    title: 'Faros alargados hacia la aleta',
    text: 'El grupo óptico se estira sobre el paso de rueda y dibuja la mirada del coche.',
  },
  {
    id: 'flank',
    range: [0.585, 0.63],
    point: [0.98, 0.7, 0.5],
    side: 'right',
    label: 'Flanco',
    title: 'Diseño de Pininfarina',
    text: 'Detrás de los asientos, los arbotantes guían el aire hacia las tomas del motor y los radiadores de aceite del cambio.',
  },
]

export interface DimensionDef {
  id: string
  from: Vec3
  to: Vec3
  label: string
  /** Dónde se coloca la etiqueta: en el centro de la cota o junto a su extremo final. */
  anchor?: 'mid' | 'end'
}

/** Cotas que se dibujan sobre la vista lateral (escena 3). */
export const DIMENSIONS: DimensionDef[] = [
  { id: 'length', from: [1.35, 0.01, -2.27], to: [1.35, 0.01, 2.26], label: 'Longitud 4.527 mm' },
  { id: 'wheelbase', from: [1.05, 0.36, -1.155], to: [1.05, 0.36, 1.496], label: 'Batalla 2.650 mm' },
  { id: 'height', from: [1.0, 0, 2.45], to: [1.0, 1.23, 2.45], label: 'Altura 1.211 mm', anchor: 'end' },
]

export const DIMENSIONS_RANGE: [number, number] = [0.31, 0.39]

export interface GalleryItem {
  src: string
  title: string
  caption: string
}

export const GALLERY: GalleryItem[] = [
  { src: 'renders/gallery-front.webp', title: 'Frontal', caption: 'Toma frontal con aletas aeroelásticas' },
  { src: 'renders/gallery-profile.webp', title: 'Perfil', caption: 'Techo retraído y motor central' },
  { src: 'renders/gallery-wheel.webp', title: 'Llanta', caption: '20 pulgadas y frenos carbocerámicos' },
  { src: 'renders/gallery-light.webp', title: 'Óptica', caption: 'La mirada del 458' },
  { src: 'renders/gallery-rear.webp', title: 'Zaga', caption: 'Escape triple central' },
  { src: 'renders/gallery-hero.webp', title: 'Tres cuartos', caption: 'Al caer el sol en Poniente' },
]

/** Fotogramas fijos para el modo sin WebGL (uno por escena). */
export const FALLBACK_FRAMES = SCENES.map((s) => `renders/scene-${s.id}.webp`)
