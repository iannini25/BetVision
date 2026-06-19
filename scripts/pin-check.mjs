// Validates the Probabilidades pin+scrub: scrolls into the pinned range at several points,
// records the pinned panel's top (should stay ~constant = no desync), and screenshots each.
import { chromium } from 'playwright-core'

const url = 'http://localhost:3005/landing'
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const problems = []
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`[error] ${m.text()}`)
})
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

const scrollTo = async (y) => {
  await page.evaluate((yy) => {
    const w = window
    if (w.__lenis) w.__lenis.scrollTo(yy, { immediate: true })
    else w.scrollTo(0, yy)
  }, y)
  await page.waitForTimeout(700)
}

// find the section top in document space
const sectionTop = await page.evaluate(() => {
  const el = document.querySelector('#probabilidades')
  return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : 0
})

const panelTop = () =>
  page.evaluate(() => {
    const el = document.querySelector('#probabilidades > div')
    return el ? Math.round(el.getBoundingClientRect().top) : null
  })
const pct = () =>
  page.evaluate(() => document.querySelector('#probabilidades .tabular-nums')?.textContent ?? '?')

const points = [
  { name: 'start', y: sectionTop + 5 },
  { name: 'mid', y: sectionTop + 760 },
  { name: 'end', y: sectionTop + 1480 },
  { name: 'after', y: sectionTop + 1700 },
]

console.log(`sectionTop=${sectionTop}`)
for (const p of points) {
  await scrollTo(p.y)
  const top = await panelTop()
  const ringPct = await pct()
  await page.screenshot({ path: `C:/tmp/shots/pin-${p.name}.png` })
  console.log(`  ${p.name.padEnd(6)} scrollY=${p.y}  panelTop=${top}px  ring=${ringPct}`)
}

console.log(`CONSOLE_ERRORS=${problems.length}`)
problems.slice(0, 10).forEach((p) => console.log('  ' + p.slice(0, 160)))
await browser.close()
