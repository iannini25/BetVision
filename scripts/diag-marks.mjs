import { launchChrome, LANDING_URL } from './_browser.mjs'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
try { await page.goto(LANDING_URL, { waitUntil: 'commit', timeout: 30000 }) } catch (e) { console.log('goto:', e.message.split('\n')[0]) }
await page.waitForSelector('[data-eyebrow]', { state: 'attached', timeout: 30000 })
await page.waitForTimeout(3000)

// find the "no escuro" line box
const word = page.getByText('no escuro', { exact: false }).first()
const box = await word.boundingBox()
const clip = box
  ? { x: Math.max(0, box.x - 120), y: Math.max(0, box.y - 70), width: Math.min(1440, box.width + 240), height: box.height + 150 }
  : { x: 0, y: 120, width: 1440, height: 360 }

await page.screenshot({ path: 'C:/tmp/betv-tweaks/diag-0-base.png', clip })

// A) hide reactive-background canvas (particle field)
await page.evaluate(() => { document.querySelectorAll('canvas').forEach((c) => { if (c.closest('[class*="z--10"]') || c.parentElement?.className?.includes?.('fixed')) c.style.display = 'none' }) })
// fallback: hide the fixed bg canvas specifically (first canvas in the -z-10 fixed layer)
await page.evaluate(() => { const bg = document.querySelector('.fixed.inset-0'); if (bg) bg.querySelectorAll('canvas').forEach((c) => (c.style.display = 'none')) })
await page.waitForTimeout(300)
await page.screenshot({ path: 'C:/tmp/betv-tweaks/diag-1-no-bgcanvas.png', clip })

// B) also hide HeroSilk svg sparkles
await page.evaluate(() => { document.querySelectorAll('svg').forEach((s) => { if (s.querySelector('circle')) s.style.display = 'none' }) })
await page.waitForTimeout(300)
await page.screenshot({ path: 'C:/tmp/betv-tweaks/diag-2-no-sparkles.png', clip })

// C) also hide the whole HeroSilk root + its rays
await page.evaluate(() => { document.querySelectorAll('[class*="h-\[160vh\]"]').forEach((e) => (e.style.display = 'none')) })
await page.waitForTimeout(300)
await page.screenshot({ path: 'C:/tmp/betv-tweaks/diag-3-no-silk.png', clip })

console.log('done; box=', JSON.stringify(box))
await browser.close()
