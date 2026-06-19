import { launchChrome, LANDING_URL } from './_browser.mjs'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 })
try { await page.goto(LANDING_URL, { waitUntil: 'commit', timeout: 30000 }) } catch (e) {}
await page.waitForFunction(() => { const h = document.querySelector('h1'); return h && parseFloat(getComputedStyle(h).fontSize) > 60 }, { timeout: 30000 })
const eye = page.getByRole('img', { name: /olho do BetV/i }).first()
await eye.scrollIntoViewIfNeeded()
await page.waitForTimeout(900)
const box = await eye.boundingBox()
const clip = box ? { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.width, height: box.height } : null
for (let i = 0; i < 28; i++) {
  await page.screenshot({ path: `C:/tmp/betv-tweaks/tb-${String(i).padStart(2,'0')}.png`, clip })
  await page.waitForTimeout(110)
}
console.log('captured')
await browser.close()
