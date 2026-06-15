import { launchChrome } from './_browser.mjs'
import { readFileSync, readdirSync } from 'node:fs'
const dir = 'C:/tmp/betv-tweaks'
const files = readdirSync(dir).filter((f) => /^tb-\d\d\.png$/.test(f)).sort()
const browser = await launchChrome()
const page = await browser.newPage()
const results = []
for (const f of files) {
  const b64 = readFileSync(`${dir}/${f}`).toString('base64')
  const m = await page.evaluate(async (dataUrl) => {
    const img = new Image(); await new Promise((r) => { img.onload = r; img.src = dataUrl })
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0)
    const W = cv.width, H = cv.height
    const { data } = ctx.getImageData(0, 0, W, H)
    // bright particle core pixels (strict)
    const pts = []
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4
      if (data[i] > 120 && data[i + 2] > 150 && data[i] + data[i + 1] + data[i + 2] > 430) pts.push([x, y])
    }
    if (pts.length < 30) return { spread: 1e9, n: pts.length }
    let mx = 0, my = 0; for (const [x, y] of pts) { mx += x; my += y } mx /= pts.length; my /= pts.length
    let v = 0; for (const [x, y] of pts) v += (x - mx) ** 2 + (y - my) ** 2
    return { spread: Math.sqrt(v / pts.length), n: pts.length }
  }, `data:image/png;base64,${b64}`)
  results.push({ f, ...m })
}
const s = results.slice().sort((a, b) => a.spread - b.spread)
console.log('MOST balled (smallest spread):'); s.slice(0, 5).forEach((r) => console.log(`  ${r.f} spread=${r.spread.toFixed(1)} n=${r.n}`))
console.log('MOST open (largest spread):'); s.slice(-3).forEach((r) => console.log(`  ${r.f} spread=${r.spread.toFixed(1)} n=${r.n}`))
await browser.close()
