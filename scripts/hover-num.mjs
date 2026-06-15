// Hover a stat number and screenshot the cards row, to verify the purple cursor glow.
import { launchChrome, LANDING_URL } from './_browser.mjs'

const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 })
await page.goto(LANDING_URL, { waitUntil: 'networkidle', timeout: 30000 })
await page.evaluate(() => document.getElementById('problema')?.scrollIntoView({ block: 'center' }))
await page.waitForTimeout(3500)
const num = page.getByText('+80%', { exact: false }).first()
const box = await num.boundingBox()
if (box) {
  // move into the centre of the number, then a touch off-centre so the glow is visibly offset
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.42, { steps: 4 })
}
await page.waitForTimeout(500)
await page.screenshot({ path: 'C:/tmp/betv-v3/cards-hover.png', clip: { x: 0, y: 350, width: 1440, height: 420 } })
console.log('wrote cards-hover.png')
await browser.close()
