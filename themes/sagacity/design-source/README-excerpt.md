# Operator-facing artifact pages

Sources for the published claude.ai artifact pages, in the operator's site style
(adaburrows.com / Creative Sagacity: fixed leaf photograph, white header strip and translucent cards,
Patua One headings / Spinnaker body / Courier Prime monospace, a Dark toggle whose tokens keep
each light colour's hue and meaning in a lighter shade, over the John Day / Columbia River photograph, no other JavaScript unless a
capability needs it).
Convention: know-operator-artifact-style.

## One shared style

Every page is built from the same frame, so pages cannot drift apart:

- `assets/site.css`: the tokens for light and dark (`:root` and `:root[data-nh="dark"]`, each dark
  token the same hue as its light one in a shade passing WCAG AA (4.5:1) on the dark card over the
  photo's brightest pixel (operator 2026-11-05: green stays green, red stays red), a night-blue sky,
  cards and strip at 0.7 alpha; background `--photo` is `assets/leaf.jpg` in light and
  `assets/river-dark.jpg` as-is in dark; the logo recoloured) and the base styles (strip, cards,
  headings, links, diagrams).
- `assets/diagram-dark.js`: recolours a light diagram SVG for dark, keeping every hue (a light site
  token becomes its dark token; other colours keep OKLCH hue and chroma on a lightness curve).
- `assets/site-header.html`: the header strip (title, subtitle, optional meta line, Dark toggle, logo).
- `assets/site-toggle.js`: the toggle; the viewer's choice is kept in `localStorage` (`nh-theme`).

`build-page.py` prepends the stylesheet and font link, replaces the template's one
`<!--site-header ...-->` block (`title:`, `subtitle:`, optional `meta:` lines) with the strip, and
appends the toggle. A template carries only its `<title>`, its own `<style>` written in the shared
tokens (no literal colour that reads in one theme only; translucent accents via
`color-mix(in srgb, var(--token) N%, transparent)`), the header block and its body. To restyle
every page, edit `assets/` and rebuild each page.
