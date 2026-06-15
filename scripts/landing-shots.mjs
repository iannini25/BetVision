// Landing validation tool: navigates /landing in real Chrome (WebGL on), optionally
// scrolls to a section, screenshots, and reports console errors/warnings + page errors.
// Usage: node scripts/landing-shots.mjs <width> <height> <scrollSelectorOrPx> <outPath> [waitMs]
import { launchChrome, LANDING_URL } from './_browser.mjs'

const [, , wArg, hArg, scrollArg, outPath, waitArg] = process.argv
const width = parseInt(wArg || '1440', 10)
const height = parseInt(hArg || '900', 10)
const waitMs = parseInt(waitArg || '3500', 10)
const url = LANDING_URL

const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })

const problems = []
page.on('console', (m) => {
  const type = m.type()
  if (type === 'error' || type === 'warning') problems.push(`[${type}] ${m.text()}`)
})
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`))

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

if (scrollArg && scrollArg !== '0' && scrollArg !== 'top') {
  await page.evaluate((arg) => {
    const isPx = /^\d+$/.test(arg)
    let y
    if (isPx) y = parseInt(arg, 10)
    else {
      const el = document.querySelector(arg)
      const r = el ? el.getBoundingClientRect() : null
      // scroll the section's center toward the viewport center
      y = r ? r.top + window.scrollY - (window.innerHeight - r.height) / 2 : 0
      if (y < 0) y = el ? el.getBoundingClientRect().top + window.scrollY : 0
    }
    const w = window
    if (w.__lenis) w.__lenis.scrollTo(y, { immediate: true })
    else w.scrollTo(0, y)
  }, scrollArg)
}

await page.waitForTimeout(waitMs)
await page.screenshot({ path: outPath })

const filtered = problems.filter(
  (p) => !/Download the React DevTools|Lighthouse|favicon|font.*preload|was preloaded using/i.test(p)
)
console.log(`SHOT ${outPath} @ ${width}x${height} scroll=${scrollArg || 'top'}`)
console.log(`CONSOLE_ISSUES=${filtered.length}`)
for (const p of filtered.slice(0, 25)) console.log('  ' + p.slice(0, 200))

await browser.close()
