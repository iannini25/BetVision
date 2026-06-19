# Partner logos — auto-loaded marquee

Drop logo files in **this folder** and they appear automatically in the hero marquee
(`components/landing/v2/partner-logos-marquee.tsx`), no code change needed.

- **Accepted formats:** `.svg`, `.png`, `.webp`, `.jpg` / `.jpeg`. Anything else (like this
  README) is ignored by the loader.
- **Treatment:** rendered **grayscale**, uniform height, equal spacing, with a soft fade at
  both edges. Neutral by design — the marquee endorses no specific brand or betting house
  (compliance: informational/example only).
- **Order:** alphabetical by filename. Prefix with `01-`, `02-`… to control it.
- **Art:** prefer monochrome / single-color SVGs (they read best once desaturated). Tall,
  full-color raster logos still work but look heavier.

The three `placeholder-*.svg` files here are neutral, made-up marks just to demonstrate the
strip. **Delete them and add the real partner logos before launch.**
