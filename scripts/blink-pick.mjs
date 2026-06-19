// From blink-*.png (eye-region frames), pick the balled-V frame = highest centre brightness,
// and the most-open = lowest. Copies them out for inspection.
import { launchChrome } from './_browser.mjs'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const dir = 'C:/tmp/betv-v3'
const files = readdirSync(dir).filter((f) => /^blink-\d+\.png$/.test(f)).sort()
const browser = await launchChrome()
const page = await browser.newPage()
const vals = []
for (const f of files) {
  const v = await page.evaluate(async (dataUrl) => {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const bw = Math.round(c.width * 0.16)
    const bh = Math.round(c.height * 0.24)
    const d = ctx.getImageData(Math.round(c.width / 2 - bw / 2), Math.round(c.height / 2 - bh / 2), bw, bh).data
    let s = 0
    for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]
    return s
  }, `data:image/png;base64,${readFileSync(`${dir}/${f}`).toString('base64')}`)
  vals.push({ f, v })
}
vals.sort((a, b) => b.v - a.v)
writeFileSync(`${dir}/blink-ball.png`, readFileSync(`${dir}/${vals[0].f}`))
writeFileSync(`${dir}/blink-open.png`, readFileSync(`${dir}/${vals[vals.length - 1].f}`))
console.log('balled =', vals[0].f, 'centre', vals[0].v)
console.log('open   =', vals[vals.length - 1].f, 'centre', vals[vals.length - 1].v)
await browser.close()
