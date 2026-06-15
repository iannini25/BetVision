import { launchChrome, LANDING_URL } from './_browser.mjs'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 })
try { await page.goto(LANDING_URL, { waitUntil: 'commit', timeout: 30000 }) } catch (e) {}
await page.waitForFunction(() => { const h = document.querySelector('h1'); return h && parseFloat(getComputedStyle(h).fontSize) > 60 }, { timeout: 30000 })
const eye = page.getByRole('img', { name: /olho do BetV/i }).first()
await eye.scrollIntoViewIfNeeded()
await page.waitForTimeout(800)
const box = await eye.boundingBox()
const clip = box ? { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.width, height: box.height } : null
// rapid burst ~140ms for ~7s to catch the V->ball blink
let minSpread = 1e9, minIdx = -1
for (let i = 0; i < 50; i++) {
  await page.screenshot({ path: `C:/tmp/betv-tweaks/blink-${String(i).padStart(2,'0')}.png`, clip })
  await page.waitForTimeout(140)
}
console.log('done')
await browser.close()
