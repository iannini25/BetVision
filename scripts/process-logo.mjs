// One-off asset processor: turns the real BetV-logo.png (1254x1254 RGB, solid navy
// background, no alpha) into a small, transparent-background PNG used both for the
// displayed wordmark and as the source the hero particle eye samples.
//
// The logo has no alpha channel, so we chroma-key the navy out by luminance: the navy
// background sits at max(r,g,b) < ~40 while the violet/green logo is far brighter. A soft
// ramp feathers the almond/V edges so there's no hard navy halo. Runs the real Chrome via
// playwright-core (the only image tool available here).
//
// Usage: node scripts/process-logo.mjs
import { launchChrome } from './_browser.mjs'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const SRC = 'BetV-logo.png'
const OUT = 'apps/web/public/brand/betv-logo.png'
const WORK = 512 // working resolution before trimming to the eye bbox
const PAD = 6 // transparent padding (px, at WORK scale) around the trimmed eye
const RAMP_LO = 24 // <= this max-channel => fully transparent (navy bg ~ (6,8,15)..(.,.,26))
const RAMP_HI = 60 // >= this => fully opaque (logo body)

const dataUrl = `data:image/png;base64,${readFileSync(SRC).toString('base64')}`

const browser = await launchChrome()
const page = await browser.newPage()

const result = await page.evaluate(
  async ({ dataUrl, WORK, PAD, RAMP_LO, RAMP_HI }) => {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const work = document.createElement('canvas')
    work.width = work.height = WORK
    const wctx = work.getContext('2d')
    wctx.drawImage(img, 0, 0, WORK, WORK)
    const id = wctx.getImageData(0, 0, WORK, WORK)
    const d = id.data

    // chroma-key the navy out by luminance, then find the bbox of what's left
    let minX = WORK
    let maxX = 0
    let minY = WORK
    let maxY = 0
    for (let y = 0; y < WORK; y++) {
      for (let x = 0; x < WORK; x++) {
        const i = (y * WORK + x) * 4
        const mx = Math.max(d[i], d[i + 1], d[i + 2])
        let a = (mx - RAMP_LO) / (RAMP_HI - RAMP_LO)
        a = a < 0 ? 0 : a > 1 ? 1 : a
        d[i + 3] = Math.round(a * 255)
        if (a > 0.5) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    wctx.putImageData(id, 0, 0)

    // crop tight to the eye (+pad) so the displayed mark fills its box
    const x0 = Math.max(0, minX - PAD)
    const y0 = Math.max(0, minY - PAD)
    const w = Math.min(WORK, maxX + PAD) - x0
    const h = Math.min(WORK, maxY + PAD) - y0
    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    out.getContext('2d').drawImage(work, x0, y0, w, h, 0, 0, w, h)
    return { url: out.toDataURL('image/png'), w, h }
  },
  { dataUrl, WORK, PAD, RAMP_LO, RAMP_HI }
)

mkdirSync('apps/web/public/brand', { recursive: true })
writeFileSync(OUT, Buffer.from(result.url.split(',')[1], 'base64'))
await browser.close()

console.log(`wrote ${OUT} (${result.w}x${result.h}, aspect ${(result.w / result.h).toFixed(3)})`)
