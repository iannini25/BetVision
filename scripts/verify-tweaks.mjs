// Verify the 5 landing finishing tweaks: bigger demo, marquee placement + "funciona com",
// CTA white-orbe hover, "no escuro" spacing, nav translucent/lower.
import { launchChrome, LANDING_URL } from './_browser.mjs'

const dir = process.argv[2] || 'C:/tmp/betv-tweaks'
const browser = await launchChrome()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 })
await page.goto(LANDING_URL, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2800)

// 1) Full hero region (nav + headline + marquee + demo) — top 1800px logical
await page.screenshot({ path: `${dir}/01-hero-full.png`, clip: { x: 0, y: 0, width: 1440, height: 1200 } })

// 2) Nav close-up (translucency + lower position)
await page.screenshot({ path: `${dir}/02-nav.png`, clip: { x: 0, y: 0, width: 1440, height: 120 } })

// 3) Marquee "funciona com" close-up — locate it
const marquee = page.getByText('Funciona com', { exact: false }).first()
try {
  const box = await marquee.boundingBox()
  if (box) {
    await page.screenshot({
      path: `${dir}/03-marquee.png`,
      clip: { x: 0, y: Math.max(0, box.y - 20), width: 1440, height: 160 },
    })
  }
} catch (e) {
  console.log('marquee not found:', e.message)
}

// 4) CTA rest
const cta = page.locator('a[aria-label="Garantir meu passe"]').first()
await cta.scrollIntoViewIfNeeded()
await page.waitForTimeout(300)
await cta.screenshot({ path: `${dir}/04-cta-rest.png` })

// 5) CTA hover — mid sweep and settled
await cta.hover()
await page.waitForTimeout(180)
await cta.screenshot({ path: `${dir}/05-cta-hover-mid.png` })
await page.waitForTimeout(500)
await cta.screenshot({ path: `${dir}/06-cta-hover-end.png` })

console.log('done ->', dir)
await browser.close()
