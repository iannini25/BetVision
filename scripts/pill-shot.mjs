import { launchChrome, LANDING_URL } from './_browser.mjs'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 })
try {
  await page.goto(LANDING_URL, { waitUntil: 'commit', timeout: 30000 })
} catch (e) { console.log('goto:', e.message.split('\n')[0]) }
await page.waitForSelector('[data-eyebrow]', { state: 'attached', timeout: 30000 })
await page.waitForTimeout(2800)
const pill = page.locator('[data-eyebrow]').first()
for (let i = 0; i < 5; i++) {
  await pill.screenshot({ path: `C:/tmp/betv-tweaks/pill-${i}.png` })
  await page.waitForTimeout(700)
}
const box = await pill.boundingBox()
if (box) {
  await page.screenshot({
    path: 'C:/tmp/betv-tweaks/pill-context.png',
    clip: { x: Math.max(0, box.x - 80), y: Math.max(0, box.y - 30), width: 760, height: 360 },
  })
}
console.log('done; box=', JSON.stringify(box))
await browser.close()
