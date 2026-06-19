import { launchChrome, LANDING_URL } from './_browser.mjs'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 1300 }, deviceScaleFactor: 2 })
await page.goto(LANDING_URL, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2800)
const marquee = page.getByText('Funciona com', { exact: false }).first()
const box = await marquee.boundingBox()
const top = box ? Math.max(0, box.y - 24) : 1000
const clip = { x: 0, y: top, width: 1440, height: 220 }
// three frames across the loop to eyeball continuity (no blank gap, even spacing)
await page.screenshot({ path: 'C:/tmp/betv-tweaks/loop-a.png', clip })
await page.waitForTimeout(6000)
await page.screenshot({ path: 'C:/tmp/betv-tweaks/loop-b.png', clip })
await page.waitForTimeout(6000)
await page.screenshot({ path: 'C:/tmp/betv-tweaks/loop-c.png', clip })
// measure track + tiles to prove -50% == one tile (seamless)
const m = await page.evaluate(() => {
  const track = document.querySelector('.animate-ticker')
  if (!track) return null
  const tiles = track.children
  const t0 = tiles[0].getBoundingClientRect().width
  const t1 = tiles[1].getBoundingClientRect().width
  return { trackScrollW: track.scrollWidth, tile0: Math.round(t0), tile1: Math.round(t1), equal: Math.abs(t0 - t1) < 0.6 }
})
console.log('measure:', JSON.stringify(m))
await browser.close()
