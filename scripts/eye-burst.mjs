// Tall viewport so the hero eye is on-screen WITHOUT scrolling (avoids Lenis flakiness).
// Burst the eye, auto-pick the balled-V frame (highest centre brightness).
import { launchChrome, LANDING_URL } from './_browser.mjs'
import { writeFileSync } from 'node:fs'

const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 1700 }, deviceScaleFactor: 2 })
await page.goto(LANDING_URL, { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(4500)
const eye = page.locator('[aria-label^="O olho do BetV"]').first()
const b = await eye.boundingBox()
if (!b) {
  console.log('NO_EYE')
  await browser.close()
  process.exit(0)
}
const clip = { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) }
const frames = []
for (let i = 0; i < 40; i++) {
  frames.push(await page.screenshot({ clip }))
  await page.waitForTimeout(120)
}
let best = 0
let bestV = -1
let worst = 0
let worstV = Infinity
for (let k = 0; k < frames.length; k++) {
  const v = await page.evaluate(async (u) => {
    const img = new Image()
    img.src = u
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const x = c.getContext('2d')
    x.drawImage(img, 0, 0)
    const bw = Math.round(c.width * 0.14)
    const bh = Math.round(c.height * 0.26)
    const d = x.getImageData(Math.round(c.width / 2 - bw / 2), Math.round(c.height / 2 - bh / 2), bw, bh).data
    let s = 0
    for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]
    return s
  }, `data:image/png;base64,${frames[k].toString('base64')}`)
  if (v > bestV) {
    bestV = v
    best = k
  }
  if (v < worstV) {
    worstV = v
    worst = k
  }
}
writeFileSync('C:/tmp/betv-v3/blink-ball.png', frames[best])
writeFileSync('C:/tmp/betv-v3/blink-open.png', frames[worst])
console.log(`balled=${best} (${bestV})  open=${worst} (${worstV})  ratio=${(bestV / worstV).toFixed(2)}`)
await browser.close()
