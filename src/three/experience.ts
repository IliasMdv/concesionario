import gsap from 'gsap'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { loadCar, type Car } from './car'
import { BASE_SHOT, SHOT_KEYS, type Shot } from './director'
import type { Quality } from './quality'
import { createBeam, createFloor, createSky, createStreaks, createStudioEnvironment } from './studio'

const WHEEL_RADIUS = 0.35
const REF_ASPECT = 16 / 9
const DEG = Math.PI / 180

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export interface Projected {
  x: number
  y: number
  visible: boolean
}

export class Experience {
  readonly renderer: THREE.WebGLRenderer
  readonly quality: Quality
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(24, 1, 0.05, 200)
  car: Car | null = null
  readonly shot: Shot = { ...BASE_SHOT }
  onContextLost: (() => void) | null = null

  private composer: EffectComposer | null = null
  private bloom: UnrealBloomPass | null = null
  private readonly prev: Shot = { ...BASE_SHOT, az: NaN }
  private readonly canvas: HTMLCanvasElement
  private width = 1
  private height = 1
  private dpr = 1
  private dirty = true
  private readonly target = new THREE.Vector3()
  private readonly tmp = new THREE.Vector3()
  private readonly sky = createSky()
  private readonly floor: ReturnType<typeof createFloor>
  private readonly streaks = createStreaks()
  private readonly topBeam = createBeam(8.2, 3.3, '#dfe7ff', 1)
  private readonly headBeams = [createBeam(11, 2.3, '#fff1dc', 2), createBeam(11, 2.3, '#fff1dc', 3)]
  private readonly keyLight = new THREE.DirectionalLight('#ffffff', 0)
  private readonly rimLight = new THREE.SpotLight('#cfdcff', 0, 40, 0.55, 1, 2)
  private readonly topLight = new THREE.SpotLight('#ffffff', 0, 30, 0.42, 0.9, 2)
  private readonly sunLight = new THREE.DirectionalLight('#ff7a45', 0)
  private envTexture: THREE.Texture | null = null
  private frameTimes: number[] = []
  private lastRenderAt = 0
  private disposed = false
  private readonly resizeObserver: ResizeObserver

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    this.canvas = canvas
    this.quality = quality
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: quality.msaa === 0,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1
    this.renderer.setClearColor('#030306', 1)

    canvas.addEventListener('webglcontextlost', this.handleContextLost)

    this.floor = createFloor(quality.reflection, 512, 512)
    this.scene.add(this.sky.mesh, this.floor.mesh)

    this.keyLight.position.set(2.5, 9, -4)
    this.rimLight.position.set(-2.5, 4.2, 7.5)
    this.rimLight.target.position.set(0, 0.5, 0)
    this.topLight.position.set(0, 8.2, 0)
    this.topLight.target.position.set(0, 0, 0)
    this.scene.add(this.keyLight, this.rimLight, this.rimLight.target, this.topLight, this.topLight.target, this.sunLight)

    if (quality.beams) {
      this.topBeam.mesh.position.set(0, 8.2, 0)
      this.topBeam.mesh.lookAt(0, 0, 0)
      const [left, right] = this.headBeams
      left.mesh.position.set(-0.68, 0.66, -1.98)
      left.mesh.lookAt(-1.25, 0.05, -12)
      right.mesh.position.set(0.68, 0.66, -1.98)
      right.mesh.lookAt(1.25, 0.05, -12)
      this.scene.add(this.topBeam.mesh, left.mesh, right.mesh)
    }
    this.scene.add(this.streaks.mesh)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.resize()
  }

  async load(onProgress: (ratio: number) => void) {
    this.envTexture = createStudioEnvironment(this.renderer)
    this.scene.environment = this.envTexture
    this.scene.environmentIntensity = 0

    this.car = await loadCar(this.renderer, onProgress)
    if (this.disposed) return
    this.scene.add(this.car.root)

    this.setupComposer()
    this.apply(this.shot)
    // Compila los shaders antes de mostrar la escena para evitar tirones en el primer scroll.
    await this.renderer.compileAsync(this.scene, this.camera)
    this.dirty = true
  }

  invalidate() {
    this.dirty = true
  }

  /** Avanza un fotograma. Solo renderiza si el plano ha cambiado. */
  frame(shot: Shot, now: number) {
    if (this.disposed || !this.car) return false
    Object.assign(this.shot, shot)
    let changed = this.dirty
    if (!changed) {
      for (const k of SHOT_KEYS) {
        if (Math.abs(this.shot[k] - this.prev[k]) > 1e-4) {
          changed = true
          break
        }
      }
    }
    if (!changed) {
      this.lastRenderAt = 0
      return false
    }
    Object.assign(this.prev, this.shot)
    this.dirty = false
    this.apply(this.shot)
    this.render()
    this.trackPerformance(now)
    return true
  }

  setPaint(hex: string, metallic: boolean, instant = false) {
    if (!this.car) return
    const paint = this.car.paint
    const color = new THREE.Color(hex)
    const to = { r: color.r, g: color.g, b: color.b, metalness: metallic ? 0.72 : 0.12, roughness: metallic ? 0.36 : 0.3 }
    gsap.killTweensOf(paint.color)
    gsap.killTweensOf(paint)
    if (instant) {
      paint.color.copy(color)
      paint.metalness = to.metalness
      paint.roughness = to.roughness
      this.dirty = true
      return
    }
    const invalidate = () => (this.dirty = true)
    gsap.to(paint.color, { r: to.r, g: to.g, b: to.b, duration: 1.1, ease: 'power2.inOut', onUpdate: invalidate })
    gsap.to(paint, { metalness: to.metalness, roughness: to.roughness, duration: 1.1, ease: 'power2.inOut', onUpdate: invalidate })
  }

  setRims(hex: string, metalness: number, roughness: number) {
    if (!this.car) return
    const rims = this.car.rims
    const color = new THREE.Color(hex)
    gsap.killTweensOf(rims.color)
    gsap.killTweensOf(rims)
    const invalidate = () => (this.dirty = true)
    gsap.to(rims.color, { r: color.r, g: color.g, b: color.b, duration: 0.9, ease: 'power2.inOut', onUpdate: invalidate })
    gsap.to(rims, { metalness, roughness, duration: 0.9, ease: 'power2.inOut', onUpdate: invalidate })
  }

  /** Proyecta un punto 3D a coordenadas CSS del lienzo. */
  project(point: readonly [number, number, number], out: Projected) {
    this.tmp.set(point[0], point[1], point[2]).project(this.camera)
    out.x = (this.tmp.x * 0.5 + 0.5) * this.width
    out.y = (-this.tmp.y * 0.5 + 0.5) * this.height
    out.visible = this.tmp.z < 1 && this.tmp.z > -1
    return out
  }

  /** Renderiza un fotograma fijo a un tamaño dado y devuelve la imagen (herramienta de capturas). */
  renderStill(shot: Shot, width: number, height: number, type = 'image/webp', quality = 0.88) {
    const prev = { w: this.width, h: this.height, dpr: this.dpr }
    this.width = width
    this.height = height
    this.dpr = 1
    this.applySize()
    this.apply(shot)
    this.render()
    const url = this.renderer.domElement.toDataURL(type, quality)
    this.width = prev.w
    this.height = prev.h
    this.dpr = prev.dpr
    this.applySize()
    this.dirty = true
    return url
  }

  dispose() {
    this.disposed = true
    this.resizeObserver.disconnect()
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    this.car?.dispose()
    this.envTexture?.dispose()
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const material = mesh.material as THREE.Material | THREE.Material[]
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material.dispose()
    })
    this.floor.dispose()
    this.composer?.dispose()
    this.bloom?.dispose()
    this.renderer.dispose()
  }

  private handleContextLost = (event: Event) => {
    event.preventDefault()
    this.onContextLost?.()
  }

  private setupComposer() {
    if (!this.quality.bloom) return
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2())
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: this.quality.msaa,
    })
    this.composer = new EffectComposer(this.renderer, target)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.3, 0.45, 3)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.applySize()
  }

  private resize() {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    if (w === this.width && h === this.height && this.dpr > 0) return
    this.width = w
    this.height = h
    // Limita los píxeles totales en pantallas grandes con alta densidad.
    const budget = this.quality.tier === 'high' ? 4.2e6 : 2.2e6
    const ideal = Math.min(window.devicePixelRatio || 1, this.quality.maxDpr)
    this.dpr = Math.max(this.quality.minDpr, Math.min(ideal, Math.sqrt(budget / (w * h))))
    this.applySize()
    this.dirty = true
  }

  private applySize() {
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(this.width, this.height, false)
    if (this.composer) {
      this.composer.setPixelRatio(this.dpr)
      this.composer.setSize(this.width, this.height)
    }
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
    // El reflejo del suelo se renderiza a media resolución.
    this.floor.setSize((this.width * this.dpr) / 2, (this.height * this.dpr) / 2)
  }

  private trackPerformance(now: number) {
    if (this.lastRenderAt > 0) {
      const dt = now - this.lastRenderAt
      if (dt < 250) this.frameTimes.push(dt)
    }
    this.lastRenderAt = now
    if (this.frameTimes.length < 50) return
    const sorted = [...this.frameTimes].sort((a, b) => a - b)
    const median = sorted[sorted.length >> 1]
    this.frameTimes = []
    // Por debajo de ~30 fps sostenidos se reduce la resolución interna.
    if (median > 34 && this.dpr > this.quality.minDpr) {
      this.dpr = Math.max(this.quality.minDpr, this.dpr - 0.25)
      this.applySize()
    }
  }

  private apply(s: Shot) {
    const aspect = this.width / this.height
    const portrait = aspect < 1

    // En pantallas estrechas se abre el objetivo y se aleja la cámara para conservar el encuadre.
    let fov = s.fov
    let r = s.r
    if (aspect < REF_ASPECT) {
      const narrow = clamp01((REF_ASPECT - aspect) / (REF_ASPECT - 0.5))
      const hRef = 2 * Math.atan(Math.tan((s.fov * DEG) / 2) * REF_ASPECT)
      fov = s.fov * lerp(1, 1.5, narrow)
      const hNow = 2 * Math.atan(Math.tan((fov * DEG) / 2) * aspect)
      const ratio = Math.tan(hRef / 2) / Math.tan(hNow / 2)
      r = s.r * lerp(1, ratio, s.fit)
    }

    this.target.set(s.tx, s.ty, s.tz)
    const cosEl = Math.cos(s.el)
    this.camera.position.set(
      s.tx + r * Math.sin(s.az) * cosEl,
      Math.max(0.14, s.ty + r * Math.sin(s.el)),
      s.tz + r * Math.cos(s.az) * cosEl,
    )
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(this.target)
    if (s.roll !== 0) this.camera.rotateZ(s.roll)
    this.camera.fov = fov

    const sx = portrait ? s.msx : s.sx
    const sy = portrait ? s.msy : s.sy
    if (sx !== 0 || sy !== 0) {
      this.camera.setViewOffset(this.width, this.height, -sx * this.width, sy * this.height, this.width, this.height)
    } else {
      this.camera.clearViewOffset()
    }
    this.camera.updateProjectionMatrix()

    this.scene.environmentIntensity = s.env
    this.scene.environmentRotation.set(0, s.envRot, 0)
    this.renderer.toneMappingExposure = s.exposure

    this.keyLight.intensity = s.key * 1.4
    this.rimLight.intensity = s.rim * 55
    this.topLight.intensity = s.top * 70

    // El «sol» queda siempre detrás del coche respecto a la cámara.
    const sunX = -Math.sin(s.az)
    const sunZ = -Math.cos(s.az)
    this.sky.material.uniforms.uSunDir.value.set(sunX, 0, sunZ)
    this.sky.material.uniforms.uSunset.value = s.sunset
    this.sky.material.uniforms.uRim.value = s.rim
    this.sunLight.position.set(sunX * 20, 2.2, sunZ * 20)
    this.sunLight.intensity = s.sunset * 2.6

    const floor = this.floor.material.uniforms
    floor.uKey.value = s.key
    floor.uTop.value = s.top
    floor.uHead.value = s.head
    floor.uTail.value = s.tail
    floor.uDrive.value = s.drive
    floor.uSpeed.value = s.speed
    floor.uSunset.value = s.sunset

    if (this.quality.beams) {
      this.topBeam.material.uniforms.uIntensity.value = s.top
      const beam = s.head * (1 - 0.85 * s.sunset)
      this.headBeams.forEach((b) => (b.material.uniforms.uIntensity.value = beam))
    }
    this.streaks.material.opacity = s.speed
    this.streaks.mesh.visible = s.speed > 0.001
    if (this.streaks.mesh.visible) this.streaks.update(s.drive)

    if (this.bloom) this.bloom.strength = s.bloom * 0.5

    const car = this.car
    if (car) {
      car.head.emissiveIntensity = s.head * 4
      car.headGlass.emissiveIntensity = s.head * 0.22
      car.tail.emissiveIntensity = 0.4 + s.tail * 9
      const spin = -Math.PI / 2 - s.drive / WHEEL_RADIUS
      car.wheels.forEach((w) => (w.rotation.x = spin))
    }
  }

  private render() {
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }
}
