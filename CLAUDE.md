# Wattline tool network

This project is a network of static, no-build-step calculator tools that will
live as subdirectories on one domain (`domain.com/ev-charging-calculator/`,
`domain.com/next-tool/`, etc). `ev-charging-calculator/` is the reference
implementation — every future tool should follow its structure and reuse
its shared files rather than re-inventing them.

## Stack

Static HTML/CSS/vanilla JS. No framework, no build step, no bundler. Every
page is a plain `index.html` that can be opened by any static file server.

Partials (`header.html`, `footer.html`) are injected at runtime via `fetch()`
in `shared/include.js`, which means pages must be served over `http(s)://`
during development — `file://` will fail CORS on the fetch. Run
`python3 -m http.server 8000` from the project root and test at
`http://localhost:8000/<tool>/`. Don't open pages by double-clicking the
HTML file — that loads it over `file://` and breaks both the fetch includes
and (if paths were ever made root-absolute) the stylesheet links.

**Path convention — always relative, scoped to page depth.** Every asset
reference (`<link rel="stylesheet">`, `<script src>`, `[data-include]`) must
be a *relative* path, not root-absolute (`/shared/...`). Root-absolute paths
only resolve correctly when the site is served from a true domain root —
they silently 404 under `file://` and under any subpath deployment (e.g. a
GitHub Pages project URL), which is exactly what causes a page to render
with zero styling (default browser fonts/colors, as if no CSS loaded at
all). Use:
- From `/index.html` (root): `shared/tokens.css`, `shared/header.html`, etc.
- From `/<tool>/index.html` (one level deep): `../shared/tokens.css`,
  `../shared/header.html`, etc. Same-directory files (`style.css`,
  `calculator.js`) stay unqualified.

The one intentional exception is the nav `<a href>` targets inside
`shared/header.html` (`/`, `/ev-charging-calculator/`) — those stay
root-absolute because they represent real site navigation tied to the
eventual domain-root deployment, and they resolve correctly under the
documented local-server workflow above. If a future tool's homepage link
looks broken, confirm you're testing via `http://localhost:8000/`, not
`file://`.

## Directory structure

```
/shared/
  tokens.css     — design tokens (colors, type scale, spacing, radius). Import first, always.
  base.css       — reset, typography, and reusable components (nav, footer, buttons,
                   panel, unit-toggle, accordion, data-table). Import second.
  header.html    — nav partial, injected via [data-include]
  footer.html    — footer partial, injected via [data-include]
  include.js     — the [data-include] partial loader
  units.js       — mi/km/mpg/L-per-100km/gallon/liter conversion helpers
/ev-charging-calculator/
  index.html     — this tool's markup
  style.css      — this tool's page-specific styles only (layout + content unique to it)
  calculator.js  — this tool's math and interaction logic
```

Every future tool gets its own `/tool-slug/` directory with the same three
files (`index.html`, `style.css`, `calculator.js`), and imports
`/shared/tokens.css`, `/shared/base.css`, `/shared/include.js`, and
`/shared/units.js` (if it has distance/fuel inputs) exactly as
`ev-charging-calculator/index.html` does. Do not copy shared CSS into a
tool's own stylesheet — if something feels reusable across tools, it belongs
in `/shared/`, not duplicated.

## Design tokens (`shared/tokens.css`)

**Why these values:** the brief called for a dark utility-meter aesthetic
("electricity meter, not EV-green cliché") that reads as trustworthy and
data-first, not like a marketing landing page. Amber was chosen specifically
to evoke an analog meter dial; blue is the muted secondary for the "other"
side of any comparison (e.g. the gas-cost bar), never competing with amber
for attention.

- **Backgrounds** — `--color-bg: #15171a` (page), `--color-bg-elevated:
  #1c1f23` (panels/cards), `--color-bg-inset: #101214` (sunken surfaces:
  inputs, track backgrounds). All graphite, never pure black — pure black was
  explicitly avoided per anti-slop guidance.
- **Borders** — `--color-border: #2b2f35` (hairlines), `--color-border-strong:
  #3a3f46` (input/control borders, needs to read as interactive).
- **Text** — `--color-text-primary: #edeff1`, `--color-text-secondary:
  #a2a8b0`, `--color-text-tertiary: #6c7278`. Off-white, never pure white.
- **Accent (primary, data)** — `--color-amber: #f5a623`. Used exclusively for
  the primary output number, active states, and the "your" side of any
  comparison. Do not use amber decoratively — it signals "this is the number
  that matters."
- **Accent (secondary)** — `--color-blue: #6f9bd1`. Muted, desaturated.
  Used only for the counterpart/comparison series (e.g. the gas-cost bar).
- **Focus ring** — reuses `--color-amber` for `:focus-visible`.
- **Color consistency lock:** amber = primary data across every tool in this
  network. Don't introduce a second "primary" accent per tool — that breaks
  the network's visual identity. Blue is the only sanctioned secondary.

## Type system

- **Space Grotesk** — headlines (`h1`–`h4`) and all numeric/data display via
  the `.num` utility class. `.num` sets `font-variant-numeric: tabular-nums`
  so live-updating figures don't jitter or reflow as digits change width.
  Any element showing a number that updates on input (costs, savings, bar
  values, slider readouts) must carry the `.num` class.
- **Inter** — body text, labels, form inputs, everything else.
- Loaded via Google Fonts `<link>` in `<head>` (pragmatic choice given the
  no-build-step constraint — normally self-hosted `@font-face` with
  `font-display: swap` would be preferred; revisit if this network grows a
  build step later).
- Type scale is defined in `tokens.css` as `--text-xs` through `--text-3xl`.
  Don't hardcode font sizes in a tool's own stylesheet — reference the token.

## Shape and motion

- **Radius lock:** inputs/buttons use `--radius-sm` (8px), panels/cards use
  `--radius-md` (12px), pills/toggles/track bars use `--radius-full`. Every
  tool must follow this exact mapping, not invent new radii.
- **Motion is intentionally minimal** (`MOTION_INTENSITY: 2` in taste-skill
  terms) — this is a data tool, not a marketing page. Only `transform`,
  `opacity`, `width` (comparison bars), and `border-color` transition, all at
  120–180ms. No scroll-triggered animation, no entrance choreography. All
  transition durations collapse to 0 under `prefers-reduced-motion: reduce`
  (handled globally in `base.css`).

## The mi/km unit-toggle pattern

Any future tool with distance, fuel-economy, or fuel-price inputs should
reuse this pattern rather than rebuilding it:

1. **Canonical state is always metric.** Keep one JS state object holding
   km, km/kWh, L/100km, price-per-liter, etc. Never store the
   currently-displayed unit as the source of truth.
2. **The toggle only changes the display**, never the canonical state. On
   toggle click: update `state.unit`, then re-render every unit-dependent
   input's `.value` by converting the canonical metric value to the new
   display unit, and update the unit suffix labels (`[data-suffix]` spans).
3. **On input edit**, read the field's displayed value, convert it *into*
   the canonical metric field using the current `state.unit`, store it, then
   recompute outputs. The field the user is actively typing in is never
   overwritten mid-edit.
4. **All math runs on the canonical metric state**, then output numbers are
   converted to the display unit only at render time. This is what prevents
   rounding drift from repeated toggling.
5. Conversion constants and helpers live in `shared/units.js`
   (`Units.miToKm`, `Units.mpgToLPer100km`, etc.) — import it, don't
   redefine `1.609344` locally.
6. Markup pattern: a `role="group"` of two `<button aria-pressed="...">`
   elements styled with `.unit-toggle` / `.unit-toggle__option` from
   `base.css`, placed near the top of the input panel, above the fields it
   affects.

## Page structure pattern

Every tool in this network follows this section order:

1. **Page header** — `<h1>` + one-line description. Not a marketing hero;
   no big claim, no CTA, just what the tool does.
2. **The tool** — two-panel layout (inputs left, live-updating output/meter
   panel right) on desktop, stacked on mobile below 900px. No submit button;
   everything updates on `input`/`change`. Output panel uses `aria-live="polite"`.
3. **Methodology section** ("How this calculator works") — the math spelled
   out in plain language, numbered steps. This and the two articles below
   are what make the page substantive enough for AdSense; don't skip or
   thin them out.
4. **Two supporting articles** — practical, genuinely useful, specific to
   the tool's subject matter. Two-column on desktop, stacked below 800px.
5. **A small reference data table** — real, sourced figures relevant to the
   tool, with an explicit disclaimer that it's a reference point. Use the
   shared `.data-table` component.
6. **FAQ** — 4–6 questions as `<details>/<summary>` (`.accordion-item` from
   `base.css`). Mirror the FAQ content in a `FAQPage` JSON-LD block in
   `<head>` for SEO — keep the two in sync if you edit either.
7. **Related-tools placeholder** — `.related-tools__grid` of ghost cards
   (`.related-tools__card--ghost`) linking to other tools in the network.
   Update this block with real links as new tools ship; don't leave stale
   "coming soon" badges on tools that already exist.

## Testing checklist for every new tool

Before considering a tool done:
1. Serve it over `http://localhost:8000/` (not `file://`) so the header/footer
   `fetch()` includes work.
2. Open it in Playwright, screenshot at a desktop width (~1440px) and a
   mobile width (~390px).
3. Confirm `document.documentElement.scrollWidth ===
   document.documentElement.clientWidth` at mobile width (no horizontal
   overflow).
4. Exercise the unit toggle (if present) and confirm values convert without
   resetting, and that unit-independent outputs (money) don't change.
5. Open one accordion item and confirm it expands.
