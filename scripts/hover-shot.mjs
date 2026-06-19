// Hover the primary hero CTA and screenshot, to verify the line-rip hover.
import { launchChrome, LANDING_URL } from './_browser.mjs'

const out = process.argv[2] || 'C:/tmp/betv-hero/cta-hover.png'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await page.goto(LANDING_URL, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2500)
const cta = page.locator('a[aria-label="Garantir meu passe"]').first()
await cta.hover()
await page.waitForTimeout(700) // mid-sweep of the rip animation
await cta.screenshot({ path: out })
console.log('wrote', out)
await browser.close()
