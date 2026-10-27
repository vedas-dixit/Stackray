# Stackray style guide

Stackray should look like it belongs on the same desk as blog.vedasdixit.com and vedasdixit.com: a retro‑Mac window on warm paper, thin brown borders, monospace labels, a serif that only speaks when it has a sentence to say, and icons that look drawn with a pen. The viewport inside is a dark blueprint. The tokens in [packages/ui/src/tokens.css](packages/ui/src/tokens.css) are the source of truth; this file explains them.

One line to test any screen against: **a desk tool, not a dashboard.**

## 1. Where each token comes from

| Token                     | Value                 | From                                                                                                                                             |
| ------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--sr-cream`              | `#f2ede4`             | The blog's page background; warmer than the portfolio's peach so the dark viewport sits in it without a cast                                     |
| `--sr-cream-2` / `-3`     | `#e8e1d4` / `#ddd4c4` | Sunken surfaces: title bars, inputs, the collapsed pane tab                                                                                      |
| `--sr-line`               | `#d3c8b8`             | The blog's hairline rules and card borders                                                                                                       |
| `--sr-line-strong`        | `#5b3a2a`             | The portfolio's window borders and title bars. Used once per window, on the outer frame                                                          |
| `--sr-ink`                | `#2b2420`             | The blog's dark cards; all primary text                                                                                                          |
| `--sr-muted`              | `#8a7f74`             | The blog's metadata grey (`№ 01 · LATEST · SEO`)                                                                                                 |
| `--sr-accent` / `-bright` | `#c8761f` / `#f0a64a` | The fox. One hue, two luminances: the darker one on cream for focus rings and selection, the brighter one on the viewport for the selected plane |
| `--sr-danger` / `-bright` | `#c8372d` / `#ff5a47` | Problems only: trapped z, blocking ghosts, cut‑off elements. Never decoration, never the close dot                                               |
| `--sr-dot-*`              | red, yellow, green    | The three dots. The only saturated colors in the chrome besides the accent                                                                       |
| `--sr-viewport`           | `#1a1714`             | Near‑black with the cream's warmth; planes read as a blueprint and photograph well                                                               |
| `--sr-plane-*`            | cream at 7–55% alpha  | Fill and edge of a plane; hover and selection brighten; ghosts and clipped planes use the danger hue                                             |

The accent is amber rather than the portfolio's maroon because maroon next to the danger red would make "selected" and "broken" look like cousins. This is an open decision in SPEC.md §13.

## 2. Type

Two families. A third would be noise in a tool whose body copy is selectors and numbers.

| Role                                                     | Face                      | Size                  | Weight                                                     | Case                                                                                                                            |
| -------------------------------------------------------- | ------------------------- | --------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Metadata, window titles, selectors, stats, keys          | JetBrains Mono (variable) | 11px, tracking 0.08em | 400                                                        | Uppercase for window titles and section labels, as in `AUTHOR` and `WORK` on the reference sites; sentence case everywhere else |
| Controls, tree rows, inspector values                    | JetBrains Mono            | 13px                  | 400 / 600 for the selected row and the key value           | Sentence case                                                                                                                   |
| Verdict, empty state, share‑card headline, stats numbers | Instrument Serif          | 20px                  | 400, italic allowed for the element names inside a verdict | Sentence case                                                                                                                   |

The serif is the voice of the tool. It says one sentence at a time: the verdict, the empty‑state line, the share‑card headline. It never labels a control.

Numbers use a thin space as the thousands separator (`2 607 layers`). Labels are cut at 30 characters with a single `…`.

## 3. Space, shape, line

- Spacing in 4px steps: 4, 8, 12, 16, 20, 24, 32. Title bars are 36px tall. Rows are 28px.
- Windows have a 10px radius and a 1px `--sr-line-strong` border. Controls have a 4px radius and a 1px `--sr-line` border. Nothing else is rounded.
- No shadows and no glow. Separation comes from the border and the change of surface.
- Dividers inside a window are 1px `--sr-line`. The blog's hand‑drawn wavy rule is reserved for the share card and the empty state, where a little play is welcome.

## 4. Motion

[docs/motion.md](docs/motion.md) has the full spec. In short: hover 80ms, panes 200ms, the shrink 400ms on a lift spring, the lift 600ms with a few percent of overshoot, everything reversed on exit, crossfade under reduced motion.

## 5. Icons

Hand‑drawn, not geometric. Drawn as SVG paths at 16×16 with a 1.5px stroke, round caps and joins, `currentColor`, no fills except the ghost's eyes. Corners overshoot by about half a pixel the way a pen does, and long lines bow slightly. Scale to 24 for the extension icon.

| Icon       | Used for                                                             |
| ---------- | -------------------------------------------------------------------- |
| `stack`    | The extension icon: three tilted planes, the top one lifted          |
| `layers`   | Tools window title, color‑mode "depth"                               |
| `ghost`    | Ghost filter and ghost legend entry                                  |
| `scissors` | Clipped elements                                                     |
| `ladder`   | The z‑index ladder                                                   |
| `chevron`  | Pane tabs (rotates for right and bottom)                             |
| `search`   | Selector search                                                      |
| `keys`     | The `?` key list                                                     |
| `orbit`    | Tour mode                                                            |
| `close`    | Only in the EmptyState and the key list; the window uses the red dot |

Two pixel‑art pieces are allowed: the 8×8 stack glyph in the viewport title bar, the way the apple sits on vedasdixit.com, and the rocker switch used for every toggle, borrowed from the same site's toolkit card. There are no others.

## 6. Components

Every component is a Preact function in `packages/ui/src/components`, one file each, styled with the tokens inside the Shadow DOM. States are listed where they exist. Focus is always visible: `--sr-focus-ring`.

| Component      | What                                                                                                                                                                                                                     | States                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Window**     | Frame, title bar with three dots, uppercase mono title (`youtube.com · 2 607 layers · 172 contexts`), resize handle bottom‑right. Red dot closes and restores the page (Esc). Yellow and green are drawn but inert in v0 | default · focused (border goes `--sr-ink`) · resizing                                                          |
| **Pane**       | A one‑dot window for tools (right) or info (bottom). Clicking the dot collapses it to a 20px tab on its edge with a chevron; the gap between panes is a drag handle. State is remembered in `localStorage`               | open · collapsed · dragging                                                                                    |
| **LayerTree**  | Rows with depth indent, label, a context badge with its reason (`transform`), repeated siblings grouped (`div.stroke ×36`)                                                                                               | default · hover · selected (accent wash, 600 weight) · ghost (muted) · problem (danger text) · collapsed group |
| **Filters**    | Hide empty · hide ghosts · only stacking contexts · isolate subtree · selector search                                                                                                                                    | each Toggle's states; search has empty · typing · no‑match                                                     |
| **Inspector**  | Card: label, tag, z, position, the stacking chain as a breadcrumb, reasons                                                                                                                                               | default · empty (nothing selected shows the empty state, which points to the ladder)                           |
| **Verdict**    | One serif sentence on a cream card with a 2px danger left rule when it is a problem, accent rule when it is fine                                                                                                         | problem · fine · pending (one element picked, waiting for the second)                                          |
| **Ladder**     | Table: z · label · reason, for the root context's children                                                                                                                                                               | default · hover row · more than 12 rows (scroll inside the pane)                                               |
| **Slider**     | Label, track, thumb, value in mono; explode distance and depth cutoff                                                                                                                                                    | default · hover · focus · dragging · disabled                                                                  |
| **Toggle**     | The pixel rocker switch from vedasdixit.com's toolkit card, drawn inline in `currentColor`: ink bezel, lever down and ink when off, lever up and accent when on. No sound                                                | off · on · focus · disabled (lever and bezel in `--sr-line`)                                                   |
| **Tooltip**    | Hover label in the viewport: label, z, reason, on `--sr-cream` with an ink border                                                                                                                                        | default only; follows the cursor by 12px                                                                       |
| **Kbd**        | A key cap: mono xs, 1px border, 2px radius                                                                                                                                                                               | default                                                                                                        |
| **Legend**     | Per color mode: swatch + name; ghosts always last                                                                                                                                                                        | default                                                                                                        |
| **EmptyState** | Doodle + one serif line + one mono line, e.g. "Nothing selected." / "Click a plane, or press L for the ladder."                                                                                                          | default                                                                                                        |
| **ShareCard**  | 1200×630: tilted page render, favicon, host, stats strip, serif headline                                                                                                                                                 | preview · exporting                                                                                            |
| **Dots**       | The three traffic lights, or a single idle dot for panes                                                                                                                                                                 | default · hover (the glyph appears) · pressed                                                                  |

## 7. Voice

- Sentence case. No exclamation marks. No emoji.
- Verdicts are exactly one sentence and name both elements: "`.dropdown` (z 9999) is trapped inside `.card`, which creates a stacking context via `transform`. Fix: move `.dropdown` out of `.card` or remove the transform." The fix is a second sentence only when there is one.
- Buttons say what happens: "Export PNG", not "Share". The same verb all the way through.
- Empty states say what to do next, in the tool's voice, never apologetic.

## 8. What not to do

- No gradients, no glow, no soft grey shadows, no rounded‑everything.
- No full‑screen takeover. The page shrinks into a window; it does not disappear.
- No colored text except danger and the accent on the selected row.
- No onboarding, no tips, no badges that count things nobody asked about.
- Nothing that reads as a generic dashboard: no stat tiles with big numbers and small labels, no card grid, no sidebar of icons.
