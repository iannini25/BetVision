# Design

Visual system for the BetV **landing v2** (`apps/web/components/landing/v2/`, scoped via
`landing.module.css`). Tokens live in `apps/web/app/globals.css` (`:root`). This captures the
real shipped system; identity-committed choices are flagged so future passes don't "fix" them.

## Theme

Dark "terminal de inteligência cósmico": deep navy base, **violet-dominant**, with a
particle/eye motif (the logo reconstructed in living particles on one persistent R3F canvas).
Color strategy: **Committed** dark — violet carries the surface; green is a surgical accent
(live/value + the logo's "i" dot); amber is a rare Copa accent. Not light, not cream: a bettor
in a hype moment, mobile, scanning fast — the dark stage makes the violet glow and the data pop.

## Color (OKLCH-friendly hexes from globals.css)

- **Backgrounds:** `--bg-deep #06080F` (body), `--bg-card #111729`, `--bg-card-2 #18203A`.
- **Text:** `--text-hi #F4F6FB`, `--text-mid #9AA3B8`, `--text-low #8893AC` (AA: 5.78:1 on card).
- **Brand (violet):** `--brand-1 #7C3AED` → `--brand-2 #A855F7` → `--brand-3 #D946EF`;
  `--brand-soft #A78BFA`. The 105° gradient is the brand signature.
- **Accent (green):** `--accent #22C55E`, `--accent-hi #4ADE80` — ao vivo / VALOR / i-dot only.
- **Copa amber (rare):** `--warn #FBBF24` — at most one section, never a wash.
- **Lines:** `--line rgba(148,163,255,0.10)`, `--line-strong rgba(148,163,255,0.18)`.

## Typography (identity-committed; keep)

- **Display:** **Sora** (`font-display`) — oversized, extrabold, `tracking-[-0.03em]`, fluid
  `clamp()`, `text-balance` on headings.
- **Body:** **Inter** (`--font-body`).
- **Mono:** **JetBrains Mono** (`font-mono`) — labels, tabular numbers, compliance microlines.
- **Editorial:** **Instrument Serif** italic (`--font-editorial`, scoped to the landing) — the
  highlight system's "negated / what-it's-NOT" word.

**Highlight system (deliberate, meaning-mapped — NOT decorative):**
- `GradientWord` = brand gradient on product nouns = *what the product IS*.
- `EditorialWord` = serif italic on negated/emotional words = *what it's NOT*.
  Max 1–2 highlights per section. (Note: the shared "no gradient text" ban targets *decorative*
  clip-text; here it's a committed semantic system — identity-preservation wins. Keep it rare.)

## Components

- **BetvLogo** (`betv-logo.tsx`) — the **real** logo (eye mark), processed from `BetV-logo.png`
  by `scripts/process-logo.mjs` (alpha-keyed, trimmed) → `/brand/betv-logo.png`. Used in
  header, footer, checkout, and as the hero eye's static/fallback core. Never re-invent the mark.
- **EyePortal** (`eye-portal.tsx`) — the hero eye: crisp real-logo core + a living **particle
  aura** (sampled pixel-by-pixel from the logo) echoing the almond shape; the green "i" dot is a
  glowing jewel. Anchors the shared stage orb; `interactive` (particles repel from cursor).
- **LandingStage / Orb** (`landing-stage.tsx`) — ONE persistent orthographic R3F canvas
  (1px=1unit) hosting the particle eye that **travels and dissolve→reforms** between sections
  (no remount). fiber8⇄three0.184 bridged by local `r()/tex()` helpers — do not replace.
- **PreviewPredicao** (`preview-predicao.tsx`) — live prediction dashboard: WAI-ARIA tablist
  (Hoje/Ao vivo/Valor, Iconsax), glass card with ticking numbers + "ao vivo" pulse, always
  carrying "demonstração / valor estimado / não é recomendação / 18+".
- **MagneticButton** — CTA that drifts to cursor; optional `trailingIcon` in a nested circle
  (button-in-button). Primary = violet gradient; ghost = hairline.
- **Highlight** (`GradientWord` / `EditorialWord`), **StatCountUp**, live **chips**.

## Layout

- Single persistent fixed canvas (`z-[1]`) behind content (`z-10`); sections are `min-h-[100svh]`
  / generous `py-24+`, centered, `max-w-[1080–1180px]`. Funnel CTAs everywhere: same label
  "Garantir meu passe" → `/checkout`; "Entrar" → `/login`. No `href="#"`.
- Backgrounds: violet-dominant **aurora** (`heroAurora`) + horizon glow + grain; per-section
  atmosphere planned (scene system) so no section is flat.

## Motion

GSAP + ScrollTrigger + Lenis (single scroll source). Ambitious first-load hero timeline
(word-mask reveal). The eye **dissolve→reform** is the signature transition (time-driven,
reversible, staggered). Reveal-on-scroll per section (enhances already-visible content). Cursor
repel, card tilt/parallax, magnetic CTAs. Curves: ease-out (expo/quart), custom cubic-beziers;
no bounce. **All motion gated on `prefers-reduced-motion`** (off → static); canvas pauses on
hidden tab; DPR ≤ 2; transform/opacity only. **Iconography: Iconsax only** (`iconsax-reactjs`).
