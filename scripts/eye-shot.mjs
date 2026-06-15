// Close-up of the hero eye element (the [role=img] eye) at 2x for judging the hybrid look.
import { launchChrome, LANDING_URL } from './_browser.mjs'

const out = process.argv[2] || 'C:/tmp/betv-hero/eye-close.png'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })
await page.goto(LANDING_URL, { waitUntil: 'networkidle', timeout: 30000 })
await page.evaluate(() => window.scrollTo(0, 760))
await page.waitForTimeout(5000)
const el = await page.locator('[aria-label^="O olho do BetV"]').first()
await el.screenshot({ path: out })
console.log('wrote', out)
await browser.close()
