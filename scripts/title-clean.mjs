import { launchChrome, LANDING_URL } from './_browser.mjs'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
try { await page.goto(LANDING_URL, { waitUntil: 'commit', timeout: 30000 }) } catch (e) { console.log('goto:', e.message.split('\n')[0]) }
// wait until the module CSS is actually applied (H1 reaches its large display size)
await page.waitForFunction(() => {
  const h = document.querySelector('h1')
  if (!h) return false
  return parseFloat(getComputedStyle(h).fontSize) > 60
}, { timeout: 30000 })
await page.waitForTimeout(2500)
const word = page.getByText('no escuro', { exact: false }).first()
const box = await word.boundingBox()
const clip = box
  ? { x: Math.max(0, box.x - 150), y: Math.max(0, box.y - 90), width: Math.min(1440, box.width + 300), height: box.height + 200 }
  : { x: 0, y: 200, width: 1440, height: 380 }
for (let i = 0; i < 3; i++) {
  await page.screenshot({ path: `C:/tmp/betv-tweaks/clean-${i}.png`, clip })
  await page.waitForTimeout(1100)
}
console.log('done; box=', JSON.stringify(box))
await browser.close()
