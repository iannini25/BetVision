// 2x close-up of a scroll region or element selector for judging fine craft.
// Usage: node scripts/region-shot.mjs <out> <scrollY> [selector]
import { launchChrome, LANDING_URL } from './_browser.mjs'

const [, , out, scrollArg, selector] = process.argv
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await page.goto(LANDING_URL, { waitUntil: 'networkidle', timeout: 30000 })
await page.evaluate((y) => window.scrollTo(0, parseInt(y, 10) || 0), scrollArg || '0')
await page.waitForTimeout(5000)
if (selector) {
  await page.locator(selector).first().screenshot({ path: out })
} else {
  await page.screenshot({ path: out })
}
console.log('wrote', out)
await browser.close()
