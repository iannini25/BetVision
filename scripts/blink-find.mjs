// Measure each captured blink frame's bright-pixel bounding-box HEIGHT. When the V balls up,
// the lit area is much shorter — so the smallest-height frame is the blink peak.
import { launchChrome } from './_browser.mjs'
import { readdirSync, readFileSync } from 'node:fs'

const dir = 'C:/tmp/betv-v3'
const files = readdirSync(dir).filter((f) => /^blink-\d+\.png$/.test(f)).sort()
const browser = await launchChrome()
const page = await browser.newPage()
const results = []
for (const f of files) {
  const b64 = readFileSync(`${dir}/${f}`).toString('base64')
  const h = await page.evaluate(async (dataUrl) => {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let minY = c.height
    let maxY = 0
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x += 3) {
        const i = (y * c.width + x) * 4
        // bright particle (the violet points are well above the dark bg)
        if (d[i] + d[i + 1] + d[i + 2] > 230) {
          if (y < minY) minY = y
          if (y > maxY) maxY = y
          break
        }
      }
    }
    return maxY > minY ? maxY - minY : 0
  }, `data:image/png;base64,${b64}`)
  results.push({ f, h })
}
results.sort((a, b) => a.h - b.h)
console.log('shortest bright-area (most balled) first:')
for (const r of results.slice(0, 5)) console.log(`  ${r.f}  height=${r.h}`)
console.log('tallest (fully open):')
for (const r of results.slice(-2)) console.log(`  ${r.f}  height=${r.h}`)
await browser.close()
