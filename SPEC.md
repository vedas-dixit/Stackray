# Stackray — product spec

This file is the contract for the project. If a prompt, a comment or a doc disagrees with it, this file wins and the disagreement gets written down in the decisions log at the end.

The original DOM3D brief that this grew out of is archived at [docs/brief-dom3d-original.md](docs/brief-dom3d-original.md). It is a recommendation, not a contract.

## 1. What Stackray is

Stackray is a browser extension that lifts any web page into a 3D stack of its layers, inside a small retro‑Mac window that sits on top of the tab. One click: the page shrinks into the window, every element becomes a plane, and the stack explodes apart so you can see what the browser sees: stacking contexts, z‑index, clipping and the invisible overlays sitting on top of everything. Hover a plane for its name, click it for the reason it sits where it does, press Esc to put the page back.

It is two things at once: a visualization people screenshot and post because it looks good, and a debugger that answers questions DevTools cannot, starting with "why is my dropdown behind the header?". The visual gets people to install it. The answers are why they keep it.

Priorities, in order:

1. Fun and beautiful on the first click, on any site, with zero setup.
2. Correct. The 3D order is the browser's real paint order, not DOM nesting.
3. Useful. Every control is reachable by hand and by keyboard; every problem gets a one‑sentence verdict.
4. Private. Nothing leaves the browser. No account, no telemetry, no network requests at all.

## 2. Who it is for

Frontend developers first; designers and curious people second. A developer opens it with a specific bug. A designer opens it to understand a site. Everyone else opens it because the GIF looked cool. The product has to work for the first group and still be fun for the third, which is why the chrome is friendly and the viewport is serious.

### The five questions it answers

| #   | Question                                               | What Stackray shows                                                                                                                                                                                           |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Why is my dropdown / tooltip / modal behind something? | Pick two elements. Both stacking‑context chains are drawn to their shared ancestor and the verdict reads: "`.dropdown` (z 9999) is trapped inside `.card`, which creates a stacking context via `transform`." |
| 2   | Why can't I click this?                                | Hit‑test mode. Click a point on the page and see every element under it, top to bottom, and the one that actually receives the click. Invisible full‑screen overlays turn red.                                |
| 3   | Where did my element go?                               | Clipped elements are drawn as dashed outlines inside their clipper. "Cut off by overflow" and "just scrolled out of view" are shown differently.                                                              |
| 4   | What is on top of everything?                          | The z‑index ladder: direct children of the root stacking context sorted by z, in one table.                                                                                                                   |
| 5   | Is this page div soup?                                 | Tilt it. A 36‑level DOM is obvious in 3D. A stats card (elements, max depth, stacking contexts, invisible layers) is built to be screenshotted.                                                               |

## 3. Prior art

| Tool                  | What it does                                           | Why it is not enough                                                                            |
| --------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Firefox Tilt          | The original 3D DOM view, built into Firefox DevTools  | Removed around 2016; people still ask for it back                                               |
| Edge DevTools 3D View | DOM tab, z‑index tab, composited layers tab            | Edge only, hidden under "More tools", no explanations, nothing to share                         |
| dom3d (Orion Reed)    | Tiny CSS‑transform bookmarklet that went viral in 2024 | DOM depth only; wrong z‑order; flattens on any page with overflow or transform ancestors; GPL‑3 |

Positioning in one line: dom3d that actually debugs stacking, in every browser, that looks like it belongs on your desk.

Two rules follow. Render with WebGL, never CSS 3D transforms, because `preserve-3d` is flattened by any ancestor with overflow, opacity or transform. And make stacking order the default Z axis, with DOM depth as the toy mode.

## 4. The experience

### 4.1 The windows

Stackray does not take over the tab with a full‑screen canvas. It opens a **stage** over the tab (a Shadow DOM host) and lays out four retro‑Mac windows inside it, following the original layout sketch:

```
┌─ stage ─────────────────────────────────────────────────────────────┐
│ ┌─ ● ● ●  youtube.com · 2 607 layers · 172 contexts ─┐ ┌─ ● tools ─┐ │
│ │                                                    │ │ search    │ │
│ │               3D viewport (WebGL)                  │ │ filters   │ │
│ │                                                    │ │ modes     │ │
│ │                                                    │ ├─ ● layers ┤ │
│ │                                                    │ │ tree      │ │
│ ├─ ● element info (collapsed until a selection) ─────┤ │           │ │
│ └────────────────────────────────────────────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

- **Viewport window.** Three dots. The title reads `host · N layers · M contexts`. Red dot exits and restores the page (same as Esc). Yellow collapses the other windows (zen). Green fills the stage with the viewport. Yellow and green are inert in v0.
- **Tools window** (top right). One dot. Only the controls that are always useful: the search box on top, then the filters, the color modes, the explode and depth sliders and the legend.
- **Layers window** (bottom right, under the tools). One dot. The layer tree. While a search is typed it lights up, opens if it was collapsed, and shows ranked matches with the matched letters marked; non‑matching planes dim in the viewport.
- **Element info window** (bottom left). One dot. Collapsed to a thin tab until an element is selected in the viewport or the tree, then it opens with the inspector; `L` shows the ladder and `?` the key list in the same place.
- Every window is resizable by dragging the gap next to it. Layout and collapsed state are remembered per origin under a `stackray:layout:` key. Today that key lives in the page's own `localStorage`; see the open decision in §13.
- **Everything is a control.** Every slider, toggle, mode and filter has a keyboard shortcut; `?` lists them. Nothing requires a menu.

### 4.2 In and out

Opening is two stages (full timings in [docs/motion.md](docs/motion.md)):

1. **Shrink.** The stage fades in and the live page, shown as a flat textured plane, scales down from the full tab into the viewport window with a lift spring (about 400 ms).
2. **Lift.** The planes spring apart from flat to exploded (about 600 ms, slight overshoot). This is the launch GIF.

Closing reverses both. Reduced motion crossfades instead. The page underneath is never modified: no injected styles on its elements, no DOM changes, and it keeps working the moment the stage is gone.

### 4.3 Keys

| Key          | Action                                                                  |
| ------------ | ----------------------------------------------------------------------- |
| Esc          | Exit and restore the page                                               |
| `]` / `_`    | Toggle the right column (tools and layers) / the element info window    |
| `Z`          | Zen: collapse both                                                      |
| Arrows       | Orbit                                                                   |
| Space + drag | Pan the view (middle or right drag also pans)                           |
| `1`…`5`      | Color modes                                                             |
| `/`          | Selector search                                                         |
| `G`          | Toggle ghosts                                                           |
| `T`          | Textured planes: leaves show their own pixels from the page photo       |
| `S`          | Staircase: every layer on its own step in paint order (the plates view) |
| `L`          | Ladder                                                                  |
| `W`          | "Why behind?" two‑pick mode                                             |
| `H`          | Hit‑test mode                                                           |
| `?`          | Key list                                                                |

## 5. Features by version

Each version has a "done when" so scope does not creep. Ship v0 to friends, v1 to Reddit, v1.5 to the stores.

| Version         | Features                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Done when                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **v0 — Tilt**   | Capture (DOM walk incl. open shadow roots, stacking contexts with reasons, paint order, ghosts, clipped, top layer, labels) · Three.js `InstancedMesh` planes, one per non‑empty element · Z = paint order with a DOM‑depth toggle · orbit, pan, zoom · shrink + lift animation · hover tooltip (label, z, context reason) · click flashes the real element · Esc exits                                                                                                      | The viewer loads a saved snapshot and tilts it at 60 fps; a friend says "whoa"                     |
| **v1 — Debug**  | Window layout with tools + info windows, resizable, collapsible · layer tree with repeats grouped ("div.stroke ×36") · "Why behind?" two‑pick with the one‑sentence verdict · hit‑test mode · ghosts drawn translucent with a toggle · clipped vs scrolled‑out · z‑index ladder · filters (hide empty, hide ghosts, only contexts, isolate subtree, selector search) · explode and depth‑cutoff sliders · live mode (Mutation + Resize observers, debounced, planes animate) | Runs on any site as a content script; the GIF shows a broken dropdown turning red with its verdict |
| **v1.5 — Ship** | WXT builds for Chrome, Firefox, Edge · DevTools panel with `inspect()` sync · textured mode (tab screenshot UV‑mapped onto planes) · label fallbacks: id → data‑testid → custom element tag → aria‑label → readable classes → own text → tag · npm dev build with React/Vue component names · share card PNG                                                                                                                                                                 | Listed in all three stores; npm package published                                                  |
| **v2 — Depth**  | Composited layers via CDP `LayerTree` (optional `debugger` permission) · diff two snapshots · focus‑order path · warnings (will‑change contexts, z‑index that does nothing, nested z that never competes)                                                                                                                                                                                                                                                                    | Matches Edge's 3D View feature for feature, in every browser                                       |

Out of scope, deliberately: editing CSS inside the tool, accounts, cloud sync, anything that sends page data anywhere.

### The cool layer

None of these are needed to debug; all are cheap once the renderer exists. The rule for adding more: if it would not look good in a 10‑second GIF or answer one of the five questions, it waits.

- **Explode slider.** 0 is the flat page; max is an architectural model.
- **Color modes.** Depth gradient · one hue per stacking context · heat by z‑index · ghosts in translucent red · plain with textures. Every mode has a legend; red is reserved for problems.
- **Textured mode.** The page photo under the stack and each leaf plane wearing its own pixels; containers stay outlines so nothing is drawn twice. The mode for designers.
- **Tour.** Slow auto‑orbit for recordings and second monitors.
- **Share card.** PNG of the tilted page, favicon, site name, stats strip, a tongue‑in‑cheek "div soup score".
- **Compare.** Two snapshots side by side with synced cameras.

## 6. Architecture

```
live page ──capture──▶ snapshot (plain JSON) ──▶ renderer (WebGL canvas) ──▶ wrappers
                                             └─▶ ui (windows, tree, inspector)
```

Rules that every package obeys:

1. **`core` is a pure function page → snapshot.** It is the only package that reads the DOM. Everything it computes is in the snapshot.
2. **`renderer` only ever sees a snapshot.** It never touches the host DOM. This is what lets the same code run in the overlay, the DevTools panel, the viewer, the npm build and the bookmarklet.
3. **`ui` only ever sees a snapshot plus view state.** It is Preact inside a Shadow DOM with its own fonts and tokens. Nothing leaks in or out.
4. **Wrappers are thin shells.** They decide where the canvas lives and how the user gets in and out. No logic.
5. **The extension makes zero network requests.** Permissions are `activeTab` and `scripting` only. The tab screenshot comes from `captureVisibleTab`, which `activeTab` grants.

| Surface           | What                                                                   | Who                           | Notes                                       |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------- | ------------------------------------------- |
| Extension overlay | Toolbar icon or hotkey opens the stage over the tab                    | Everyone; the demo GIF        | Ships first                                 |
| DevTools panel    | A "Stackray" tab: same windows, click a plane → selects it in Elements | Developers                    | Needs `inspect()` from the devtools context |
| Viewer            | Static page that loads a snapshot JSON                                 | Us; the dev loop; fixtures    | `pnpm dev`                                  |
| npm dev build     | `import 'stackray/dev'`, press a hotkey                                | Devs on their own app         | Adds React/Vue component names              |
| Bookmarklet       | One‑line loader                                                        | README "try it in 10 seconds" | Blocked by CSP on many sites; a demo        |
| Site              | Landing page with a live demo on a sample page with a broken dropdown  | Launch traffic                | Same‑origin demo                            |

**Stack:** TypeScript (strict, ESM) · pnpm workspaces · WXT for the extension · Three.js `InstancedMesh` (one mesh; fill and edge come from the same shader, so 10k elements are one draw call) · `OrbitControls` · Preact + signals for the UI · Vite · Vitest with a fake‑DOM harness · Playwright for fixtures and visual tests · Biome · Changesets.

## 7. The element record

One per element in `snapshot.elements`. This table is the contract between `core` and everything else; change it here first.

| Field         | Type                             | Meaning                                                                                                                                                  |
| ------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `i`           | number                           | Index in `elements`; stable within a snapshot                                                                                                            |
| `parent`      | number \| null                   | Index of the parent; `null` for the root                                                                                                                 |
| `depth`       | number                           | Tree depth; root is 0                                                                                                                                    |
| `tag`         | string                           | Lower‑case tag name                                                                                                                                      |
| `id`          | string \| null                   | `id` attribute                                                                                                                                           |
| `cls`         | string[]                         | Class list with hashed classes removed                                                                                                                   |
| `sel`         | string                           | Display label, at most 30 characters, built by the label fallback chain                                                                                  |
| `rect`        | `{x, y, w, h}`                   | Document coordinates. The root uses the page's scroll size, not its own rect                                                                             |
| `empty`       | boolean                          | Zero width or height                                                                                                                                     |
| `ghost`       | boolean                          | Invisible (opacity 0 or visibility hidden) but still in the tree                                                                                         |
| `style`       | object                           | `position`, `zIndex`, `display`, `opacity`, `visibility`, `pointerEvents`, `overflow`, `transform`, `background`                                         |
| `sc`          | boolean                          | Creates a stacking context                                                                                                                               |
| `scReasons`   | string[]                         | The exact CSS reasons, e.g. `["transform", "will-change: opacity"]`                                                                                      |
| `scParent`    | number \| null                   | Nearest stacking context above this element                                                                                                              |
| `positioned`  | boolean                          | `position` is not `static`                                                                                                                               |
| `z`           | number \| null                   | Effective z‑index: the integer, `0` for contexts created without a z (opacity, transform…), `null` when none applies                                     |
| `clipBy`      | number \| null                   | Nearest ancestor whose overflow clips this element                                                                                                       |
| `clipKind`    | `"hidden"` \| `"scroll"` \| null | Whether that ancestor clips or scrolls                                                                                                                   |
| `clipped`     | boolean                          | Entirely outside the clipper and the clipper hides overflow                                                                                              |
| `scrolledOut` | boolean                          | Entirely outside the clipper and the clipper scrolls                                                                                                     |
| `iframe`      | boolean                          | Opaque leaf; cross‑origin content is drawn as a labelled slab                                                                                            |
| `shadow`      | boolean                          | Lives inside an open shadow root                                                                                                                         |
| `topLayer`    | boolean                          | In the browser's top layer: a modal `dialog`, an open popover or a fullscreen element; hoisted above everything                                          |
| `paint`       | number                           | Global paint index, back to front. Drives the Z axis: the renderer stacks overlapping elements in this order and lets non‑overlapping ones share a level |

`snapshot.paintOrder` is `elements` as an ordered array of indices. `snapshot.meta` carries `url`, `title`, `viewport`, `page` (scroll size), `scroll` offset, `dpr`, `capturedAt`, `captureMs` and the `version` of the schema. The TypeScript source of truth is `packages/core/src/types.ts`.

## 8. Budgets

| Budget                              | Limit                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| Capture, 5,000 elements             | under 50 ms                                                                    |
| Render                              | 60 fps at 10,000 planes                                                        |
| Snapshot size                       | under 2 MB                                                                     |
| Content‑script bundle               | under 300 KB gzipped (fonts load as web‑accessible resources and do not count) |
| Permissions                         | `activeTab`, `scripting`; nothing else without a decision here                 |
| Network requests from the extension | zero                                                                           |

## 9. Repo layout and commands

```
stackray/
  packages/
    core/        capture · stacking · labels · clip · why · snapshot types   (tests use a fake‑DOM harness)
    renderer/    scene · planes (InstancedMesh) · controls · modes · layout
    ui/          tokens · Window · panes · LayerTree · Inspector · Verdict · Ladder · Tooltip · Legend · ShareCard
  apps/
    extension/   WXT: content script (stage), background worker; a devtools panel later
    viewer/      loads a snapshot JSON and renders it; also the tokens & components preview
    site/        landing page with the embedded demo
  fixtures/      broken-dropdown.html + its snapshot; youtube.json, figma.json, github.json when captured
  scripts/       capture-fixture.ts (Playwright: open URL, run capture, save JSON)
  docs/          architecture.md · motion.md · ui-preview*.png · logo.png, gifs/, screenshots and the author card for the README · archived brief
```

| Command         | Does                                                         |
| --------------- | ------------------------------------------------------------ |
| `pnpm dev`      | Runs the viewer with hot reload; drop a fixture in to see it |
| `pnpm dev:ext`  | WXT dev mode; loads the extension unpacked                   |
| `pnpm test`     | Vitest across all packages                                   |
| `pnpm fixtures` | Playwright captures fresh snapshots from the fixture pages   |
| `pnpm build`    | Builds every package and app                                 |
| `pnpm release`  | Builds everything, then `changeset publish` (publish + tags) |
| `pnpm check`    | Biome lint + format check, plus `tsc --noEmit` everywhere    |

Prerequisites: Node 22+, pnpm 10, Chrome (WXT dev and Playwright), git. No native dependencies.

## 10. Tests that matter

- The paint‑order algorithm against the canonical cases: negative z · trapped z · flex‑item z · fixed vs positive z · equal z resolved by DOM order.
- Label fallbacks on hashed‑class HTML.
- Clipped vs scrolled‑out.
- Top‑layer hoisting.
- A render smoke test that loads a fixture and asserts frame time.
- No test, no merge.

## 11. Design and motion

The look is set by [STYLEGUIDE.md](STYLEGUIDE.md): retro‑Mac windows, warm cream chrome with brown borders, a near‑black viewport, serif display type for titles and verdicts, monospace for every label and number, hand‑drawn icons. Motion is set by [docs/motion.md](docs/motion.md). Both are derived from blog.vedasdixit.com, vedasdixit.com and the original layout sketch, not from defaults.

## 12. Privacy and launch

The privacy policy is one sentence and it is true: Stackray collects nothing and makes no network requests. The README's Privacy section lists what it does touch: it scrolls the page to photograph it, and it leaves a font `<style>` and the saved pane sizes in the page. Launch is a 10‑second GIF (page lifts, a dropdown glows red, the verdict appears), one sentence, and the link, posted the same day to r/webdev, r/css, r/Frontend and Show HN with live store links. Register store listings before posting; review takes days.

## 13. Decisions log

| Decision      | Choice                                                                                                                                              | Why                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Name          | **Stackray** · packages `@stackray/core`, `@stackray/renderer`, `@stackray/ui` · npm `stackray`                                                     | Short, spatial, says "stack" and "x‑ray"                                                                     |
| License       | MIT                                                                                                                                                 | dom3d is GPL; a clean‑room MIT tool is the friendlier choice                                                 |
| Rendering     | WebGL via Three.js                                                                                                                                  | CSS 3D flattens under overflow, opacity and transform                                                        |
| UI framework  | Preact + signals                                                                                                                                    | Small enough for the content‑script budget; JSX for a real component inventory                               |
| Layout        | Three windows in a stage, per the sketch                                                                                                            | A panel you can shrink beats a full‑screen takeover; it is also the family resemblance to the author's sites |
| Node          | 22+                                                                                                                                                 | WXT requires it                                                                                              |
| First surface | Extension overlay                                                                                                                                   | It is the demo; the DevTools panel reuses everything                                                         |
| Textures      | Screen‑by‑screen `captureVisibleTab` tiles (at most 6 screens, two per second) stitched under the stack; leaf planes get crops from a texture atlas | Already granted by `activeTab`; a one‑shot full page needs `debugger`                                        |

Open, waiting on the author:

| Decision            | Options                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Palette             | Match blog.vedasdixit.com exactly (cream + dark brown) or a sibling theme with its own accent       |
| Accent              | Amber (current tokens) · maroon from vedasdixit.com · olive from the portfolio labels               |
| Yellow / green dots | Inert in v1, or zen / fill as described above                                                       |
| Layout storage      | The page's `localStorage` (today, no extra permission) or `browser.storage.local` (needs `storage`) |
