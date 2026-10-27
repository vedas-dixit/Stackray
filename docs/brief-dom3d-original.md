# DOM3D — project brief & spec

Oct 25, 2026 · @Kurama

## The idea

DOM3D is a browser extension that lifts any web page off the screen into a 3D stack of its layers. One click: the page tilts, every element becomes a plane, and you can see what the browser sees — nesting, stacking contexts, z-index, clipping, and the invisible overlays sitting on top of everything. Drag to orbit, hover a plane for its name, click it to jump to the element, press Esc to come back.

It is two products in one body, and both matter. It is a visualization people screenshot and post because it looks spectacular. It is also a debugger that answers questions DevTools can't show, starting with "why is my dropdown behind the header?". The visual is the hook; the answers are why people keep it installed.

Priorities, in order:

1. Fun and beautiful on the first click, on any site, with zero setup.
2. Correct: the 3D order matches the browser's real paint order, not just DOM nesting.
3. Useful: one-sentence answers to the five questions in the section below.
4. Private: nothing leaves the browser, no account, no telemetry.

Working title: DOM3D. The name is an open decision (see the last section) because `dom3d` is taken.

## Prior art and positioning

The gap: nobody ships a cross-browser tool that renders correctly, visualizes paint order rather than nesting, and explains stacking bugs in plain words.

| Tool                                                                                  | What it does                                                        | Why it isn't enough                                                                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Firefox Tilt                                                                          | The original 3D DOM view, built into Firefox DevTools               | Removed around 2016; people still ask for it back                                                                                    |
| [Edge DevTools 3D View](https://learn.microsoft.com/microsoft-edge/devtools/3d-view/) | DOM tab, Z-index tab (stacking context tree), Composited Layers tab | Edge only, buried under More tools, no explanations, nothing shareable                                                               |
| [dom3d by Orion Reed](https://github.com/OrionReed/dom3d)                             | Tiny CSS-transform bookmarklet/extension, went viral in 2024        | DOM depth only; README lists wrong z-ordering, pages that render flat, and elements that don't stack; last updated April 2024; GPL-3 |

Positioning in one line: dom3d that actually debugs stacking, in every browser.

Two rules that follow from the table. Render with WebGL, not CSS 3D transforms, because CSS `preserve-3d` is flattened by any ancestor with overflow, opacity or transform — that is why dom3d goes flat on GitHub. And make "stacking order" the default Z axis, with "DOM depth" as the toy mode.

## Who it's for and the five questions it answers

Frontend developers first, designers and curious people second. A dev opens it with a specific bug; a designer opens it to understand a site; everyone else opens it because the GIF looked cool. The product has to serve the first group and delight the third.

The five questions, and what the tool shows for each:

1. **Why is my dropdown/tooltip/modal behind something?** The most-viewed CSS question on Stack Overflow. Pick two elements; the tool draws both stacking-context chains to their shared ancestor and prints the verdict: "`.dropdown` (z 9999) is trapped inside `.card`, which creates a stacking context via `transform`."
2. **Why can't I click this?** Hit-test mode: click a point on the page, see every element under it top to bottom, and which one actually receives the click. Invisible full-screen overlays light up in red.
3. **Where did my element go?** It rendered, but an `overflow: hidden` ancestor cut it off. The tool shows clipped elements as dashed outlines inside their clipper, and separates "cut off" from "just scrolled out of view".
4. **What's on top of everything?** The z-index ladder: the direct children of the root stacking context sorted by z. On YouTube that is `#frosted-glass` 2018 → `#masthead` 2020 → `#guide` 2021 → `snackbar` 20000, in one table.
5. **Is this page div soup?** Tilt it. A 36-level-deep DOM is obvious in 3D in a way no tree view conveys. Add a stats card (elements, max depth, stacking contexts, invisible layers) that people will screenshot.

Two findings from real captures show the kind of thing it surfaces for free: Figma wraps every sidebar row in `isolation: isolate` so a `z-index: -1` button can sit behind the text without falling behind the page; YouTube has about 270 stacking contexts that exist only because of `will-change: opacity` on ripple layers.

## Product shape

One core (capture → stacking model → renderer) with four thin wrappers. Build the core as a plain script first and test it by pasting into the console; wrap it only once the 3D feels good.

| Surface           | What it is                                                                                                                                                    | Who uses it                   | Notes                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| Extension overlay | Toolbar icon or hotkey drops a full-screen WebGL canvas over the current tab; Esc returns                                                                     | Everyone; the demo GIF        | Content script with `activeTab` + `scripting` only, so no scary install warning      |
| DevTools panel    | A "3D" tab in DevTools: layer tree on the left, orbitable view in the middle, inspector with the verdict on the right; click a plane → selects it in Elements | Developers debugging          | Needs the extension; uses `inspect()` from the devtools context                      |
| npm dev build     | `import 'dom3d/dev'` in your app, press a hotkey                                                                                                              | Devs on their own project     | Same core, plus component names read from React/Vue dev internals and jump-to-source |
| Bookmarklet       | One-line `javascript:` bookmark that loads the script                                                                                                         | README "try it in 10 seconds" | Blocked by CSP on many sites; a demo, not the product                                |
| Landing page      | GitHub Pages site with an embedded live demo on a sample page with a deliberately broken dropdown, plus install buttons                                       | Launch traffic                | The demo works because the sample page is same-origin                                |

The overlay ships first because it is the thing people share. The DevTools panel comes right after because it is the thing people keep.

## Feature spec by version

Ship v0 to friends, v1 to Reddit, v1.5 to the stores. Each version has a "done when" so scope doesn't creep.

| Version                        | Features                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Done when                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| v0 — Tilt (a weekend)          | Capture script (exists, v0.2) · Three.js `InstancedMesh` planes, one per non-empty element · Z = paint order, with a DOM-depth toggle · orbit, pan, zoom · flat → exploded morph animation · hover tooltip with label, z-index, stacking reason · click flashes the real element · Esc exits                                                                                                                                                                                                                                                                      | Loads a saved snapshot JSON of YouTube and tilts it at 60fps; a friend says "whoa"                           |
| v1 — Debug (the Reddit launch) | Stacking-context tree sidebar with repeated patterns grouped ("div.stroke ×36") · "Why behind?" two-pick mode with the one-sentence verdict · hit-test mode (`elementsFromPoint`) · ghosts (opacity 0 / visibility hidden) drawn translucent with a toggle · clipped vs scrolled-out shown differently · z-index ladder view · filters: hide empty, hide ghosts, only stacking contexts, isolate subtree, selector search · explode-distance and depth-cutoff sliders · live mode (MutationObserver + ResizeObserver, debounced, planes animate to new positions) | Running on any site as a content script; the demo GIF shows the broken dropdown turning red with the verdict |
| v1.5 — Ship (the stores)       | Packaged with WXT for Chrome, Firefox, Edge · DevTools panel with `inspect()` sync · textured mode: tab screenshot UV-mapped onto planes · label fallbacks: id → data-testid → custom element tag → aria-label → readable classes → own text → tag · npm dev build with React/Vue component names · share card: PNG of the tilted page plus stats                                                                                                                                                                                                                 | Listed in all three stores; npm package published                                                            |
| v2 — Depth                     | Composited layers via Chrome DevTools Protocol `LayerTree` (optional `debugger` permission) · diff two snapshots (before/after a CSS change) · keyboard focus-order path drawn through the layers · warnings: will-change contexts, z-index that does nothing, nested z that never competes                                                                                                                                                                                                                                                                       | Matches Edge's 3D View feature for feature, in every browser                                                 |

Out of scope, deliberately: editing CSS from inside the tool (DevTools already does that), accounts, cloud sync, anything that sends page data anywhere.

## The cool layer

These are the features that make people post it rather than just use it. None of them are required for debugging; all of them are cheap once the renderer exists.

- **The lift.** The page doesn't cut to 3D, it rises: planes spring apart from flat to exploded over \~600ms with a slight overshoot, and settle back on Esc. This animation is the launch GIF.
- **Explode slider.** Drag to change the gap between layers from 0 (flat page) to wide (every layer floating). At 0 with textures on, it is just the page; at max it is an architectural model.
- **Color modes.** Depth gradient (the Tilt look) · one hue per stacking context (siblings share a color, nested contexts shift it) · heat by z-index (20000 glows) · ghosts in translucent red · plain with textures.
- **Textured mode.** A screenshot of the tab mapped onto each plane, so the exploded page still looks like the page. This is the mode designers will love and the one that looks best in dark mode.
- **Tour.** A cinematic auto-orbit that slowly circles the page, for screen recordings and for leaving on a second monitor to look cool.
- **X-ray card.** One click exports a PNG: the tilted page, the site's favicon and name, and a stats strip — elements, max depth, stacking contexts, invisible layers, a tongue-in-cheek "div soup score". Built to be posted.
- **Compare.** Load two snapshots side by side with synced cameras: two news sites, or your app before and after a refactor.
- **Keyboard everything.** Arrow keys orbit, number keys switch color modes, `/` searches selectors, `G` toggles ghosts, `L` opens the ladder. Power users notice.
- **Dark mode by default.** Planes on a near-black background with thin edges read as a blueprint; it photographs well and matches DevTools.

The rule for adding more: if it wouldn't look good in a 10-second GIF or answer one of the five questions, it waits.

## Architecture and data model

The core is a pure function from a live page to a snapshot, plus a renderer that only ever sees the snapshot. Nothing in the renderer touches the DOM, which is what lets the same code run in an overlay, a DevTools panel, an npm package and a bookmarklet.

&#91;embedded content: architecture · one core, four wrappers\]

The capture and model run inside the page as a content script; the snapshot is a plain object; the renderer draws it on a canvas; each wrapper is a thin shell that decides where the canvas lives and how the user gets in and out.

**Stack:** TypeScript · [WXT](https://wxt.dev) for the extension build (one codebase → Chrome, Firefox, Edge) · Three.js with `InstancedMesh` for planes and a second instanced mesh for edges (two draw calls for 10k elements) · `OrbitControls` · Vite · Vitest with the fake-DOM harness for the stacking model · Playwright to capture fixture snapshots from real sites.

**Budget:** capture under 50 ms for 5,000 elements · 60 fps at 10,000 planes · snapshot under 2 MB · extension permissions limited to `activeTab` and `scripting`.

**Element record** (one per element in `snapshot.elements`; `snapshot.paintOrder` is the same thing as an ordered index array, and `snapshot.meta` carries url, viewport, page size, scroll offset, DPR and timing):

| Field                                          | Meaning                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `i`, `parent`, `depth`                         | Tree position; children are rebuilt from `parent`                                                |
| `tag`, `id`, `cls`, `sel`                      | Identity; `sel` is the display label after hashed classes are filtered out                       |
| `rect {x, y, w, h}`                            | Document coordinates; the root uses the page's scroll size, not its own rect                     |
| `empty`, `ghost`                               | Zero-size; invisible (opacity 0 or visibility hidden) but still present                          |
| `style {…}`                                    | position, z-index, display, opacity, visibility, pointer-events, overflow, transform, background |
| `sc`, `scReasons`, `scParent`                  | Creates a stacking context; the exact CSS reasons; the nearest context above it                  |
| `positioned`, `z`                              | position is not static; effective z-index (0 for opacity/transform contexts, null if none)       |
| `clipBy`, `clipKind`, `clipped`, `scrolledOut` | Nearest overflow ancestor; hidden vs scroll; whether the element is entirely outside it          |
| `iframe`, `shadow`, `topLayer`                 | Opaque leaf; inside a shadow root; open dialog, popover or fullscreen                            |
| `paint`                                        | Global paint index, back to front — the Z axis in stacking mode                                  |

## UX and design rules

The tool should feel like a native DevTools feature that happens to be gorgeous, not like a toy that happens to be useful.

- **In and out in under a second.** One click or hotkey to enter, Esc to leave, no loading screens, no onboarding. The lift animation is the onboarding.
- **Never break the page.** The overlay is a separate canvas on top; the page underneath is untouched and keeps working when you leave. No injected styles on the page's own elements.
- **Hover tells you what, click tells you why.** Hover shows the label and z-index; click opens the inspector with the stacking-context chain and the verdict. Nothing requires a menu.
- **Noise is the enemy.** Hide empty elements by default, group repeated patterns in the sidebar, cap labels at about 30 characters, and let one slider collapse the whole thing back to flat.
- **Color means something.** Each color mode has a legend; red is reserved for problems (ghosts blocking clicks, trapped z-index, cut-off elements).
- **Keyboard first, mouse always.** Every action has a key; every key is discoverable by pressing `?`.
- **Dark by default, light available.** Matches DevTools; photographs well.
- **Degrade gracefully.** Cross-origin iframes draw as solid labeled slabs. Pages over the element budget render the first N by paint order and say so. No WebGL means a short message, not a blank screen.
- **Private by construction.** No network requests from the extension at all. The privacy policy is one sentence and it is true.
- **The verdict is a sentence, not a table.** "X is trapped inside Y, which creates a stacking context via Z. Fix: remove Z or move X out." If it can't be said in one sentence, the feature isn't done.

## Run specs

A monorepo with the core as a package and each wrapper as a thin app. Anyone (including Claude) should be able to clone, `pnpm i`, `pnpm dev` and see a page tilt within five minutes.

```
dom3d/
  packages/
    core/            capture.ts, stacking.ts, snapshot.ts, labels.ts   (no DOM in tests: fake-DOM harness)
    renderer/        scene.ts, planes.ts (InstancedMesh), controls.ts, modes.ts, overlay.ts
    ui/              sidebar, inspector, tooltip, ladder, share-card (framework-light, Preact or vanilla)
  apps/
    extension/       WXT project: content script (overlay), devtools panel, background worker
    viewer/          static page that loads a snapshot JSON and renders it (dev loop + fixtures)
    site/            landing page with the embedded demo and install buttons
  fixtures/          youtube.json, figma.json, github.json, broken-dropdown.html (+ its snapshot)
  scripts/           capture-fixture.ts (Playwright: open URL, run capture, save JSON)
```

| Command         | What it does                                                                     |
| --------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`      | Runs `apps/viewer` with hot reload; drop a fixture to see it in 3D               |
| `pnpm dev:ext`  | WXT dev mode; loads the extension unpacked in a Chrome profile                   |
| `pnpm test`     | Vitest: stacking model against hand-built trees and the saved fixtures           |
| `pnpm fixtures` | Playwright captures fresh snapshots from the fixture URLs                        |
| `pnpm build`    | Builds core, renderer, viewer, site and extension zips for Chrome, Firefox, Edge |
| `pnpm release`  | Tags, builds, uploads zips to a GitHub Release and submits to the stores         |

**Tests that matter:** the paint-order algorithm against the five canonical cases (negative z, trapped z, flex-item z, fixed vs positive z, equal z resolved by DOM order) · label fallbacks on hashed-class HTML · clipped vs scrolled-out · top-layer hoisting · a render smoke test that loads `youtube.json` and asserts frame time.

**Dev loop:** build the renderer against saved fixtures first; only switch to live pages once planes, hover and the lift animation look right. Capturing live is already solved; rendering is the unknown.

**Prerequisites on the machine:** Node 20+, pnpm, Chrome (for WXT dev and Playwright), git. No native deps.

## Launch plan

Register the store listings before posting anywhere, because review takes days and the post needs live install links.

1. **Stores.** Chrome Web Store (one-time $5 developer fee; one listing covers Chrome, Brave, Arc, Opera, Vivaldi), Firefox Add-ons (free; upload source and build steps since the code is bundled), Edge Add-ons (free; same zip). Skip Safari. Permissions stay at `activeTab` + `scripting` so review is fast and the install prompt isn't scary.
2. **Listing.** 128px icon, 3–5 screenshots at 1280×800 of tilted famous sites, one-line description, a privacy policy that says "collects nothing" (a README section is enough).
3. **Outside the stores.** Zips on every GitHub Release with load-unpacked steps; the bookmarklet in the README; the npm package.
4. **The post.** A 10-second GIF: a page lifts into layers, a dropdown glows red, the verdict appears. One sentence. The link. Same day on r/webdev, r/css, r/Frontend, Show HN, and emailed to the CSS newsletters.
5. **Repo hygiene before launch.** MIT license, a CONTRIBUTING with the fixture workflow, issue templates for "wrong order on site X" that ask for a snapshot JSON.

Total cost: $5. The listing text and screenshots are an afternoon; the GIF is the part worth doing twice.

## Prerequisites to read

About four hours total. The first three are the ones that matter; the rest are reference for when you reach that part.

| Read                                                                                                                     | Why                                                                                                                                          | Time   |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [MDN: Stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Stacking_context)         | The complete list of what creates a stacking context. The capture script's `scReasons` is this list as code                                  | 20 min |
| [Josh Comeau: What the heck, z-index??](https://www.joshwcomeau.com/css/stacking-contexts/)                              | The best plain-language explanation of the bug this tool diagnoses, with interactive demos. Steal the mental model for the verdict wording   | 25 min |
| [CSS 2 Appendix E: Elaborate description of stacking contexts](https://www.w3.org/TR/CSS2/zindex.html)                   | The actual paint-order algorithm (negative z → blocks → floats → inline → z:auto/0 → positive z). The script implements a simplified version | 30 min |
| [Three.js manual](https://threejs.org/manual/) + [InstancedMesh](https://threejs.org/docs/#api/en/objects/InstancedMesh) | Scene, camera, controls; then instancing, which is how 10k planes stay at 60fps                                                              | 90 min |
| [WXT docs](https://wxt.dev)                                                                                              | Extension framework: entrypoints, content scripts, cross-browser builds, store submission                                                    | 30 min |
| [Chrome: extend DevTools](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools)                  | How a DevTools panel talks to the page and calls `inspect()`                                                                                 | 20 min |
| [Edge DevTools 3D View](https://learn.microsoft.com/microsoft-edge/devtools/3d-view/)                                    | The closest existing product. Try it in Edge on a few sites; note what's confusing                                                           | 15 min |
| [dom3d repo](https://github.com/OrionReed/dom3d)                                                                         | Prior art, 14 KB. Read the issues, not the code (it's GPL; don't copy)                                                                       | 10 min |
| [CDP: LayerTree domain](https://chromedevtools.github.io/devtools-protocol/tot/LayerTree/)                               | Only for v2: how to read composited layers from an extension with the `debugger` permission                                                  | later  |

Also worth knowing before writing the labeler: `Element.getBoundingClientRect` returns the post-transform bounding box; `getComputedStyle(el, '::before')` works for pseudo-elements; `document.elementsFromPoint` is the hit-test primitive; open shadow roots are walkable via `el.shadowRoot`, closed ones are not.

## Current state, next steps and open decisions

As of today the capture half exists and works on real sites; the render half hasn't been started.

**Done:**

- `dom3d-capture.js` v0.2: walks the DOM including shadow roots, detects stacking contexts with reasons, computes paint order, flags ghosts, clipped and scrolled-out elements, hoists the top layer, labels elements with hashed classes filtered out, and exposes `why()`, `stackAt()`, `ladder()`, `find()`, `json()`.
- Tested in a fake-DOM harness (10 checks pass) and by hand on Figma's file browser (1,660 elements, 172 contexts, 12 ms) and YouTube's home page (326 ghosts, 274 will-change contexts, 32 ms).

**Next, in order:**

- [ ] Save `youtube.json` and `figma.json` from `copy(__dom3d.json())` into `fixtures/`
- [ ] Build `apps/viewer`: load a fixture, draw instanced planes at paint-order height, orbit, hover tooltip (v0)
- [ ] Add the lift animation and the explode slider; record the first GIF
- [ ] Add label fallbacks (aria-label, own text) and the React/Vue component-name reader for dev mode
- [ ] Wrap as a WXT content-script overlay; test on 20 sites; collect the ones that break as fixtures
- [ ] Sidebar with grouped contexts, "Why behind?", hit-test, ghosts toggle (v1); post to Reddit
- [ ] DevTools panel, textures, stores (v1.5)

**Open decisions:**

| Decision                           | Options                                                                | Leaning                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Name                               | `dom3d` is taken. Candidates: Strata, Lift, Layerscope, Tiltview, Xray | Pick something short and spatial; check npm and the stores before committing           |
| License                            | MIT vs GPL-3                                                           | MIT: dom3d is GPL, so a clean-room MIT tool is the friendlier choice for the ecosystem |
| First surface                      | Overlay first vs DevTools panel first                                  | Overlay: it is the demo, and the panel reuses everything                               |
| Rendering                          | WebGL (Three.js) vs CSS 3D                                             | Decided: WebGL. CSS 3D is why dom3d goes flat on real sites                            |
| UI framework for sidebar/inspector | Vanilla, Preact, Solid                                                 | Preact or vanilla; keep the content-script bundle small                                |
| Textures                           | Tab screenshot (viewport only) vs CDP full-page capture                | Start with the tab screenshot; full page needs the `debugger` permission               |

**How to hand this to Claude:** share this doc and say "read the DOM3D brief, then build the v0 viewer against `fixtures/youtube.json`". The capture script and the element record table above are the contract between the two halves.
