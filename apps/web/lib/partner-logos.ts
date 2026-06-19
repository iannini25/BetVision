import 'server-only'
import fs from 'node:fs'
import path from 'node:path'

export type PartnerLogo = { src: string; name: string }

const DIR = path.join(process.cwd(), 'public', 'partner-logos')
const IMAGE_RE = /\.(svg|png|webp|jpe?g)$/i
const EXT_RE = /\.[^.]+$/ // trailing extension — kept separate from IMAGE_RE so a future anchor on IMAGE_RE can't break name-stripping

/** Human label from a filename: drop the extension, a leading `placeholder-`, and any numeric
 *  sort prefix; turn separators into spaces. Falls back to the raw filename. */
function displayName(file: string): string {
  return (
    file
      .replace(EXT_RE, '')
      .replace(/^placeholder[-_]/i, '')
      .replace(/^\d+[-_]?/, '')
      .replace(/[-_]+/g, ' ')
      .trim() || file
  )
}

/**
 * Reads `public/partner-logos/` and returns every image in it, alphabetically. Anything
 * non-image (README, etc.) is ignored. Server-only (uses fs) — call it from a Server
 * Component (the landing page) and pass the result down as a prop.
 *
 * Drop a logo file in that folder and it appears in the hero marquee with no code change.
 */
export function getPartnerLogos(): PartnerLogo[] {
  let files: string[]
  try {
    files = fs.readdirSync(DIR)
  } catch {
    return [] // folder missing → marquee renders nothing
  }
  return files
    .filter((f) => IMAGE_RE.test(f))
    .sort((a, b) => a.localeCompare(b))
    .map((f) => ({ src: `/partner-logos/${f}`, name: displayName(f) }))
}
