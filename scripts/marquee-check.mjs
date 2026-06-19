import { launchChrome, LANDING_URL } from './_browser.mjs'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 1300 }, deviceScaleFactor: 2 })
await page.goto(LANDING_URL, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2800)

const marquee = page.getByText('Funciona com', { exact: false }).first()
const box = await marquee.boundingBox()
const top = box ? Math.max(0, box.y - 24) : 1000

// frame A
await page.screenshot({ path: 'C:/tmp/betv-tweaks/m1.png', clip: { x: 0, y: top, width: 1440, height: 190 } })
// hover over the strip, wait, frame B — must STILL have advanced (never pauses)
const strip = page.locator('img[alt="Northwind"]').first()
try { await strip.hover() } catch {}
await page.waitForTimeout(1500)
await page.screenshot({ path: 'C:/tmp/betv-tweaks/m2.png', clip: { x: 0, y: top, width: 1440, height: 190 } })

// full region to judge vertical position relative to hero/demo
await page.screenshot({ path: 'C:/tmp/betv-tweaks/m-context.png', clip: { x: 0, y: Math.max(0, top - 320), width: 1440, height: 760 } })
console.log('marquee top(logical)=', Math.round(top))
await browser.close()
