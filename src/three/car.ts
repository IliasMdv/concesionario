import * as THREE from 'three'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/**
 * Carga del modelo «Ferrari 458 Italia» (vicent091036, CC BY 4.0, distribuido
 * con los ejemplos de three.js) y sustitución de sus materiales básicos por
 * materiales PBR de presentación: pintura con barniz, cristal, cromados,
 * carbono, neumáticos y ópticas emisivas.
 */

const BASE = import.meta.env.BASE_URL

export interface Car {
  root: THREE.Group
  wheels: THREE.Object3D[]
  paint: THREE.MeshPhysicalMaterial
  rims: THREE.MeshStandardMaterial
  head: THREE.MeshStandardMaterial
  headGlass: THREE.MeshPhysicalMaterial
  tail: THREE.MeshStandardMaterial
  shadow: THREE.Mesh
  dispose(): void
}

export async function loadCar(
  renderer: THREE.WebGLRenderer,
  onProgress: (ratio: number) => void,
): Promise<Car> {
  const draco = new DRACOLoader().setDecoderPath(`${BASE}draco/`)
  const loader = new GLTFLoader().setDRACOLoader(draco)

  const [gltf, ao] = await Promise.all([
    loader.loadAsync(`${BASE}models/ferrari.glb`, (e) => {
      // El servidor puede no enviar Content-Length; el tamaño del archivo es conocido.
      const total = e.lengthComputable && e.total > 0 ? e.total : 1_681_572
      onProgress(Math.min(e.loaded / total, 1))
    }),
    new THREE.TextureLoader().loadAsync(`${BASE}models/ferrari_ao.png`),
  ])
  draco.dispose()

  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())

  const paint = new THREE.MeshPhysicalMaterial({
    color: '#a3070c',
    metalness: 0.15,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.025,
    envMapIntensity: 1,
  })
  const rims = new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 1, roughness: 0.22 })
  const chrome = new THREE.MeshStandardMaterial({ color: '#e8e8ea', metalness: 1, roughness: 0.06 })
  const metal = new THREE.MeshStandardMaterial({ color: '#8a8c90', metalness: 0.95, roughness: 0.3 })
  const brake = new THREE.MeshStandardMaterial({ color: '#2a2b2e', metalness: 0.7, roughness: 0.45 })
  const tire = new THREE.MeshStandardMaterial({ color: '#0b0b0c', metalness: 0, roughness: 0.88 })
  const blackPlastic = new THREE.MeshStandardMaterial({ color: '#0a0a0b', metalness: 0.1, roughness: 0.55 })
  const carbon = new THREE.MeshPhysicalMaterial({
    color: '#16171a',
    metalness: 0.4,
    roughness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  })
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#0d0f12',
    metalness: 0,
    roughness: 0.02,
    transparent: true,
    opacity: 0.42,
    clearcoat: 1,
    clearcoatRoughness: 0,
    envMapIntensity: 1.6,
    depthWrite: false,
  })
  const headGlass = new THREE.MeshPhysicalMaterial({
    color: '#cfd6e0',
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.55,
    clearcoat: 1,
    emissive: new THREE.Color('#e9f1ff'),
    emissiveIntensity: 0,
    depthWrite: false,
  })
  const head = new THREE.MeshStandardMaterial({
    color: '#fff3e6',
    metalness: 0,
    roughness: 0.3,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0,
  })
  const tail = new THREE.MeshStandardMaterial({
    color: '#5a0000',
    metalness: 0.1,
    roughness: 0.2,
    emissive: new THREE.Color('#ff2a10'),
    emissiveIntensity: 0,
  })
  const leather = new THREE.MeshStandardMaterial({ color: '#1b1b1e', metalness: 0, roughness: 0.62 })
  const leatherRed = new THREE.MeshStandardMaterial({ color: '#5c1414', metalness: 0, roughness: 0.6 })
  const interior = new THREE.MeshStandardMaterial({ color: '#121214', metalness: 0.05, roughness: 0.75 })
  const owned = [paint, rims, chrome, metal, brake, tire, blackPlastic, carbon, glass, headGlass, head, tail, leather, leatherRed, interior]

  const wheels: THREE.Object3D[] = []
  const root = new THREE.Group()
  root.name = 'car'
  const model = gltf.scene
  root.add(model)

  model.traverse((obj) => {
    if (/^wheel_(fl|fr|rl|rr)$/.test(obj.name)) wheels.push(obj)
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const original = mesh.material as THREE.MeshStandardMaterial
    const matName = original.name
    // GLTFLoader añade sufijos _1, _2… a los nombres repetidos (tire, wheel, brake…).
    const name = mesh.name.replace(/_\d+$/, '')

    let next: THREE.Material | null = null
    if (name === 'body') next = paint
    else if (name.startsWith('rim_') || name === 'wheel') next = rims
    else if (name === 'glass') next = glass
    else if (name === 'chrome') next = chrome
    else if (name === 'lights') next = headGlass
    else if (name === 'leds') next = head
    else if (name === 'brakes' || name === 'lights_red' || name === 'steering_red_lights') next = tail
    else if (name === 'brake') next = brake
    else if (name === 'tire' || name === 'grills' || name === 'wipers') next = matName === 'Tires' && name === 'tire' ? tire : blackPlastic
    else if (matName === 'Carbon_Fiber') next = carbon
    else if (matName === 'metal_gray') next = metal
    else if (matName === 'Leather') next = leather
    else if (matName === 'Leather_red') next = name === 'trim' ? chrome : leatherRed
    else if (matName === 'Interior_dark' || matName === 'Interior_light' || matName === 'plastic_gray' || matName === 'Carpet') next = interior

    if (next) {
      original.dispose()
      mesh.material = next
    } else if (original.isMeshStandardMaterial) {
      original.roughness = 0.5
      original.metalness = 0.1
    }
    // Las texturas no existen en este modelo, pero se mantiene por si se cambia.
    const map = (mesh.material as THREE.MeshStandardMaterial).map
    if (map) map.anisotropy = maxAniso
  })

  // Sombra de oclusión ambiental horneada bajo el coche (textura incluida con el modelo).
  ao.colorSpace = THREE.SRGBColorSpace
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: ao,
    blending: THREE.MultiplyBlending,
    toneMapped: false,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
  })
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4), shadowMaterial)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.002
  shadow.renderOrder = 2
  root.add(shadow)

  return {
    root,
    wheels,
    paint,
    rims,
    head,
    headGlass,
    tail,
    shadow,
    dispose() {
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) mesh.geometry.dispose()
      })
      owned.forEach((m) => m.dispose())
      shadowMaterial.dispose()
      ao.dispose()
    },
  }
}
