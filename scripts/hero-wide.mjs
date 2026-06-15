import { launchChrome, LANDING_URL } from './_browser.mjs'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 })
try { await page.goto(LANDING_URL, { waitUntil: 'commit', timeout: 30000 }) } catch (e) { console.log('goto:', e.message.split('\n')[0]) }
await page.waitForFunction(() => { const h = document.querySelector('h1'); return h && parseFloat(getComputedStyle(h).fontSize) > 60 }, { timeout: 30000 })
await page.waitForTimeout(2500)
await page.screenshot({ path: 'C:/tmp/betv-tweaks/hero-wide.png', clip: { x: 0, y: 0, width: 1440, height: 950 } })
console.log('done')
await browser.close()
