'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type Ref } from 'react'
import * as THREE from 'three'
import { getEyeSlots, setStageEnabled, setOrbScreen, DEFAULT_RADIUS_FACTOR, type EyeSlot } from './eye-stage'
import { seedLogoEye, sampleLogoEye, makeRng } from './logo-eye-sampler'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const COUNT = 1400 // tuned for legibility of the logo silhouette; desktop-only (stage off <768px)
const VALUE_COUNT = 26 // scatter points that read as "VALOR" (model >> market)
const VALUE_CX = -0.55 // value-cluster centroid in scatter mode (upper-left)
const VALUE_CY = 0.5
const VALUE_GREEN_RGB = [0.3, 1.0, 0.55] as const // surgical green the "VALOR" points morph toward
const LOGO_URL = '/brand/betv-logo.png'

// Per-frame smoothing uses base^dt: smaller base = snappier follow.
const MORPH_SMOOTH_BASE = 0.002
const INTENSITY_SMOOTH_BASE = 0.005
const POS_FOLLOW = 40 // scroll-position follow rate /s — firm & direct, NO spring/overshoot/lag
const SCAN_FREQ = 0.6
const SCAN_AMPLITUDE = 0.16 // fraction of slot width the eye sweeps when scanning

// Dissolve -> reform transition (the eye doesn't slide between sections; it disperses and
// re-coalesces in the new place). Time-driven (not scroll-bound) so it's reversible & NaN-free.
const DISPERSE_DURATION = 0.3 // s — tight, so section changes read as a quick shimmer not a bounce
const COALESCE_DURATION = 0.34 // s
const STAGGER = 0.45 // fraction of the phase used as a per-particle delay window (wave, not block)
const DISP_RADIAL = 0.5 // radial flee distance at the peak (kept subtle — no big fly-apart)
const DISP_JITTER = 0.4 // angular jitter on the flee direction so it's not a clean ring
const CURL_AMP = 0.4 // lateral curl turbulence amplitude during dispersion
const FADE_FLOOR = 0.12 // opacity multiplier at the peak of dispersion (a ghost, never fully gone)

// Cursor repel (hero protagonist only): particles shove away from the pointer.
const REPEL_RADIUS_PX = 130
const REPEL_STRENGTH_PX = 26

// Eye life: ONLY the V (iris) blinks — it balls up and re-expands; the almond never moves.
// The iris also looks toward the cursor in 2D.
const BLINK_CLOSE = 0.15 // s — V contracts into a compact ball
const BLINK_HOLD = 0.12 // s — held as a ball (the "blink")
const BLINK_OPEN = 0.17 // s — ball re-expands into the V
const BLINK_MIN_GAP = 4 // s — minimum rest between blinks (a pseudo-random extra is added)
const GAZE_AMP = 0.27 // max iris offset (home units) — clearly readable 2D look
const GAZE_SMOOTH_BASE = 0.0009 // gaze lerp base^dt (smooth follow)
// The iris glances around on its own (autonomous saccades) so it never looks frozen, regardless of
// whether the pointer reaches the (pointer-events:none) canvas. The cursor only biases it.
const GAZE_HOLD_MIN = 1.3 // s — min time holding a look direction before the next glance
const GAZE_HOLD_RND = 1.7 // s — extra pseudo-random hold

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeInCubic = (t: number) => t * t * t
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

// A slot's live per-frame snapshot (one getBoundingClientRect each).
type Info = {
  el: HTMLElement
  rect: DOMRect
  m: number
  intensity: number
  rf: number
  scan: boolean
  interactive: boolean
  desat: number
}
function toInfo(s: EyeSlot): Info {
  return {
    el: s.el,
    rect: s.el.getBoundingClientRect(),
    m: s.morph,
    intensity: s.intensity,
    rf: s.radiusFactor ?? DEFAULT_RADIUS_FACTOR,
    scan: !!s.scan,
    interactive: !!s.interactive,
    desat: s.desat ?? 0,
  }
}

function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function radialTexture(inner: string, mid: string): THREE.Texture {
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.45, mid)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

// State the orb carries between frames. The transition machine lives here (no React re-renders).
type OrbState = {
  x: number
  y: number
  r: number
  morph: number
  intensity: number
  activeEl: HTMLElement | null // the section we're currently "home" to
  pendingEl: HTMLElement | null // the section we're transitioning toward
  phase: 'idle' | 'disperse' | 'coalesce'
  tProg: number // 0..1 within the current phase
  gx: number // smoothed gaze offset, x
  gy: number // smoothed gaze offset, y
  gazeTX: number // current autonomous look target, x
  gazeTY: number // current autonomous look target, y
  nextGaze: number // clock time the next glance is scheduled
  gazeN: number // glance counter (drives the pseudo-random direction + interval)
  blinkT: number // 0 = V open, 1 = V balled up
  blinking: boolean
  blinkStart: number // clock time the current blink began
  nextBlink: number // clock time the next blink is scheduled
  blinkN: number // blink counter (drives the pseudo-random gap)
}

function Orb() {
  const group = useRef<THREE.Group>(null)
  const pts = useRef<THREE.Points>(null)
  const glow = useRef<THREE.Sprite>(null)
  const greenDot = useRef<THREE.Sprite>(null)
  const valueGlow = useRef<THREE.Sprite>(null)
  const { size } = useThree()
  // Our own pointer source: R3F's `pointer` never updates because the canvas inherits
  // pointer-events:none, so we read the cursor from the window directly (normalised -1..1, y up).
  const ptr = useRef({ x: 0, y: 0, active: false })

  const dotTex = useMemo(() => radialTexture('rgba(200,180,255,1)', 'rgba(150,100,245,0.5)'), [])
  const glowTex = useMemo(() => radialTexture('rgba(168,85,247,0.85)', 'rgba(124,58,237,0.28)'), [])
  const greenTex = useMemo(() => radialTexture('rgba(74,222,128,0.95)', 'rgba(34,197,94,0.3)'), [])

  // Base formations + precomputed dispersion fields. logoEye/baseCol/isGreen start from the
  // synchronous seed and get overwritten in-place by the async logo sample (no remount).
  const data = useMemo(() => {
    const seed = seedLogoEye(COUNT)
    const logoEye = seed.positions
    const baseCol = seed.colors

    const scatter = new Float32Array(COUNT * 3)
    const isValue = new Float32Array(COUNT)
    const dispDir = new Float32Array(COUNT * 2)
    const dispMag = new Float32Array(COUNT)
    const curlX = new Float32Array(COUNT)
    const curlY = new Float32Array(COUNT)
    const seedPhase = new Float32Array(COUNT)
    const ballX = new Float32Array(COUNT) // compact disc the V collapses into when it blinks
    const ballY = new Float32Array(COUNT)
    const rng = makeRng(0x5eed)

    for (let i = 0; i < COUNT; i++) {
      // scatter: x = implied prob, y = model prob.
      if (i < VALUE_COUNT) {
        scatter[i * 3] = VALUE_CX + (rng() - 0.5) * 0.34
        scatter[i * 3 + 1] = VALUE_CY + (rng() - 0.5) * 0.34
        isValue[i] = 1
      } else {
        const tline = rng() * 1.7 - 0.85
        const perp = (rng() - 0.5) * 0.42
        scatter[i * 3] = Math.max(-0.92, Math.min(0.92, tline - perp))
        scatter[i * 3 + 1] = Math.max(-0.92, Math.min(0.92, tline + perp))
        isValue[i] = 0
      }
      scatter[i * 3 + 2] = 0

      // dispersion direction = radial from the logo home (+jitter); fallback to index angle.
      const hx = logoEye[i * 3]
      const hy = logoEye[i * 3 + 1]
      const len = Math.hypot(hx, hy)
      let ang = len < 1e-3 ? (i / COUNT) * Math.PI * 2 : Math.atan2(hy, hx)
      ang += (rng() - 0.5) * DISP_JITTER
      dispDir[i * 2] = Math.cos(ang)
      dispDir[i * 2 + 1] = Math.sin(ang)
      dispMag[i] = 0.6 + Math.pow(rng(), 1.5) * 0.9
      // cheap curl field sampled once at the scatter position
      curlX[i] = Math.sin(scatter[i * 3 + 1] * 3.1 + scatter[i * 3] * 1.7) * CURL_AMP
      curlY[i] = Math.cos(scatter[i * 3] * 2.9 - scatter[i * 3 + 1] * 1.3) * CURL_AMP
      seedPhase[i] = rng()
      // a tight packed disc (radius ~0.09) — the V particles collapse into this compact ball
      const ba = rng() * Math.PI * 2
      const br = Math.sqrt(rng()) * 0.09
      ballX[i] = Math.cos(ba) * br
      ballY[i] = Math.sin(ba) * br
    }
    return {
      logoEye,
      scatter,
      baseCol,
      isValue,
      dispDir,
      dispMag,
      curlX,
      curlY,
      seedPhase,
      ballX,
      ballY,
      greenCentroid: seed.greenCentroid,
    }
  }, [])

  const greenC = useRef<[number, number]>(data.greenCentroid)
  const position = useMemo(() => new Float32Array(data.logoEye), [data])
  const color = useMemo(() => new Float32Array(data.baseCol), [data])

  // Swap the parametric seed for the real sampled logo once mounted (client-only).
  useEffect(() => {
    let cancelled = false
    sampleLogoEye(LOGO_URL, COUNT)
      .then((s) => {
        if (cancelled) return
        data.logoEye.set(s.positions)
        data.baseCol.set(s.colors)
        greenC.current = s.greenCentroid
      })
      .catch(() => {
        /* keep the synchronous seed — the orb is never empty */
      })
    return () => {
      cancelled = true
    }
  }, [data])

  // Cursor from the window (the canvas can't receive pointer events). Only a gentle gaze bias.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      ptr.current.x = (e.clientX / window.innerWidth) * 2 - 1
      ptr.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
      ptr.current.active = true
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const cur = useRef<OrbState>({
    x: 0,
    y: 0,
    r: 170,
    morph: 0,
    intensity: 1,
    activeEl: null,
    pendingEl: null,
    phase: 'idle',
    tProg: 0,
    gx: 0,
    gy: 0,
    gazeTX: 0,
    gazeTY: 0,
    nextGaze: 1.2,
    gazeN: 0,
    blinkT: 0,
    blinking: false,
    blinkStart: 0,
    nextBlink: 1.6, // first blink soon after the eye forms, so it reads as alive immediately
    blinkN: 0,
  })

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const g = group.current
    const p = pts.current
    if (!g || !p) return

    // 1) gather visible slots; find nearest-to-center (trigger) and the active one (track)
    const slots = getEyeSlots()
    const cyv = window.innerHeight / 2
    let nearest: Info | null = null
    let nearestD = Infinity
    let active: Info | null = null
    const c = cur.current
    for (const s of slots) {
      const info = toInfo(s)
      if (info.rect.width === 0) continue
      const d = Math.abs(info.rect.top + info.rect.height / 2 - cyv)
      if (d < nearestD) {
        nearestD = d
        nearest = info
      }
      if (s.el === c.activeEl) active = info
    }
    if (!nearest) return

    // 2) transition machine — triggered by a STABLE element identity change (StrictMode-safe)
    let snap = false
    if (c.activeEl === null) {
      c.activeEl = nearest.el
      active = nearest
      snap = true
      c.phase = 'idle'
    } else if (c.phase === 'idle' && nearest.el !== c.activeEl) {
      c.phase = 'disperse'
      c.tProg = 0
      c.pendingEl = nearest.el
    } else if (c.phase !== 'idle' && nearest.el !== c.pendingEl) {
      c.pendingEl = nearest.el // re-aim without restarting the current phase
    }

    if (c.phase === 'disperse') {
      c.tProg += dt / DISPERSE_DURATION
      if (c.tProg >= 1) {
        c.activeEl = c.pendingEl // adopt the new home at the peak of dispersion (invisible swap)
        c.phase = 'coalesce'
        c.tProg = 0
        snap = true
        // re-track the freshly adopted slot this same frame (its rect is still live)
        const ns = slots.find((s) => s.el === c.activeEl)
        if (ns) active = toInfo(ns)
      }
    } else if (c.phase === 'coalesce') {
      c.tProg += dt / COALESCE_DURATION
      if (c.tProg >= 1) {
        c.phase = 'idle'
        c.tProg = 0
      }
    }
    if (!active) active = nearest // safety: old section unmounted mid-transition

    // 3) target from the tracked slot (still a live, scrolling rect) + smoothing
    const scanDx = active.scan ? Math.sin(t * SCAN_FREQ) * active.rect.width * SCAN_AMPLITUDE : 0
    const tx = active.rect.left + active.rect.width / 2 - size.width / 2 + scanDx
    const ty = -(active.rect.top + active.rect.height / 2 - size.height / 2)
    const tr = Math.max(1, active.rect.width * active.rf)
    // firm, direct follow (clamped linear lerp) — no spring, no overshoot, no lag on scroll
    const kPos = snap ? 1 : Math.min(1, POS_FOLLOW * dt)
    c.x += (tx - c.x) * kPos
    c.y += (ty - c.y) * kPos
    c.r += (tr - c.r) * kPos
    c.morph += (active.m - c.morph) * (snap ? 1 : 1 - Math.pow(MORPH_SMOOTH_BASE, dt))
    c.intensity += (active.intensity - c.intensity) * (snap ? 1 : 1 - Math.pow(INTENSITY_SMOOTH_BASE, dt))

    g.position.set(c.x, c.y, 0)
    // expose the orb's live screen position so the reactive background streams toward it
    setOrbScreen(c.x + size.width / 2, size.height / 2 - c.y)
    const m = c.morph
    const irisAmt = 1 - m
    const cr = c.r
    const px = ptr.current.x
    const py = ptr.current.y
    // very subtle whole-eye parallax tilt (the real "looking" is the V offset below)
    g.rotation.y += (px * 0.06 * irisAmt - g.rotation.y) * 0.05
    g.rotation.x += (-py * 0.05 * irisAmt - g.rotation.x) * 0.05

    // 4) dispersion envelope + opacity multiplier
    const disperseT =
      c.phase === 'disperse' ? easeInCubic(c.tProg) : c.phase === 'coalesce' ? 1 - easeOutCubic(c.tProg) : 0
    const transFade = 1 - (1 - FADE_FLOOR) * disperseT

    // idle "life": when the formed eye is at rest, each particle breathes radially on its own
    // phase so the orb reads as living, not a frozen logo. Off during scatter/transition.
    const breathAmp = c.phase === 'idle' && disperseT === 0 && irisAmt > 0.001 ? irisAmt * cr * 0.015 : 0

    // the eye is "alive" only when formed and at rest (no scatter / no section transition)
    const eyeAlive = c.phase === 'idle' && disperseT === 0 && irisAmt > 0.5

    // gaze: the iris glances around on its own (autonomous saccades, side-to-side emphasised),
    // gently biased toward the cursor when the pointer is live — so it always reads as looking
    // around, never frozen. Eases back to centre when the eye isn't alive.
    const kGaze = 1 - Math.pow(GAZE_SMOOTH_BASE, dt)
    if (eyeAlive) {
      if (t >= c.nextGaze) {
        const rx = (Math.abs(Math.sin(c.gazeN * 73.13) * 4373.1) % 1) * 2 - 1 // -1..1
        const ry = (Math.abs(Math.sin(c.gazeN * 19.71) * 2531.7) % 1) * 2 - 1
        c.gazeTX = rx * GAZE_AMP
        c.gazeTY = ry * GAZE_AMP * 0.5 // less vertical travel than horizontal
        c.gazeN += 1
        c.nextGaze = t + GAZE_HOLD_MIN + (Math.abs(Math.sin(c.gazeN * 41.27) * 1117.3) % 1) * GAZE_HOLD_RND
      }
      let tgx = c.gazeTX
      let tgy = c.gazeTY
      if (ptr.current.active) {
        tgx = tgx * 0.5 + Math.max(-1, Math.min(1, ptr.current.x)) * GAZE_AMP * 0.5
        tgy = tgy * 0.5 + Math.max(-1, Math.min(1, ptr.current.y)) * GAZE_AMP * 0.5
      }
      c.gx += (tgx - c.gx) * kGaze
      c.gy += (tgy - c.gy) * kGaze
    } else {
      c.gx += (0 - c.gx) * kGaze
      c.gy += (0 - c.gy) * kGaze
    }

    // blink: V -> compact ball -> V (only the V subset moves; zero rotation/flip)
    if (eyeAlive && !c.blinking && t >= c.nextBlink) {
      c.blinking = true
      c.blinkStart = t
    }
    if (c.blinking) {
      const e = t - c.blinkStart
      if (e < BLINK_CLOSE) c.blinkT = easeInCubic(e / BLINK_CLOSE)
      else if (e < BLINK_CLOSE + BLINK_HOLD) c.blinkT = 1
      else if (e < BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN)
        c.blinkT = 1 - easeOutCubic((e - BLINK_CLOSE - BLINK_HOLD) / BLINK_OPEN)
      else {
        c.blinkT = 0
        c.blinking = false
        c.blinkN += 1
        c.nextBlink = t + BLINK_MIN_GAP + Math.abs((Math.sin(c.blinkN * 91.7) * 4373.1) % 1) * 3
      }
    } else if (!eyeAlive) {
      c.blinkT = 0
      c.blinking = false
    }
    const blinkT = c.blinkT

    // 5) repel only on the interactive (hero) slot while the eye is formed
    const doRepel = active.interactive && irisAmt > 0.45
    const pmx = px * (size.width / 2)
    const pmy = py * (size.height / 2)

    // 6) write positions + colors
    const posAttr = p.geometry.attributes.position as THREE.BufferAttribute
    const colAttr = p.geometry.attributes.color as THREE.BufferAttribute
    const pa = posAttr.array as Float32Array
    const ca = colAttr.array as Float32Array
    const d = data
    const desat = active.desat ?? 0 // per-section: dampen the eye into a quiet background detail
    for (let i = 0; i < COUNT; i++) {
      const j = i * 3
      let lx = (d.logoEye[j] * irisAmt + d.scatter[j] * m) * cr
      let ly = (d.logoEye[j + 1] * irisAmt + d.scatter[j + 1] * m) * cr
      let lz = (d.logoEye[j + 2] * irisAmt + d.scatter[j + 2] * m) * cr

      if (disperseT > 0) {
        const local = clamp01((disperseT - d.seedPhase[i] * STAGGER) / (1 - STAGGER))
        const offMag = local * d.dispMag[i] * DISP_RADIAL * cr
        lx += d.dispDir[i * 2] * offMag + d.curlX[i] * local * cr
        ly += d.dispDir[i * 2 + 1] * offMag + d.curlY[i] * local * cr
        lz += (d.seedPhase[i] - 0.5) * local * cr * 0.5
      }

      if (breathAmp > 0) {
        const wob = 1 + Math.sin(t * 1.6 + d.seedPhase[i] * Math.PI * 2)
        lx += d.logoEye[j] * breathAmp * wob
        ly += d.logoEye[j + 1] * breathAmp * wob
      }

      // vWeight: 1 inside the V/iris, 0 on the almond rim (position-based, so it tracks the real
      // sampled logo). The almond outline never participates in the gaze or the blink.
      const lex = d.logoEye[j]
      const ley = d.logoEye[j + 1]
      const ellipse = lex * lex + (ley / 0.55) * (ley / 0.55)
      const vw = clamp01((0.8 - ellipse) / 0.42)
      // gaze: the iris looks toward the cursor (2D); rim stays put
      lx += c.gx * vw * cr
      ly += c.gy * vw * cr

      if (doRepel) {
        const wx = c.x + lx
        const wy = c.y + ly
        const ddx = wx - pmx
        const ddy = wy - pmy
        const dist2 = ddx * ddx + ddy * ddy
        if (dist2 < REPEL_RADIUS_PX * REPEL_RADIUS_PX) {
          const dist = Math.sqrt(dist2) || 1
          const f = (1 - dist / REPEL_RADIUS_PX) * REPEL_STRENGTH_PX
          lx += (ddx / dist) * f
          ly += (ddy / dist) * f
        }
      }

      // blink: the V (vw>0) collapses into a compact ball at the iris centre (+gaze), then back
      if (blinkT > 0) {
        const bb = blinkT * vw
        lx = lx * (1 - bb) + (d.ballX[i] + c.gx) * cr * bb
        ly = ly * (1 - bb) + (d.ballY[i] + c.gy) * cr * bb
      }

      pa[j] = lx
      pa[j + 1] = ly
      pa[j + 2] = lz

      // value-greening (scatter), then optional per-section desaturation (quiet sections)
      const vg = d.isValue[i] * m
      let r0 = d.baseCol[j] * (1 - vg) + VALUE_GREEN_RGB[0] * vg
      let g0 = d.baseCol[j + 1] * (1 - vg) + VALUE_GREEN_RGB[1] * vg
      let b0 = d.baseCol[j + 2] * (1 - vg) + VALUE_GREEN_RGB[2] * vg
      if (desat > 0) {
        const lum = 0.3 * r0 + 0.59 * g0 + 0.11 * b0
        r0 += (lum - r0) * desat
        g0 += (lum - g0) * desat
        b0 += (lum - b0) * desat
      }
      ca[j] = r0
      ca[j + 1] = g0
      ca[j + 2] = b0
    }
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    ;(p.material as THREE.PointsMaterial).opacity = 0.92 * c.intensity * transFade

    // violet halo
    if (glow.current) {
      const s = cr * 3.0
      glow.current.scale.set(s, s, 1)
      ;(glow.current.material as THREE.SpriteMaterial).opacity = c.intensity * (0.18 + 0.5 * irisAmt) * transFade
    }
    // green "i" dot jewel — rides the gaze and is pulled into the ball during a blink
    if (greenDot.current) {
      const gdx = (greenC.current[0] * (1 - blinkT) + c.gx) * cr
      const gdy = (greenC.current[1] * (1 - blinkT) + c.gy) * cr
      greenDot.current.position.set(gdx, gdy, 0.06)
      const gs = cr * 0.9
      greenDot.current.scale.set(gs, gs, 1)
      const desatDim = 1 - desat * 0.6
      ;(greenDot.current.material as THREE.SpriteMaterial).opacity = irisAmt * c.intensity * 0.85 * transFade * desatDim
    }
    // green "found the value" hotspot — only once scattered
    if (valueGlow.current) {
      valueGlow.current.position.set(VALUE_CX * cr, VALUE_CY * cr, 0.02)
      const vs = cr * 1.4
      valueGlow.current.scale.set(vs, vs, 1)
      ;(valueGlow.current.material as THREE.SpriteMaterial).opacity = m * c.intensity * 0.8 * transFade
    }
  })

  // @react-three/fiber 8's JSX prop types reference a pre-generic `three`, so under raw tsc
  // they don't unify with three@0.184's `Texture<…>` / ref types (next build resolves it and
  // ships green). These boundary props are runtime-correct; the casts only bridge that skew.
  const r = <T,>(x: T) => x as Ref<never>
  const tex = (x: THREE.Texture) => x as never
  return (
    <group ref={r(group)}>
      <sprite ref={r(glow)}>
        <spriteMaterial map={tex(glowTex)} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.8} />
      </sprite>
      <points ref={r(pts)}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[position, 3]} />
          <bufferAttribute attach="attributes-color" args={[color, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={4.5}
          map={tex(dotTex)}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation={false}
        />
      </points>
      <sprite ref={r(greenDot)}>
        <spriteMaterial map={tex(greenTex)} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </sprite>
      <sprite ref={r(valueGlow)}>
        <spriteMaterial map={tex(greenTex)} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </sprite>
    </group>
  )
}

/**
 * The single persistent stage. One orthographic (1px = 1 unit) canvas that hosts the
 * traveling/morphing logo-eye for the whole page. Renders nothing when 3D can't/shouldn't run
 * (reduced-motion, no WebGL, small/low-power screens) — sections then show static states.
 */
export function LandingStage() {
  const reduced = useReducedMotion()
  const [enabled, setEnabled] = useState(false)
  const [active, setActive] = useState(true)

  useEffect(() => {
    const smallOrLowPower = window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4
    const ok = !reduced && !smallOrLowPower && supportsWebGL()
    setEnabled(ok)
    setStageEnabled(ok)
    return () => setStageEnabled(false)
  }, [reduced])

  // Pause the render loop when the tab is hidden (no wasted frames in the background).
  useEffect(() => {
    const onVis = () => setActive(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  if (!enabled) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1]">
      <Canvas
        orthographic
        frameloop={active ? 'always' : 'never'}
        camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <Orb />
      </Canvas>
    </div>
  )
}
