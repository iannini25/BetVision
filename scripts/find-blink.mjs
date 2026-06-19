import { launchChrome } from './_browser.mjs'
import { readFileSync, readdirSync } from 'node:fs'
const dir = 'C:/tmp/betv-tweaks'
const files = readdirSync(dir).filter((f) => /^blink-\d\d\.png$/.test(f)).sort()
const browser = await launchChrome()
const page = await browser.newPage()
const results = []
for (const f of files) {
  const b64 = readFileSync(`${dir}/${f}`).toString('base64')
  const m = await page.evaluate(async (dataUrl) => {
    const img = new Image()
    await new Promise((res) => { img.onload = res; img.src = dataUrl })
    const cv = document.createElement('canvas')
    cv.width = img.width; cv.height = img.height
    const ctx = cv.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const { data, width, height } = ctx.getImageData(0, 0, cv.width, cv.height)
    const cx = width / 2, cy = height / 2
    const rCore = Math.min(width, height) * 0.14 // central disc
    let core = 0, total = 0
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4
        // bright bluish-violet particle pixel
        const bright = data[i] > 90 && data[i + 2] > 120 && (data[i] + data[i + 1] + data[i + 2]) > 320
        if (!bright) continue
        total++
        const dx = x - cx, dy = y - cy
        if (dx * dx + dy * dy < rCore * rCore) core++
      }
    }
    return { total, core, ratio: total ? core / total : 0 }
  }, `data:image/png;base64,${b64}`)
  results.push({ f, ...m })
}
results.sort((a, b) => b.ratio - a.ratio)
console.log('TOP central-concentration (likely blink/ball):')
results.slice(0, 5).forEach((r) => console.log(`  ${r.f}  ratio=${r.ratio.toFixed(3)} core=${r.core} total=${r.total}`))
console.log('LOWEST (eye wide open):')
results.slice(-3).forEach((r) => console.log(`  ${r.f}  ratio=${r.ratio.toFixed(3)}`))
await browser.close()
