import { launchChrome, LANDING_URL } from './_browser.mjs'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
try { await page.goto(LANDING_URL, { waitUntil: 'commit', timeout: 30000 }) } catch (e) { console.log('goto:', e.message.split('\n')[0]) }
await page.waitForFunction(() => { const h = document.querySelector('h1'); return h && parseFloat(getComputedStyle(h).fontSize) > 60 }, { timeout: 30000 })
const eye = page.getByRole('img', { name: /olho do BetV/i }).first()
await eye.scrollIntoViewIfNeeded()
await page.waitForTimeout(1500)
const box = await eye.boundingBox()
const clip = box
  ? { x: Math.max(0, box.x - 30), y: Math.max(0, box.y - 30), width: box.width + 60, height: box.height + 60 }
  : { x: 0, y: 200, width: 700, height: 480 }
const canvases = await page.evaluate(() => Array.from(document.querySelectorAll('canvas')).map((c) => ({ w: c.width, h: c.height })))
console.log('canvases:', JSON.stringify(canvases))
for (let i = 0; i < 10; i++) {
  await page.screenshot({ path: `C:/tmp/betv-tweaks/eye-${i}.png`, clip })
  await page.waitForTimeout(700)
}
console.log('done; box=', JSON.stringify(box))
await browser.close()
