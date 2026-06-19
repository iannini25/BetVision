'use client'

import { useEffect, useRef } from 'react'
import { gsap } from './gsap-init'
import { useGSAP } from '@gsap/react'
import { getLenisScrollV, getOrbScreen } from './eye-stage'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import styles from './landing.module.css'

type Particle = { x: number; y: number; z: number; r: number; hue: number }

/**
 * Fixed cosmic backdrop: CSS glow/grid/vignette layers that parallax with scroll (GSAP),
 * plus a canvas particle field that drifts toward the portal and biases its direction by
 * scroll velocity and mouse. Pauses on hidden tab; static under reduced-motion.
 */
export function ReactiveBackground() {
  const rootRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const moodRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return
      gsap.to(glowRef.current, {
        yPercent: 22,
        xPercent: -6,
        scale: 1.18,
        ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1 },
      })
      gsap.to(gridRef.current, {
        yPercent: -12,
        ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.5 },
      })
      // scroll-driven "mood": the single fixed mood glow shifts hue + drifts down the page, so
      // each section reads a different colour without any border between them.
      gsap.fromTo(
        moodRef.current,
        { filter: 'blur(40px) hue-rotate(-18deg)', yPercent: -6 },
        {
          filter: 'blur(40px) hue-rotate(46deg)',
          yPercent: 10,
          ease: 'none',
          scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.2 },
        }
      )
    },
    { scope: rootRef, dependencies: [reduced] }
  )

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const context = canvasEl.getContext('2d')
    if (!context) return
    // Explicit non-null declared types so the nested raf closures keep the narrowing.
    const cv: HTMLCanvasElement = canvasEl
    const c2d: CanvasRenderingContext2D = context

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    const particles: Particle[] = []

    function resize() {
      w = window.innerWidth
      h = window.innerHeight
      cv.width = w * dpr
      cv.height = h * dpr
      cv.style.width = `${w}px`
      cv.style.height = `${h}px`
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // Ambient dust: kept small + faint so no single particle ever reads as a "mark" behind the
    // headline — it should be felt, not seen as dots.
    const count = w < 768 ? 26 : 46
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.3 + Math.random() * 0.9,
        r: 0.3 + Math.random() * 1.0,
        hue: Math.random() < 0.78 ? 268 : 196, // mostly violet, some cyan "data"
      })
    }

    // Focal point = the orb's LIVE screen position (so the dust streams toward wherever the
    // eye actually travels), falling back to the hero spot when the 3D stage is off.
    const focal = () => getOrbScreen() ?? { x: w * 0.6, y: h * 0.42 }
    let mouseX = w / 2
    let mouseY = h / 2
    let scrollV = 0

    function onMouse(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('resize', resize)

    let raf = 0
    function draw() {
      c2d.clearRect(0, 0, w, h)
      const f = focal()
      const mpx = (mouseX / w - 0.5) * 18
      const mpy = (mouseY / h - 0.5) * 18
      // velocity bias sourced from Lenis (the single scroll authority), not a scroll listener
      scrollV = getLenisScrollV() * 0.25
      for (const p of particles) {
        // drift gently toward the focal point + scroll-direction bias
        const dx = (f.x - p.x) * 0.0006 * p.z
        const dy = (f.y - p.y) * 0.0006 * p.z
        p.x += dx
        p.y += dy - scrollV * 0.04 * p.z
        // wrap
        if (p.y < -20) p.y = h + 20
        if (p.y > h + 20) p.y = -20
        if (p.x < -20) p.x = w + 20
        if (p.x > w + 20) p.x = -20
        const sx = p.x + mpx * p.z
        const sy = p.y + mpy * p.z
        const alpha = 0.08 + p.z * 0.26
        c2d.beginPath()
        c2d.arc(sx, sy, p.r * p.z, 0, Math.PI * 2)
        c2d.fillStyle =
          p.hue === 268
            ? `rgba(168,130,250,${alpha})`
            : `rgba(56,189,248,${alpha * 0.8})`
        c2d.fill()
      }
      raf = requestAnimationFrame(draw)
    }

    function start() {
      if (!raf) raf = requestAnimationFrame(draw)
    }
    function stop() {
      cancelAnimationFrame(raf)
      raf = 0
    }
    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    if (reduced) {
      draw() // single static frame
      stop()
    } else {
      start()
    }

    return () => {
      stop()
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced])

  return (
    <div ref={rootRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className={styles.bgBase} />
      <div ref={moodRef} className={styles.bgMood} />
      <div ref={gridRef} className={styles.grid} />
      <div ref={glowRef} className={styles.portalGlow} />
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className={styles.vignette} />
      <div className={styles.noise} />
    </div>
  )
}
