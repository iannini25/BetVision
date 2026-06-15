// Turns the real BetV logo into particle "homes" so the orb reconstructs the actual mark
// (almond + V iris + green "i" dot), not a generic ring. Two entry points:
//   - seedLogoEye(count):     synchronous, parametric — used for the very first frame and as
//                             the fallback if the async sample ever fails (orb never empty).
//   - sampleLogoEye(url,count): async, samples the processed PNG (transparent bg) pixel-by-pixel
//                             so positions AND colors come from the real artwork.
// Output positions are normalized, aspect-preserved (y-up), centered on the artwork bbox, so
// the consumer only has to scale by the orb radius. No Math.random in any hot path.

export type LogoEyeData = {
  positions: Float32Array // count*3 — normalized, aspect-preserved, y-up
  colors: Float32Array // count*3 — 0..1
  greenCentroid: [number, number] // normalized (x,y) of the green dot (drives the jewel glow)
}

const SAMPLE_RES = 256
const ALPHA_MIN = 40 // processed PNG is transparent-bg; keep pixels above this alpha
const LIT_BOOST = 1.15 // brighten sampled violet so particles read as "lit", not muddy
// green "i" dot test (0..255): clearly greener than red/blue and bright enough
const isGreenPixel = (r: number, g: number, b: number) => g > r && g > b && g > 110

// Small deterministic PRNG (LCG) — stable look across reloads, zero Math.random.
// Exported so the stage shares one implementation (no duplicate LCG).
export function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const VIOLET = { r: 0.66, g: 0.52, b: 0.98 } // #a78bfa-ish, the logo body
const GREEN = { r: 0.29, g: 0.87, b: 0.5 } // #4ade80, the i dot

/**
 * Parametric seed: an almond outline + a bold V + a green dot, evenly fleshed out.
 * Recognizable on its own and instantly available (no I/O).
 */
export function seedLogoEye(count: number): LogoEyeData {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const greenCentroid: [number, number] = [0.42, 0.34]
  const rng = makeRng(0xbe7c)

  const W = 0.96 // almond half-width
  const H = 0.5 // almond half-height
  const greenN = Math.max(8, Math.round(count * 0.035))

  for (let i = 0; i < count; i++) {
    let x = 0
    let y = 0
    let green = 0
    const t = rng()
    if (i < greenN) {
      // tight green dot cluster, upper-right (matches the real "i" dot)
      const a = rng() * Math.PI * 2
      const rr = Math.sqrt(rng()) * 0.075
      x = greenCentroid[0] + Math.cos(a) * rr
      y = greenCentroid[1] + Math.sin(a) * rr * 0.9
      green = 1
    } else if (t < 0.5) {
      // the V (iris): two strokes from the upper corners down to the bottom-center apex
      const u = rng()
      const left = rng() < 0.5
      const x0 = left ? -0.52 : 0.52
      x = x0 * (1 - u)
      y = 0.36 - u * 0.78 // top -> apex
      x += (rng() - 0.5) * 0.1
      y += (rng() - 0.5) * 0.06
    } else if (t < 0.82) {
      // almond outline (two arcs)
      const px = (rng() * 2 - 1) * W
      const edge = H * (1 - (px / W) * (px / W))
      y = (rng() < 0.5 ? edge : -edge) + (rng() - 0.5) * 0.05
      x = px
    } else {
      // sparse interior fill so the eye reads as a body, not just an outline
      const px = (rng() * 2 - 1) * W * 0.9
      const edge = H * (1 - (px / W) * (px / W))
      y = (rng() * 2 - 1) * edge * 0.85
      x = px
    }
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = (rng() - 0.5) * 0.16
    const c = green ? GREEN : VIOLET
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  return { positions, colors, greenCentroid }
}

/**
 * Sample the processed (transparent-bg) logo PNG. Positions and colors come from the real
 * artwork. Same-origin asset => no canvas taint; any failure throws and the caller keeps the
 * synchronous seed. Never call during SSR (consumer guards with a client-only effect).
 */
export async function sampleLogoEye(url: string, count: number): Promise<LogoEyeData> {
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  await img.decode()

  const c = document.createElement('canvas')
  c.width = c.height = SAMPLE_RES
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('no 2d context')
  // draw preserving aspect (the asset is trimmed tight to the eye, so it's wider than tall)
  const iw = img.naturalWidth || SAMPLE_RES
  const ih = img.naturalHeight || SAMPLE_RES
  const scale = Math.min(SAMPLE_RES / iw, SAMPLE_RES / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, (SAMPLE_RES - dw) / 2, (SAMPLE_RES - dh) / 2, dw, dh)
  const data = ctx.getImageData(0, 0, SAMPLE_RES, SAMPLE_RES).data

  // collect opaque pixels + bbox
  const pool: number[] = [] // packed pixel offsets (i*4)
  let minX = SAMPLE_RES
  let maxX = 0
  let minY = SAMPLE_RES
  let maxY = 0
  for (let y = 0; y < SAMPLE_RES; y++) {
    for (let x = 0; x < SAMPLE_RES; x++) {
      const o = (y * SAMPLE_RES + x) * 4
      if (data[o + 3] < ALPHA_MIN) continue
      pool.push(o)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (pool.length < count * 0.3) throw new Error('logo sample too sparse')

  // deterministic shuffle so the chosen subset is well spread, not row-clustered
  const rng = makeRng(0x10d0 ^ pool.length)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = pool[i]
    pool[i] = pool[j]
    pool[j] = tmp
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const half = Math.max(maxX - minX, maxY - minY) / 2 || 1

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  let gx = 0
  let gy = 0
  let gn = 0

  for (let i = 0; i < count; i++) {
    const o = pool[i % pool.length]
    const px = (o / 4) % SAMPLE_RES
    const py = Math.floor(o / 4 / SAMPLE_RES)
    const r = data[o]
    const g = data[o + 1]
    const b = data[o + 2]
    const nx = (px - cx) / half
    const ny = -(py - cy) / half // flip to y-up
    positions[i * 3] = nx * 0.98
    positions[i * 3 + 1] = ny * 0.98
    positions[i * 3 + 2] = (rng() - 0.5) * 0.16
    const green = isGreenPixel(r, g, b) ? 1 : 0
    // push the violet a touch brighter than raw so it reads as "lit" particles
    colors[i * 3] = green ? GREEN.r : Math.min(1, (r / 255) * LIT_BOOST)
    colors[i * 3 + 1] = green ? GREEN.g : Math.min(1, (g / 255) * LIT_BOOST)
    colors[i * 3 + 2] = green ? GREEN.b : Math.min(1, (b / 255) * LIT_BOOST)
    if (green) {
      gx += nx * 0.98
      gy += ny * 0.98
      gn++
    }
  }
  const greenCentroid: [number, number] = gn ? [gx / gn, gy / gn] : [0.42, 0.34]
  return { positions, colors, greenCentroid }
}
