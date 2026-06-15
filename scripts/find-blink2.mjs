import { launchChrome } from './_browser.mjs'
import { readFileSync, readdirSync } from 'node:fs'
const dir = 'C:/tmp/betv-tweaks'
const files = readdirSync(dir).filter((f) => /^bl2-\d\d\.png$/.test(f)).sort()
const browser = await launchChrome()
const page = await browser.newPage()
const results = []
for (const f of files) {
  const b64 = readFileSync(`${dir}/${f}`).toString('base64')
  const m = await page.evaluate(async (dataUrl) => {
    const img = new Image(); await new Promise((res) => { img.onload = res; img.src = dataUrl })
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0)
    const { data, width, height } = ctx.getImageData(0, 0, width0(), height0())
    function width0(){return cv.width} function height0(){return cv.height}
    // peak local density: max bright-pixel count in any 24x24 cell
    const cs = 24, gw = Math.ceil(width / cs), gh = Math.ceil(height / cs)
    const grid = new Int32Array(gw * gh)
    let total = 0
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (data[i] > 90 && data[i + 2] > 120 && (data[i] + data[i + 1] + data[i + 2]) > 320) {
        grid[Math.floor(y / cs) * gw + Math.floor(x / cs)]++; total++
      }
    }
    let peak = 0; for (let k = 0; k < grid.length; k++) if (grid[k] > peak) peak = grid[k]
    return { peak, total, conc: total ? peak / total : 0 }
  }, `data:image/png;base64,${b64}`)
  results.push({ f, ...m })
}
const byConc = results.slice().sort((a, b) => b.conc - a.conc)
console.log('MOST concentrated (ball/blink):'); byConc.slice(0,4).forEach(r=>console.log(`  ${r.f} conc=${r.conc.toFixed(3)} peak=${r.peak}`))
console.log('LEAST (open):'); byConc.slice(-3).forEach(r=>console.log(`  ${r.f} conc=${r.conc.toFixed(3)} peak=${r.peak}`))
await browser.close()
