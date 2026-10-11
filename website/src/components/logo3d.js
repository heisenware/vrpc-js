// The glossy 3D V of the home page. It stands still in the hero and glides
// into the call story as the visitor scrolls. It turns only towards a
// pointer resting on it, and flashes once as a message passes through it in
// the call story; otherwise nothing about it changes.
//
// It draws only while something changes, and is loaded on demand
// (import('./logo3d')): three.js stays out of the page's first load.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// The V of the logo, symmetric and centred on 0 (y down), and its depth
const V = [[-155, -155], [-75, -155], [0, 70], [75, -155], [155, -155], [36, 157], [-36, 157]]
const DEPTH = 56
// The logo's own pose: turned to show its right sides, seen a little from above
const BASE = { yaw: 20, pitch: 15 }
// how far it turns towards a pointer at the edge of the logo
const TURN = { yaw: 40, pitch: 40 }
const DEG = Math.PI / 180

// how long the V takes to catch up with the scroll and with the pointer
const FOLLOW_SCROLL = 0.35
const FOLLOW_POINTER = 0.25
// the most pixels a side of the drawing buffer gets
const MAX_PIXELS = 800

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const smooth = t => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t
// eases a value towards its target, the same way at any frame rate
const follow = (value, target, dt, seconds) => value + (target - value) * (1 - Math.exp(-dt / seconds))
const near = (a, b) => Math.abs(a - b) < 1e-3

// A message reaching the V while it rests in the call story: one short flash
// in the message's color - teal on the way to the agent, copper on the way
// back. Copper needs the V's own color to turn: a copper glow on teal reads
// olive. The flash rises in 60 ms, holds its color for 120 ms and fades
// fast, so the colors between teal and copper pass too quickly to show.
const COLOR = new THREE.Color(0x0f8170)
const FLASH = {
  request: { tint: new THREE.Color('#14a38e'), mix: 0.6, glow: new THREE.Color('#2fd1b6'), strength: 0.45 },
  answer: { tint: new THREE.Color('#b87333'), mix: 0.85, glow: new THREE.Color('#d98a45'), strength: 0.35 }
}
const FLASH_SECONDS = 0.5
const flashCurve = t => (t < 0.06 ? Math.sin((t / 0.06) * Math.PI / 2) ** 2 : t < 0.18 ? 1 : Math.exp(-(t - 0.18) / 0.05))

export function startLogo ({ wrap, flight, canvas, onReady }) {
  const heroSlot = wrap.querySelector('[data-logo-slot="hero"]')
  const callSlot = wrap.querySelector('[data-logo-slot="call"]')
  if (!heroSlot || !callSlot) return () => {}

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.toneMapping = THREE.NeutralToneMapping
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = environment

  const camera = new THREE.PerspectiveCamera(30, 1, 10, 4000)
  camera.position.set(0, 0, 820)

  const shape = new THREE.Shape(V.map(([x, y]) => new THREE.Vector2(x, -y)))
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH, bevelEnabled: true, bevelThickness: 6, bevelSize: 5, bevelSegments: 5, curveSegments: 1
  })
  geometry.center()
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x0f8170, roughness: 0.36, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06,
    envMapIntensity: 0.65
  })
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
  const key = new THREE.DirectionalLight(0xffffff, 1.8)
  key.position.set(300, 810, 510) // upper right, in front: the light of the flat logo
  scene.add(key)

  // where the slots are, in the wrapper's coordinates, and when the journey ends
  let layout = null
  function measure () {
    const w = wrap.getBoundingClientRect()
    const h = heroSlot.getBoundingClientRect()
    const c = callSlot.getBoundingClientRect()
    const size = h.width
    if (size !== layout?.size) {
      flight.style.width = `${size}px`
      flight.style.height = `${size}px`
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2, MAX_PIXELS / size))
      renderer.setSize(size, size, false)
    }
    const callCentre = window.scrollY + c.top + c.height / 2
    layout = {
      size,
      hero: { x: h.left - w.left, y: h.top - w.top },
      // the canvas scales from its top left corner, onto the call slot
      call: { x: c.left - w.left, y: c.top - w.top, scale: c.width / size },
      // the V arrives when the call slot is in the middle of the window
      end: Math.max(240, callCentre - window.innerHeight / 2)
    }
    wake()
  }

  // the journey: 0 in the hero, 1 in the call story
  const progress = () => clamp(window.scrollY / layout.end, 0, 1)

  // the pointer, while a mouse or pen is over the window
  let mouse = null
  function onPointer (e) {
    if (e.pointerType === 'touch') return
    mouse = { x: e.clientX, y: e.clientY }
    wake()
  }
  function onOut (e) {
    if (e.relatedTarget) return
    mouse = null
    wake()
  }
  // where on the V the pointer rests, -1..1 from its middle, or nothing
  function aim () {
    if (!mouse) return null
    const r = flight.getBoundingClientRect()
    const x = ((mouse.x - r.left) / r.width - 0.5) * 2
    const y = ((mouse.y - r.top) / r.height - 0.5) * 2
    return Math.abs(x) <= 1 && Math.abs(y) <= 1 ? { x, y } : null
  }

  // the flash of the last message that reached the V in the call story
  let flash = null
  function onPulse (e) {
    if (journey < 0.97) return // not there yet: the V stays as it is
    flash = { look: FLASH[e.detail?.kind] || FLASH.request, start: performance.now() }
    wake()
  }

  let visible = true
  let ready = false
  let frame = 0
  let running = false
  let last = 0
  let journey = 0
  const turn = { x: 0, y: 0 }

  // draws frames until nothing changes any more
  function wake () {
    if (running || !visible || !layout) return
    running = true
    last = performance.now()
    frame = requestAnimationFrame(step)
  }

  function step (now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now

    const goal = progress()
    journey = follow(journey, goal, dt, FOLLOW_SCROLL)
    if (near(journey, goal)) journey = goal
    const p = smooth(journey)
    const x = lerp(layout.hero.x, layout.call.x, p)
    const y = lerp(layout.hero.y, layout.call.y, p)
    const s = lerp(1, layout.call.scale, p)
    flight.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`

    // turned towards the pointer resting on it - the front faces the pointer
    const target = aim() || { x: 0, y: 0 }
    turn.x = follow(turn.x, target.x, dt, FOLLOW_POINTER)
    turn.y = follow(turn.y, target.y, dt, FOLLOW_POINTER)
    if (near(turn.x, target.x) && near(turn.y, target.y)) Object.assign(turn, target)
    mesh.rotation.set((BASE.pitch + TURN.pitch * turn.y) * DEG, -(BASE.yaw - TURN.yaw * turn.x) * DEG, 0)

    const t = flash ? (now - flash.start) / 1000 : Infinity
    if (t < FLASH_SECONDS) {
      const e = flashCurve(t)
      material.color.copy(COLOR).lerp(flash.look.tint, flash.look.mix * e)
      material.emissive.copy(flash.look.glow).multiplyScalar(flash.look.strength * e)
    } else {
      flash = null
      material.color.copy(COLOR)
      material.emissive.setRGB(0, 0, 0)
    }

    renderer.render(scene, camera)
    if (!ready) {
      ready = true
      onReady()
    }

    const still = journey === goal && turn.x === target.x && turn.y === target.y && !flash
    if (still) running = false
    else frame = requestAnimationFrame(step)
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) wake()
  })
  io.observe(wrap)
  const ro = new ResizeObserver(measure)
  ro.observe(wrap)
  window.addEventListener('resize', measure)
  window.addEventListener('scroll', wake, { passive: true })
  window.addEventListener('pointermove', onPointer, { passive: true })
  document.addEventListener('pointerout', onOut)
  window.addEventListener('vrpc-pulse', onPulse)
  measure()
  journey = progress()
  wake()

  return () => {
    cancelAnimationFrame(frame)
    io.disconnect()
    ro.disconnect()
    window.removeEventListener('resize', measure)
    window.removeEventListener('scroll', wake)
    window.removeEventListener('pointermove', onPointer)
    document.removeEventListener('pointerout', onOut)
    window.removeEventListener('vrpc-pulse', onPulse)
    geometry.dispose()
    material.dispose()
    environment.dispose()
    pmrem.dispose()
    renderer.dispose()
  }
}
