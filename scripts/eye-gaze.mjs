// Verify 2D gaze (V offsets toward the cursor) + try to catch a blink (V balled up).
import { launchChrome, LANDING_URL } from './_browser.mjs'

const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })
await page.goto(LANDING_URL, { waitUntil: 'networkidle', timeout: 30000 })
await page.evaluate(() => window.scrollTo(0, 700))
await page.waitForTimeout(3500)
const eye = page.locator('[aria-label^="O olho do BetV"]').first()
const b = await eye.boundingBox()
if (!b) {
  console.log('eye not found')
  await browser.close()
  process.exit(0)
}
const cx = b.x + b.width / 2
const cy = b.y + b.height / 2

async function shot(name) {
  await eye.screenshot({ path: `C:/tmp/betv-v3/eye-${name}.png` })
}

// neutral (mouse far away / centered on eye)
await page.mouse.move(cx, cy)
await page.waitForTimeout(1400)
await shot('neutral')

// look top-right
await page.mouse.move(b.x + b.width * 1.4, b.y - b.height * 0.6, { steps: 6 })
await page.waitForTimeout(1500)
await shot('topright')

// look bottom-left
await page.mouse.move(b.x - b.width * 0.4, b.y + b.height * 1.6, { steps: 6 })
await page.waitForTimeout(1500)
await shot('bottomleft')

// blink burst: ~6s of frames to catch the V balled up
await page.mouse.move(cx, cy)
for (let i = 0; i < 26; i++) {
  await page.screenshot({ path: `C:/tmp/betv-v3/blink-${String(i).padStart(2, '0')}.png`, clip: { x: b.x, y: b.y, width: b.width, height: b.height } })
  await page.waitForTimeout(260)
}
console.log('done eye shots')
await browser.close()
