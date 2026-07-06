<script setup lang="ts">
import type { Group, LineSegments, PerspectiveCamera, Points, Scene, Sprite, Texture, WebGLRenderer } from 'three'

/**
 * Fondo 3D del hero: red neuronal de "mensajes" (Three.js).
 *
 * Nodos = chats de clientes (orbes suaves índigo/verde/cielo) conectados por
 * líneas tenues a sus vecinos y a un hub central (Kaibot, glow verde).
 * Varios pulsos de luz viajan por las conexiones a la vez: índigo hacia el
 * hub (mensajes que llegan) y verde hacia afuera (respuestas saliendo) —
 * la metáfora de responder muchos chats simultáneamente.
 *
 * - `three` se importa dinámicamente en onMounted para no bloquear el primer
 *   paint de la landing (el chunk se descarga después del contenido).
 * - Con prefers-reduced-motion se renderiza un único frame estático sin pulsos.
 * - El rAF se pausa cuando la pestaña está oculta o el canvas sale del
 *   viewport, y todo (geometrías, materiales, textura, renderer, listeners)
 *   se libera en unmount para no filtrar WebGL contexts dentro de la SPA.
 */

const container = ref<HTMLDivElement | null>(null)

const NODE_COUNT = 54 // índice 0 = hub central
const PULSE_COUNT = 12

let renderer: WebGLRenderer | null = null
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let group: Group | null = null
let nodes: Points | null = null
let lines: LineSegments | null = null
let hub: Sprite | null = null
let glowTexture: Texture | null = null

interface Pulse {
  sprite: Sprite
  edge: number
  dir: 1 | -1
  t: number
  speed: number
}
let pulses: Pulse[] = []
let edges: Array<[number, number]> = []
let basePos: Float32Array
let driftPhase: Float32Array

let rafId = 0
let running = false
let reducedMotion = false
let elapsed = 0
let lastTime = 0

let mouseX = 0
let mouseY = 0
let targetX = 0
let targetY = 0

let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null

const onPointerMove = (e: PointerEvent) => {
  targetX = (e.clientX / window.innerWidth) * 2 - 1
  targetY = (e.clientY / window.innerHeight) * 2 - 1
}

const onVisibility = () => {
  if (document.hidden) stopLoop()
  else startLoop()
}

function startLoop() {
  if (running || reducedMotion || !renderer) return
  running = true
  lastTime = 0
  rafId = requestAnimationFrame(tick)
}

function stopLoop() {
  running = false
  cancelAnimationFrame(rafId)
}

// Orbe suave: gradiente radial blanco→transparente que PointsMaterial /
// SpriteMaterial multiplican por el color — evita los puntos cuadrados.
function makeGlowTexture(THREE: typeof import('three')): Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

const PULSE_GREEN = '#1fad52'
const PULSE_INDIGO = '#6366f1'

// Reasigna un pulso a una arista nueva. En aristas del hub la dirección
// define el color: índigo entrando (mensaje) / verde saliendo (respuesta).
function resetPulse(p: Pulse) {
  p.edge = Math.floor(Math.random() * edges.length)
  p.dir = Math.random() < 0.5 ? 1 : -1
  p.t = 0
  p.speed = 0.45 + Math.random() * 0.5

  const [a, b] = edges[p.edge]!
  const mat = p.sprite.material
  if (a === 0 || b === 0) {
    const towardHub = (a === 0 && p.dir === -1) || (b === 0 && p.dir === 1)
    mat.color.set(towardHub ? PULSE_INDIGO : PULSE_GREEN)
  }
  else {
    mat.color.set(Math.random() < 0.55 ? PULSE_GREEN : PULSE_INDIGO)
  }
}

function currentNodePosition(i: number, out: { x: number, y: number, z: number }) {
  const amp = i === 0 ? 0 : 0.14
  out.x = basePos[i * 3]! + Math.sin(elapsed * 0.5 + driftPhase[i * 3]!) * amp
  out.y = basePos[i * 3 + 1]! + Math.sin(elapsed * 0.6 + driftPhase[i * 3 + 1]!) * amp
  out.z = basePos[i * 3 + 2]! + Math.sin(elapsed * 0.4 + driftPhase[i * 3 + 2]!) * amp
}

const posA = { x: 0, y: 0, z: 0 }
const posB = { x: 0, y: 0, z: 0 }

function tick(time: number) {
  if (!running || !renderer || !scene || !camera || !group || !nodes || !lines) return
  const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016
  lastTime = time
  elapsed += delta

  // Deriva de los nodos (respiración sutil).
  const nodeAttr = nodes.geometry.getAttribute('position')
  const nodeArr = nodeAttr.array as Float32Array
  for (let i = 0; i < NODE_COUNT; i++) {
    currentNodePosition(i, posA)
    nodeArr[i * 3] = posA.x
    nodeArr[i * 3 + 1] = posA.y
    nodeArr[i * 3 + 2] = posA.z
  }
  nodeAttr.needsUpdate = true

  // Las líneas siguen a sus nodos.
  const lineAttr = lines.geometry.getAttribute('position')
  const lineArr = lineAttr.array as Float32Array
  for (let e = 0; e < edges.length; e++) {
    const [a, b] = edges[e]!
    lineArr[e * 6] = nodeArr[a * 3]!
    lineArr[e * 6 + 1] = nodeArr[a * 3 + 1]!
    lineArr[e * 6 + 2] = nodeArr[a * 3 + 2]!
    lineArr[e * 6 + 3] = nodeArr[b * 3]!
    lineArr[e * 6 + 4] = nodeArr[b * 3 + 1]!
    lineArr[e * 6 + 5] = nodeArr[b * 3 + 2]!
  }
  lineAttr.needsUpdate = true

  // Pulsos viajando por las aristas (fade in/out en los extremos).
  for (const p of pulses) {
    p.t += p.speed * delta
    if (p.t >= 1) resetPulse(p)
    const [a, b] = edges[p.edge]!
    const from = p.dir === 1 ? a : b
    const to = p.dir === 1 ? b : a
    currentNodePosition(from, posA)
    currentNodePosition(to, posB)
    p.sprite.position.set(
      posA.x + (posB.x - posA.x) * p.t,
      posA.y + (posB.y - posA.y) * p.t,
      posA.z + (posB.z - posA.z) * p.t,
    )
    p.sprite.material.opacity = Math.sin(Math.PI * p.t) * 0.85
  }

  // Respiración del hub.
  if (hub) {
    const s = 0.6 + Math.sin(elapsed * 2.2) * 0.06
    hub.scale.set(s, s, 1)
  }

  // Vaivén de la red + parallax de mouse + deriva por scroll.
  mouseX += (targetX - mouseX) * 0.04
  mouseY += (targetY - mouseY) * 0.04
  group.rotation.y = mouseX * 0.22 + Math.sin(elapsed * 0.08) * 0.1
  group.rotation.x = mouseY * 0.14 + window.scrollY * 0.0003
  camera.position.z = 7.5 + window.scrollY * 0.0022

  renderer.render(scene, camera)
  rafId = requestAnimationFrame(tick)
}

onMounted(async () => {
  const el = container.value
  if (!el) return

  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const THREE = await import('three')
  if (!container.value) return // navegó antes de que cargara el chunk

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 60)
  camera.position.z = 7.5

  group = new THREE.Group()
  scene.add(group)
  glowTexture = makeGlowTexture(THREE)

  // ---- Nodos: elipsoide ancho y aplanado que cubre el hero ----
  basePos = new Float32Array(NODE_COUNT * 3)
  driftPhase = new Float32Array(NODE_COUNT * 3)
  const colors = new Float32Array(NODE_COUNT * 3)
  const indigo = new THREE.Color('#6366f1')
  const green = new THREE.Color('#1fad52')
  const sky = new THREE.Color('#0ea5e9')
  const tmp = new THREE.Color()

  // Nodo 0 = hub central (se dibuja como sprite aparte; el punto queda
  // transparente detrás del glow).
  basePos[1] = 0.2
  basePos[2] = 0.6

  for (let i = 1; i < NODE_COUNT; i++) {
    // Rechazo simple para no amontonar nodos sobre el hub.
    let x = 0, y = 0, z = 0
    do {
      x = (Math.random() * 2 - 1) * 5.5
      y = (Math.random() * 2 - 1) * 3.1
      z = (Math.random() * 2 - 1) * 1.8
    } while (x * x + y * y < 1.1)
    basePos[i * 3] = x
    basePos[i * 3 + 1] = y
    basePos[i * 3 + 2] = z

    const t = Math.random()
    if (t < 0.6) tmp.copy(indigo).lerp(sky, Math.random() * 0.5)
    else if (t < 0.85) tmp.copy(green)
    else tmp.copy(sky)
    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b
  }
  for (let i = 0; i < driftPhase.length; i++) driftPhase[i] = Math.random() * Math.PI * 2

  const nodeGeometry = new THREE.BufferGeometry()
  nodeGeometry.setAttribute('position', new THREE.BufferAttribute(basePos.slice(), 3))
  nodeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  nodes = new THREE.Points(nodeGeometry, new THREE.PointsMaterial({
    size: 0.22,
    map: glowTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    sizeAttenuation: true,
  }))
  group.add(nodes)

  // ---- Aristas: 2 vecinos más cercanos por nodo + 10 radios del hub ----
  const edgeSet = new Set<string>()
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (!edgeSet.has(key)) {
      edgeSet.add(key)
      edges.push(a < b ? [a, b] : [b, a])
    }
  }
  const d2 = (a: number, b: number) => {
    const dx = basePos[a * 3]! - basePos[b * 3]!
    const dy = basePos[a * 3 + 1]! - basePos[b * 3 + 1]!
    const dz = basePos[a * 3 + 2]! - basePos[b * 3 + 2]!
    return dx * dx + dy * dy + dz * dz
  }
  for (let i = 1; i < NODE_COUNT; i++) {
    const nearest = Array.from({ length: NODE_COUNT - 1 }, (_, k) => k + 1)
      .filter(j => j !== i)
      .sort((a, b) => d2(i, a) - d2(i, b))
      .slice(0, 2)
    for (const j of nearest) addEdge(i, j)
  }
  const hubNearest = Array.from({ length: NODE_COUNT - 1 }, (_, k) => k + 1)
    .sort((a, b) => d2(0, a) - d2(0, b))
    .slice(0, 10)
  for (const j of hubNearest) addEdge(0, j)

  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edges.length * 6), 3))
  lines = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({
    color: '#6366f1',
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  }))
  group.add(lines)

  // ---- Hub (Kaibot): glow verde con respiración ----
  hub = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: '#25d366',
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  }))
  hub.position.set(basePos[0]!, basePos[1]!, basePos[2]!)
  hub.scale.set(0.6, 0.6, 1)
  group.add(hub)

  // ---- Pulsos: mensajes/respuestas viajando en simultáneo ----
  for (let i = 0; i < PULSE_COUNT; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }))
    sprite.scale.set(0.16, 0.16, 1)
    const p: Pulse = { sprite, edge: 0, dir: 1, t: 0, speed: 0.6 }
    resetPulse(p)
    p.t = Math.random() // desfase inicial para que no arranquen a la vez
    pulses.push(p)
    group.add(sprite)
  }

  group.rotation.x = 0.06

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(el.clientWidth, el.clientHeight)
  el.appendChild(renderer.domElement)

  if (reducedMotion) {
    // Frame estático: red visible, sin pulsos en movimiento.
    running = true
    tick(16)
    running = false
    for (const p of pulses) p.sprite.material.opacity = 0
    renderer.render(scene, camera)
  }
  else {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    intersectionObserver = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) startLoop()
      else stopLoop()
    })
    intersectionObserver.observe(el)
  }

  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !container.value) return
    const { clientWidth, clientHeight } = container.value
    camera.aspect = clientWidth / clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(clientWidth, clientHeight)
    if (reducedMotion && scene) renderer.render(scene, camera)
  })
  resizeObserver.observe(el)
})

onBeforeUnmount(() => {
  stopLoop()
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('visibilitychange', onVisibility)
  intersectionObserver?.disconnect()
  resizeObserver?.disconnect()
  nodes?.geometry.dispose()
  if (nodes && !Array.isArray(nodes.material)) nodes.material.dispose()
  lines?.geometry.dispose()
  if (lines && !Array.isArray(lines.material)) lines.material.dispose()
  hub?.material.dispose()
  for (const p of pulses) p.sprite.material.dispose()
  glowTexture?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
  renderer = null
  scene = null
  camera = null
  group = null
  nodes = null
  lines = null
  hub = null
  pulses = []
  edges = []
})
</script>

<template>
  <div ref="container" class="pointer-events-none absolute inset-0" aria-hidden="true" />
</template>
