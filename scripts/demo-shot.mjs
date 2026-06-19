import { launchChrome, LANDING_URL } from './_browser.mjs'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await page.goto(LANDING_URL, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2800)
const demo = page.getByText('demonstração', { exact: false }).first()
const box = await demo.boundingBox()
const y = box ? Math.max(0, box.y - 60) : 1200
await page.evaluate((sy) => window.scrollTo(0, sy), y - 100)
await page.waitForTimeout(1200)
await page.screenshot({ path: 'C:/tmp/betv-tweaks/07-demo.png', clip: { x: 0, y: 0, width: 1440, height: 900 } })
console.log('done')
await browser.close()
