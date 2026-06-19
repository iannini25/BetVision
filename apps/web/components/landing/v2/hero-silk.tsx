'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import styles from './hero-silk.module.css'

/**
 * HeroSilk — the layered, "worked" hero backdrop (APPROACH A: WebGL silk on its OWN canvas).
 *
 * A standalone violet "silk" field: a raw THREE.WebGLRenderer drawing ONE fullscreen quad with a
 * fbm + domain-warp fragment shader (NOT R3F, NOT the eye canvas in landing-stage.tsx). On top of
 * it, cheap DOM/SVG support layers — a faint grid, twinkling SVG sparkles, soft light rays, and an
 * feTurbulence grain — build the depth the reference look wants (silk/topographic mesh + grid +
 * sparkles + aurora + rays + grain). Mouse + scroll drive a parallax BETWEEN the layers via CSS
 * custom properties only (no React state churn, no re-render per frame; the shader reads the same
 * smoothed pointer the DOM uses).
 *
 * Degradation: reduced-motion OR <768px OR no-WebGL OR low-power -> a STATIC simplified version
 * (CSS gradient-mesh + grid + grain, no canvas, no rAF). The animated path also pauses its render
 * loop off-viewport (IntersectionObserver) and when the document is hidden, and fades to a full
 * stop so it burns zero frames in the background.
 *
 * Every layer is decorative: aria-hidden, pointer-events:none, behind the hero content (z 0). The
 * sections stay transparent — this only paints inside the hero's own stacking context.
 */

// --- fragment shader: fbm + domain warp => flowing topographic silk -------------------
const FRAG = /* glsl */ `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec2  uMouse;      // -1..1, smoothed pointer
uniform float uIntensity;  // 0..1 master fade (in/out of view + tab visibility)

// brand palette (matches globals :root, linearised lightly for additive ramps)
const vec3 BG      = vec3(0.024, 0.031, 0.059); // #06080F  bg-deep
const vec3 VIOLET  = vec3(0.486, 0.227, 0.929); // #7C3AED  brand-1
const vec3 PURPLE  = vec3(0.659, 0.333, 0.969); // #A855F7  brand-2
const vec3 FUCHSIA = vec3(0.851, 0.275, 0.937); // #D946EF  brand-3
const vec3 GREEN   = vec3(0.290, 0.871, 0.502); // #4ADE80  accent-hi (faint thread)
const vec3 AMBER   = vec3(0.984, 0.749, 0.141); // #FBBF24  warn      (Copa thread)

// gradient value-noise -----------------------------------------------------------------
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80); // decorrelate octaves
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p = rot * p * 2.02;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = uv;
  p.x *= aspect; // keep silk square regardless of viewport aspect

  float t = uTime * 0.045; // slow, premium drift

  // domain warp: fbm of an fbm-warped coordinate => flowing folds
  vec2 q = vec2(
    fbm(p * 2.2 + vec2(0.0, t)),
    fbm(p * 2.2 + vec2(5.2, -t * 0.8))
  );
  vec2 r = vec2(
    fbm(p * 2.4 + 3.6 * q + vec2(1.7 - t, 9.2)),
    fbm(p * 2.4 + 3.6 * q + vec2(8.3, 2.8 + t))
  );
  r += uMouse * 0.10; // the field leans gently toward the cursor

  float f = fbm(p * 2.6 + 4.0 * r);
  f = f * 0.5 + 0.5; // -> 0..1

  // contour banding => the topographic silk-fold ridges
  float ridges = abs(sin(f * 9.0 + length(r) * 2.0));
  ridges = pow(ridges, 1.6);

  // colour ramp — violet dominant
  vec3 col = BG;
  col = mix(col, VIOLET * 0.55, smoothstep(0.15, 0.75, f));
  col = mix(col, PURPLE * 0.85, smoothstep(0.45, 0.95, f) * 0.7);
  col = mix(col, FUCHSIA, smoothstep(0.78, 1.0, f) * 0.22); // fuchsia only in brightest folds

  // faint surgical-green threads where two warp channels cross (sparse)
  float gx = r.x * r.y + 0.5;
  float greenThread = smoothstep(0.46, 0.5, gx) * (1.0 - smoothstep(0.5, 0.62, gx));
  col += GREEN * greenThread * 0.05;

  // a single warm amber filament riding one warp channel (Copa accent, very faint)
  float amberThread = smoothstep(0.62, 0.64, q.y) * (1.0 - smoothstep(0.64, 0.70, q.y));
  col += AMBER * amberThread * 0.035;

  // ridge sheen — the "lit silk" highlight
  col += PURPLE * ridges * 0.10 * smoothstep(0.30, 0.90, f);

  // radial falloff: bright top-centre bloom -> deep edges (matches the hero vignette)
  vec2 d = uv - vec2(0.5, 0.32);
  d.x *= aspect;
  float vig = smoothstep(1.05, 0.15, length(d) * 1.6);
  col *= mix(0.35, 1.0, vig);

  // keep it a discreet backdrop, never a wall of colour
  col = mix(BG, col, 0.46);

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`

// fullscreen-quad vertex shader: position is already in clip space (PlaneGeometry(2,2))
const VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

type Mode = 'pending' | 'animated' | 'static'

/** Animated path requires: motion allowed + >=768px + decent cores + a real WebGL context. */
function detectAnimated(reduced: boolean): boolean {
  if (typeof window === 'undefined') return false
  if (reduced) return false
  if (window.innerWidth < 768) return false
  if ((navigator.hardwareConcurrency ?? 8) <= 4) return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// Deterministic sparkle field (fixed positions => SSR/CSR match, no hydration drift).
// viewBox is 100x70; a couple carry the green accent.
const SPARKLES: ReadonlyArray<{
  x: number
  y: number
  r: number
  delay: number
  dur: number
  accent: boolean
}> = [
  { x: 8, y: 18, r: 0.5, delay: 0.0, dur: 4.2, accent: false },
  { x: 47, y: 12, r: 0.4, delay: 2.1, dur: 5.6, accent: true },
  { x: 88, y: 16, r: 0.4, delay: 0.5, dur: 5.4, accent: false },
  { x: 14, y: 40, r: 0.45, delay: 2.6, dur: 5.2, accent: false },
  { x: 63, y: 47, r: 0.5, delay: 1.7, dur: 5.8, accent: true },
  { x: 74, y: 58, r: 0.45, delay: 0.6, dur: 4.7, accent: false },
]

export function HeroSilk({ className = '' }: { className?: string }) {
  const reduced = useReducedMotion()
  const [mode, setMode] = useState<Mode>('pending')
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Decide the render path once on mount (and again if reduced-motion flips).
  useEffect(() => {
    setMode(detectAnimated(reduced) ? 'animated' : 'static')
  }, [reduced])

  // -------- parallax: pointer + scroll -> CSS vars on the root (no React re-render) --------
  useEffect(() => {
    const root = rootRef.current
    if (!root || reduced) return

    let targetX = 0
    let targetY = 0
    let curX = 0
    let curY = 0
    let raf = 0
    let running = false

    const apply = () => {
      curX += (targetX - curX) * 0.08 // damped follow => glide, never snap
      curY += (targetY - curY) * 0.08
      root.style.setProperty('--mx', curX.toFixed(4))
      root.style.setProperty('--my', curY.toFixed(4))
      if (Math.abs(targetX - curX) > 0.0005 || Math.abs(targetY - curY) > 0.0005) {
        raf = requestAnimationFrame(apply)
      } else {
        running = false
      }
    }
    const kick = () => {
      if (!running) {
        running = true
        raf = requestAnimationFrame(apply)
      }
    }
    const onMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2
      targetY = (e.clientY / window.innerHeight - 0.5) * 2
      kick()
    }

    // Pointer parallax only — scroll is owned by Lenis (the single scroll authority); no
    // window 'scroll' listener here. The silk's slow drift comes from uTime, not scroll.
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  // -------- WebGL silk: raw THREE.WebGLRenderer + fullscreen quad ShaderMaterial --------
  useEffect(() => {
    if (mode !== 'animated') return
    const canvas = canvasRef.current
    const root = rootRef.current
    if (!canvas || !root) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
      })
    } catch {
      setMode('static') // late context failure (driver / blocklist) -> degrade
      return
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)

    const scene = new THREE.Scene()
    const camera = new THREE.Camera() // identity; the quad is already in clip space
    const geometry = new THREE.PlaneGeometry(2, 2)
    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uIntensity: { value: 0 },
    }
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      depthTest: false,
      depthWrite: false,
    })
    const quad = new THREE.Mesh(geometry, material)
    quad.frustumCulled = false
    scene.add(quad)

    const resize = () => {
      const w = root.clientWidth || window.innerWidth
      const h = root.clientHeight || window.innerHeight
      renderer.setSize(w, h, false)
      uniforms.uResolution.value.set(w * dpr, h * dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(root)

    // Framerate-independent damping (factor = 1 - base^dt). Named, not magic.
    const INTENSITY_BASE = 0.0001 // fast fade as the hero enters/leaves view
    const POINTER_BASE = 0.002 // smooth pointer follow

    let mx = 0
    let my = 0
    let visible = true
    let docVisible = !document.hidden
    let elapsed = 0 // silk time — advances ONLY while rendering, so pause→resume never jumps
    let last = performance.now()
    let raf = 0
    let running = false // the loop lock (not `raf`, to avoid a stop/wake race)
    let intensity = 0

    const frame = (now: number) => {
      if (!running) return
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      elapsed += dt

      const wantOn = visible && docVisible
      intensity += ((wantOn ? 1 : 0) - intensity) * (1 - Math.pow(INTENSITY_BASE, dt))

      // smoothed pointer, read from the CSS vars the parallax rAF writes (single source of truth)
      const cs = getComputedStyle(root)
      const tx = parseFloat(cs.getPropertyValue('--mx')) || 0
      const ty = parseFloat(cs.getPropertyValue('--my')) || 0
      mx += (tx - mx) * (1 - Math.pow(POINTER_BASE, dt))
      my += (ty - my) * (1 - Math.pow(POINTER_BASE, dt))

      uniforms.uTime.value = elapsed
      uniforms.uMouse.value.set(mx, -my)
      uniforms.uIntensity.value = intensity

      renderer.render(scene, camera)

      // Stop only once faded out AND still idle. Re-checked here (latest visible/docVisible) so a
      // visibility flip during this frame keeps the loop alive — no wedged-frozen canvas.
      if (!(visible && docVisible) && intensity < 0.01) {
        running = false
        cancelAnimationFrame(raf)
        raf = 0 // fully stopped -> zero frames in the background
      }
    }
    const ensureRunning = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting
        if (visible && docVisible) ensureRunning()
      },
      { threshold: 0 },
    )
    io.observe(root)

    const onVis = () => {
      docVisible = !document.hidden
      if (docVisible && visible) ensureRunning()
    }
    document.addEventListener('visibilitychange', onVis)

    ensureRunning()

    return () => {
      running = false
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    }
  }, [mode])

  const isStatic = mode === 'static'

  return (
    <div ref={rootRef} className={`${styles.root} ${className}`} aria-hidden="true">
      {/* layer 1 — the silk field (WebGL canvas, or a CSS gradient-mesh in static mode) */}
      {mode === 'animated' ? (
        <canvas ref={canvasRef} className={styles.silkCanvas} />
      ) : (
        <div className={styles.silkStatic} />
      )}

      {/* layer 2 — faint engineering grid, masked to a soft pool (parallax-far) */}
      <div className={styles.grid} />

      {/* layer 3 — soft light rays / aurora wash (parallax-mid) */}
      <div className={styles.rays} />

      {/* layer 4 — twinkling SVG sparkles (parallax-near). Static mode: rendered, not animated. */}
      <svg
        className={`${styles.sparkles} ${isStatic ? styles.sparklesStatic : ''}`}
        viewBox="0 0 100 70"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {SPARKLES.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={s.accent ? 'rgba(74, 222, 128, 0.85)' : 'rgba(220, 210, 255, 0.9)'}
            className={isStatic ? undefined : styles.sparkle}
            style={isStatic ? undefined : { animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
          />
        ))}
      </svg>

      {/* layer 5 — feTurbulence grain, on top of everything (very low opacity) */}
      <svg className={styles.grain} xmlns="http://www.w3.org/2000/svg" focusable="false">
        <filter id="hero-silk-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-silk-grain)" />
      </svg>
    </div>
  )
}
