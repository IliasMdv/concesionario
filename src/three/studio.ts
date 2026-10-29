import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'

/**
 * Plató fotográfico procedural: entorno HDR de softboxes, suelo con
 * charcos de luz, cielo de poniente y haces volumétricos simulados.
 * Todo se genera en código, sin texturas externas.
 */

const BG_TOP = new THREE.Color('#020205')
const BG_HORIZON = new THREE.Color('#09080f')
const BG_BOTTOM = new THREE.Color('#030306')

/** Entorno de estudio: sala oscura con softboxes emisivos, filtrado con PMREM. */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const env = new THREE.Scene()
  const disposables: { dispose(): void }[] = []

  const room = new THREE.Mesh(
    new THREE.BoxGeometry(40, 18, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.012, 0.012, 0.016), side: THREE.BackSide }),
  )
  room.position.y = 8
  env.add(room)
  disposables.push(room.geometry, room.material)

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.004, 0.004, 0.006) }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.95
  env.add(floor)
  disposables.push(floor.geometry, floor.material)

  const panel = (
    w: number,
    h: number,
    color: THREE.ColorRepresentation,
    intensity: number,
    position: [number, number, number],
    lookAt: [number, number, number],
  ) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material)
    mesh.position.set(...position)
    mesh.lookAt(...lookAt)
    env.add(mesh)
    disposables.push(mesh.geometry, material)
  }

  // Softbox cenital: el brillo principal sobre capó y techo.
  panel(9, 3.2, '#f4f6ff', 5, [0, 10, 0], [0, 0, 0])
  // Tiras laterales largas: las líneas de luz que recorren los flancos.
  panel(16, 0.55, '#ffffff', 6, [10, 2.4, 0], [0, 2.4, 0])
  panel(16, 0.55, '#ffffff', 6, [-10, 2.4, 0], [0, 2.4, 0])
  panel(16, 0.25, '#dfe6ff', 4, [10, 5.2, 0], [0, 4, 0])
  panel(16, 0.25, '#dfe6ff', 4, [-10, 5.2, 0], [0, 4, 0])
  // Contraluces verticales delante y detrás.
  panel(1.1, 6, '#ffffff', 4, [0, 3, -14], [0, 3, 0])
  panel(1.1, 6, '#ffffff', 4, [0, 3, 14], [0, 3, 0])
  // Panel cálido bajo: el «poniente» reflejado en la parte baja de la carrocería.
  panel(18, 1.4, '#ff6a3d', 2.2, [9, 0.6, 12], [0, 0.6, 0])
  panel(6, 6, '#7a5cff', 0.6, [-12, 6, -8], [0, 2, 0])

  const pmrem = new THREE.PMREMGenerator(renderer)
  const target = pmrem.fromScene(env, 0.035)
  pmrem.dispose()
  disposables.forEach((d) => d.dispose())
  return target.texture
}

const floorVertex = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec3 vWorld;
  varying vec4 vReflUv;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vReflUv = textureMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const floorFragment = /* glsl */ `
  uniform vec3 uBase;
  uniform float uKey;
  uniform float uTop;
  uniform float uHead;
  uniform float uTail;
  uniform float uDrive;
  uniform float uSpeed;
  uniform float uSunset;
  uniform float uReflect;
  uniform vec3 uSunColor;
  uniform sampler2D tDiffuse;
  varying vec3 vWorld;
  varying vec4 vReflUv;

  float headPool(vec2 p, float side) {
    vec2 h = p - vec2(side * 0.72, -2.1);
    float along = -h.y;
    if (along < 0.0) return 0.0;
    float spread = 0.32 + along * 0.2;
    float lat = h.x / spread;
    return exp(-lat * lat * 1.6) * smoothstep(0.0, 1.2, along) * exp(-along * 0.28);
  }

  void main() {
    vec2 p = vWorld.xz;
    float r = length(p);
    float d = length(p * vec2(1.0, 0.6));
    vec3 col = uBase;

    // Charco de luz bajo el foco cenital y el principal.
    col += vec3(0.85, 0.88, 1.0) * (uKey * 0.035 + uTop * 0.1) * exp(-d * d * 0.16);
    // Haces de los faros proyectados en el suelo.
    col += vec3(1.0, 0.94, 0.84) * uHead * (0.16 - 0.11 * uSunset) * (headPool(p, -1.0) + headPool(p, 1.0));
    // Resplandor rojo de los pilotos.
    vec2 t = p - vec2(0.0, 2.6);
    col += vec3(1.0, 0.08, 0.05) * uTail * 0.1 * exp(-dot(t * vec2(0.7, 1.4), t * vec2(0.7, 1.4)));

    // Retícula técnica muy tenue del plató.
    vec2 gp = p * 0.5;
    vec2 g = abs(fract(gp - 0.5) - 0.5) / fwidth(gp);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    col += vec3(0.55, 0.6, 0.78) * line * 0.018 * exp(-r * 0.09) * (1.0 - uSpeed);

    // Líneas de velocidad: el suelo «corre» bajo el coche.
    float aa = fwidth(p.y) * 0.16 + 0.002;
    float lane = abs(abs(p.x) - 2.4);
    float laneAA = fwidth(p.x) + 0.01;
    float t1 = fract((p.y + uDrive) * 0.16);
    float dash = smoothstep(0.35, 0.35 + 0.15 + aa, t1) * smoothstep(0.95, 0.8 - aa, t1);
    col += uSpeed * dash * smoothstep(0.07 + laneAA, 0.0, lane) * vec3(1.0, 0.86, 0.72) * 0.8 * exp(-abs(p.y) * 0.07);
    float lane2 = abs(abs(p.x) - 5.2);
    float t2 = fract((p.y + uDrive) * 0.09 + 0.3);
    float dash2 = smoothstep(0.6 - aa, 0.6 + aa, t2) * smoothstep(1.0, 0.96 - aa, t2);
    col += uSpeed * dash2 * smoothstep(0.05 + laneAA, 0.0, lane2) * vec3(0.7, 0.75, 1.0) * 0.4 * exp(-abs(p.y) * 0.06);

    // El horizonte cálido tiñe el suelo lejano.
    col += uSunColor * uSunset * 0.05 * smoothstep(6.0, 22.0, r);

    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);

    #ifdef REFLECT
      // Reflejo plano real, desenfocado como un suelo pulido (más nítido junto al coche).
      vec2 ruv = vReflUv.xy / vReflUv.w;
      // Desenfoque por mipmaps: nítido en el contacto, más difuso al alejarse.
      float lod = 0.6 + 2.6 * smoothstep(0.4, 8.0, r);
      vec2 px = vec2(0.0012, 0.0021) * (0.5 + lod);
      vec3 refl = texture2D(tDiffuse, ruv, lod).rgb * 0.36;
      refl += texture2D(tDiffuse, ruv + vec2(px.x, 0.0), lod).rgb * 0.16;
      refl += texture2D(tDiffuse, ruv - vec2(px.x, 0.0), lod).rgb * 0.16;
      refl += texture2D(tDiffuse, ruv + vec2(0.0, px.y), lod).rgb * 0.16;
      refl += texture2D(tDiffuse, ruv - vec2(0.0, px.y), lod).rgb * 0.16;
      col += refl * mix(0.14, 0.4, fres) * (1.0 - smoothstep(6.0, 20.0, r)) * uReflect;
    #endif

    // El suelo se desvanece en el fondo para no marcar un borde.
    float alpha = 1.0 - smoothstep(10.0, 30.0, r);

    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export type FloorMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uBase: { value: THREE.Color }
    uKey: { value: number }
    uTop: { value: number }
    uHead: { value: number }
    uTail: { value: number }
    uDrive: { value: number }
    uSpeed: { value: number }
    uSunset: { value: number }
    uReflect: { value: number }
    uSunColor: { value: THREE.Color }
  }
}

export function createFloor(reflective: boolean, width: number, height: number) {
  const shader = {
    name: 'PonienteFloor',
    vertexShader: floorVertex,
    fragmentShader: floorFragment,
    uniforms: {
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: new THREE.Matrix4() },
      uBase: { value: new THREE.Color('#050508') },
      uKey: { value: 0 },
      uTop: { value: 0 },
      uHead: { value: 0 },
      uTail: { value: 0 },
      uDrive: { value: 0 },
      uSpeed: { value: 0 },
      uSunset: { value: 0 },
      uReflect: { value: reflective ? 1 : 0 },
      uSunColor: { value: new THREE.Color('#ff6a3d') },
    },
  }
  const geometry = new THREE.CircleGeometry(32, 96)
  let mesh: THREE.Mesh
  let reflector: Reflector | null = null
  if (reflective) {
    // El Reflector renderiza la escena desde una cámara reflejada (con los bajos del coche en sombra, como en la realidad).
    reflector = new Reflector(geometry, { shader, textureWidth: width, textureHeight: height, clipBias: 0.003, multisample: 0 })
    const texture = reflector.getRenderTarget().texture
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    ;(reflector.material as THREE.ShaderMaterial).defines = { REFLECT: '' }
    mesh = reflector
  } else {
    mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        name: shader.name,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        uniforms: THREE.UniformsUtils.clone(shader.uniforms),
      }),
    )
  }
  const material = mesh.material as FloorMaterial
  material.transparent = true
  material.depthWrite = false
  mesh.rotation.x = -Math.PI / 2
  mesh.renderOrder = 1
  return {
    mesh,
    material,
    setSize(w: number, h: number) {
      reflector?.getRenderTarget().setSize(Math.max(2, Math.round(w)), Math.max(2, Math.round(h)))
    },
    dispose() {
      reflector?.dispose()
    },
  }
}

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
    vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = pos.xyww;
  }
`

const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uSun1;
  uniform vec3 uSun2;
  uniform vec3 uDusk;
  uniform vec3 uSunDir;
  uniform float uSunset;
  uniform float uRim;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.55, h));
    col = mix(col, uBottom, smoothstep(0.0, -0.35, h));

    vec2 flat2 = normalize(dir.xz + 1e-5);
    float facing = max(dot(flat2, normalize(uSunDir.xz)), 0.0);
    float glow = pow(facing, 2.2);
    float band = exp(-pow((h - 0.008) / 0.038, 2.0));
    float high = exp(-pow((h - 0.1) / 0.14, 2.0));
    vec3 sun = mix(uSun1, uSun2, smoothstep(-0.02, 0.12, h));
    col += sun * band * (0.08 + 0.92 * glow) * uSunset * 0.62;
    col += uDusk * high * glow * uSunset * 0.12;
    // Línea de horizonte nítida, como el borde del sol ya puesto.
    col += uSun2 * exp(-pow(h / 0.005, 2.0)) * glow * uSunset * 0.5;
    // Halo frío detrás del coche al recortar la silueta.
    col += vec3(0.5, 0.56, 0.75) * uRim * 0.05 * band;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export type SkyMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uSunset: { value: number }
    uRim: { value: number }
    uSunDir: { value: THREE.Vector3 }
  }
}

export function createSky() {
  const material = new THREE.ShaderMaterial({
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: BG_TOP.clone() },
      uHorizon: { value: BG_HORIZON.clone() },
      uBottom: { value: BG_BOTTOM.clone() },
      uSun1: { value: new THREE.Color('#9a1c2c') },
      uSun2: { value: new THREE.Color('#ff6a2e') },
      uDusk: { value: new THREE.Color('#3b2c94') },
      uSunDir: { value: new THREE.Vector3(0.6, 0, 0.8) },
      uSunset: { value: 0 },
      uRim: { value: 0 },
    },
  }) as SkyMaterial
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), material)
  mesh.renderOrder = -1
  mesh.frustumCulled = false
  return { mesh, material }
}

const beamVertex = /* glsl */ `
  uniform float uLength;
  varying float vAlong;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec2 vUv;
  void main() {
    vAlong = position.z / uLength;
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uSeed;
  varying float vAlong;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1)) + uSeed) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec3 V = normalize(cameraPosition - vPosW);
    float edge = pow(abs(dot(normalize(vNormalW), V)), 2.4);
    float falloff = smoothstep(0.0, 0.06, vAlong) * pow(1.0 - clamp(vAlong, 0.0, 1.0), 1.5);
    float dust = 0.75 + 0.25 * noise(vec2(vUv.x * 18.0, vAlong * 6.0));
    float a = uIntensity * edge * falloff * dust * 0.085;
    gl_FragColor = vec4(uColor, a);
  }
`

/** Cono de luz volumétrica simulada: vértice en el origen, se abre hacia +Z. */
export function createBeam(length: number, radius: number, color: THREE.ColorRepresentation, seed = 0) {
  const geometry = new THREE.ConeGeometry(radius, length, 64, 1, true)
  geometry.translate(0, -length / 2, 0)
  geometry.rotateX(-Math.PI / 2)
  const material = new THREE.ShaderMaterial({
    vertexShader: beamVertex,
    fragmentShader: beamFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: 0 },
      uLength: { value: length },
      uSeed: { value: seed },
    },
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = 3
  mesh.frustumCulled = false
  return { mesh, material }
}

/** Barras de luz que pasan junto al coche en la escena dinámica (efecto túnel). */
export function createStreaks(count = 20) {
  const geometry = new THREE.BoxGeometry(0.06, 0.06, 3.2)
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffd9b0').multiplyScalar(3.2),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.frustumCulled = false
  mesh.renderOrder = 4
  const dummy = new THREE.Object3D()
  const spacing = 7
  const span = (count / 4) * spacing
  const lanes: [number, number][] = [
    [-4.2, 2.8],
    [4.2, 2.8],
    [-6.5, 0.9],
    [6.5, 0.9],
  ]
  const update = (drive: number) => {
    for (let i = 0; i < count; i++) {
      const [x, y] = lanes[i % 4]
      const slot = Math.floor(i / 4)
      const z = ((((slot * spacing + drive * 1.0 + (i % 4) * 2.3) % span) + span) % span) - span / 2
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }
  update(0)
  return { mesh, material, update }
}
