# How Stackray works

A walk through the code, file by file, for anyone who wants to change it. [SPEC.md](../SPEC.md) is the plan and wins when the two disagree. [STYLEGUIDE.md](../STYLEGUIDE.md) covers the look and [motion.md](motion.md) the animation.

## 1. The big picture

Everything in Stackray flows in one direction:

```
 the live page
      │
      ▼
 ┌──────────┐    reads the DOM once, writes down          ┌─────────────┐
 │  core    │──▶ a "snapshot": a plain JSON description ──▶│  renderer   │  draws the snapshot
 │ (capture)│    of every element and its stacking facts   │ (Three.js)  │  as 3D planes
 └──────────┘                                              └─────────────┘
                                                                 ▲
                                                           ┌─────┴───────┐
                                                           │     ui      │  the windows, the tree,
                                                           │  (Preact)   │  sliders, inspector
                                                           └─────┬───────┘
                                                                 ▲
                                         ┌───────────────────────┴───────────────────────┐
                                         │  apps: extension · viewer · site               │
                                         │  thin shells that decide where the UI lives   │
                                         └───────────────────────────────────────────────┘
```

Three rules keep this simple:

1. **Only `core` reads the page.** It walks the DOM once and produces a snapshot. The renderer and the UI never see the DOM; the extension shell only scrolls the page for the photos and mounts the stage over it.
2. **The renderer and the UI only ever see a snapshot.** That is why the same code runs inside the extension, inside the viewer web page, and later inside a DevTools panel.
3. **Apps are thin.** The extension, the viewer and the site just mount the UI somewhere and hand it a snapshot.

A snapshot is just JSON. You can save it to a file, load it later, diff two of them, or send one in a bug report.

## 2. Where things are

```
stackray/
  packages/
    core/        reads the page → snapshot. The only code that knows what a DOM is.
    renderer/    snapshot → 3D planes on a canvas (Three.js).
    ui/          the windows, layer tree, filters, sliders, inspector (Preact components + CSS tokens).
  apps/
    extension/   the browser extension (built with WXT).
    viewer/      a web page that loads a snapshot and shows it. The dev loop and test bed.
    site/        the landing page. A placeholder for now.
  fixtures/      saved snapshots and the HTML pages they came from.
  scripts/       small tools: capture fixtures, copy fonts, make icons.
  docs/          this file, the motion spec, screenshots, the original brief.
```

Each `packages/*` folder is a workspace package named `@stackray/core`, `@stackray/renderer` or `@stackray/ui`. They are consumed directly from source, with no build step between them. pnpm links them together as a workspace.

## 3. What happens when you click the icon

This is the full path through the extension, file by file.

### 3.1 The background worker

[apps/extension/entrypoints/background.ts](../apps/extension/entrypoints/background.ts) is the extension's service worker. It does three small things:

- **On toolbar click** it injects the content script into the current tab with `browser.scripting.executeScript`. The content script is not listed in the manifest, so the extension never runs on a page until you click. This is what lets the permissions stay at `activeTab` and `scripting` only, and it is why the install prompt is not scary. If the script is already in the page from an earlier click, the worker sends it a `stackray:toggle` message instead of injecting it again.
- **On a `stackray:screenshot` message** it calls `captureVisibleTab` and sends back a PNG of the visible tab as a data URL.
- **On a `stackray:progress` message** it writes the count on the toolbar badge.

On browser pages (`chrome://` and the like) it shows `n/a` on the badge instead, because no extension can run there.

### 3.2 The content script

[apps/extension/entrypoints/stackray.content.ts](../apps/extension/entrypoints/stackray.content.ts) is tiny. It calls `toggleStage()` from [apps/extension/src/stage.tsx](../apps/extension/src/stage.tsx), on first injection and again on every `stackray:toggle` message. If the stage is open, it closes it. Otherwise it opens it.

### 3.3 Opening the stage

`toggleStage()` runs these steps in order:

1. **Capture.** It calls `captureDocument(document)` from `@stackray/core/browser`. This walks the page and returns the snapshot plus two helper functions: `elementAt(index)` to get the real element back from a record, and `indexOf(element)` for the other direction.
2. **Photos.** It scrolls the page screen by screen and asks the background worker for a capture at each stop ([src/screenshot.ts](../apps/extension/src/screenshot.ts)), starting with the screen you are looking at, then from the top down, up to 6 screens. Captures are spaced at least 550 ms apart because Chrome allows two a second. At each stop it waits up to 1.4 s for the images in view to finish loading, because lazy loaders only start fetching once something is on screen. Progress shows as a count on the toolbar badge (anything drawn on the page would end up in the photo). The scroll position is put back afterwards. If a capture is refused it carries on with what it has.
3. **Fonts.** [src/fonts.ts](../apps/extension/src/fonts.ts) adds one `<style>` tag with three `@font-face` rules to the page's `<head>`. The font files ship inside the extension and are listed as `web_accessible_resources`. It is there because fonts declared only inside a shadow root do not load in every browser.
4. **The host.** It creates a `<stackray-stage>` element, fixed to cover the whole tab, with `all: initial` so the page's CSS cannot leak into it. It attaches a **closed Shadow DOM** to it and puts the stylesheet (tokens plus components) and a mount point inside. The page cannot style Stackray and Stackray cannot style the page.
5. **Render.** It renders `<StackrayApp>` (from `@stackray/ui`) into the mount point with the snapshot, the screenshots, the page's host name, and `open="full"` so the shrink‑and‑lift animation plays.
6. **Keys.** While the stage is open it is modal: a capture‑phase listener on `window` stops key events from reaching the page, so pressing `L` opens the ladder instead of, say, YouTube's "seek forward".

### 3.4 Closing

When you press Esc, click the red dot, or double‑click a plane, `StackrayApp` runs the close animation and then calls `onExit`. Clicking the toolbar icon again, or pressing Alt+Shift+S, calls the same teardown straight away. The content script unmounts Preact, removes the `<stackray-stage>` element and the key listeners, and gives focus back to whatever had it before. What stays behind is the font `<style>` tag and the saved pane sizes in the page's `localStorage` (see Privacy in the README).

Double‑click also calls `flashElement` ([src/flash.ts](../apps/extension/src/flash.ts)). It scrolls the real element into view and draws an amber outline over it in a second tiny shadow host that removes itself after a second. The element itself is never styled.

### 3.5 The manifest

[apps/extension/wxt.config.ts](../apps/extension/wxt.config.ts) generates the manifest. The important bits:

| Field                      | Value                                            | Why                                                                                     |
| -------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `permissions`              | `activeTab`, `scripting`                         | Enough to inject on click and to take the screenshot. Nothing else.                     |
| `host_permissions`         | none                                             | WXT wanted to add `<all_urls>` for the runtime content script; a build hook removes it. |
| `action`                   | toolbar button, title "Stackray: lift this page" | The one entry point.                                                                    |
| `commands`                 | Alt+Shift+S                                      | Same as clicking the icon.                                                              |
| `web_accessible_resources` | `fonts/*`                                        | So the page can load the fonts.                                                         |

WXT is the build tool for the extension. `pnpm dev:ext` runs it with a fresh Chrome profile that reloads on every change. `pnpm --filter @stackray/extension build` writes a loadable extension to `apps/extension/.output/chrome-mv3`. Fonts are copied into `public/fonts` before every build by [scripts/copy-fonts.ts](../scripts/copy-fonts.ts); that folder is not committed.

## 4. Core: how the page becomes a snapshot

Everything lives in [packages/core/src](../packages/core/src). The design idea: the capture logic never imports browser types. It reads through a small adapter, so the same logic can be tested in Node with fake trees.

### 4.1 Files

| File          | Job                                                                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`    | The snapshot and element record types. This is the contract everyone else depends on.                                                                                                                                        |
| `dom.ts`      | The adapter: `DomElement` and `DomPage`. A minimal description of what capture needs from an element (tag, id, classes, rect, a handful of style values, children, shadow children).                                         |
| `browser.ts`  | Wraps a real `Document` into the adapter (`captureDocument`). One `getComputedStyle` and one `getBoundingClientRect` per element. Also `hitTest` for "what is under this point". This is the only file that touches the DOM. |
| `capture.ts`  | Walks the adapter tree once and builds the element records, then calls the modules below to fill in the stacking facts.                                                                                                      |
| `stacking.ts` | Decides whether an element creates a stacking context and why, and what its effective z‑index is.                                                                                                                            |
| `paint.ts`    | Computes the paint order: which element is drawn first, which last.                                                                                                                                                          |
| `clip.ts`     | Finds which ancestor clips each element and whether it is cut off or just scrolled out of view.                                                                                                                              |
| `labels.ts`   | Builds the short display label for each element.                                                                                                                                                                             |
| `why.ts`      | The one‑sentence verdict: why element A is behind element B.                                                                                                                                                                 |
| `ladder.ts`   | The z‑index ladder: the contexts that compete directly under the root, sorted.                                                                                                                                               |
| `result.ts`   | A small `Result` type. Core never throws; it returns `{ ok: false, error }`.                                                                                                                                                 |
| `iife.ts`     | A bundle entry that puts `globalThis.__stackray.capture()` on a page. Used by the fixture script.                                                                                                                            |

### 4.2 The snapshot

```jsonc
{
  "meta": { "url": "...", "title": "...", "viewport": {...}, "page": {...}, "scroll": {...}, "dpr": 2, "capturedAt": "...", "captureMs": 9, "version": 1 },
  "elements": [ /* one record per element, in document order */ ],
  "paintOrder": [ /* element indices, back to front */ ]
}
```

Each element record has these fields. The full table is in SPEC.md §7; here is what they mean in plain words.

| Field                                          | Plain meaning                                                                                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `i`, `parent`, `depth`                         | Its position in the tree. Children are rebuilt from `parent`.                                                                                             |
| `tag`, `id`, `cls`, `sel`                      | What it is. `sel` is the label you see in the UI, at most 30 characters.                                                                                  |
| `rect`                                         | Where it is on the page, in CSS pixels from the top‑left of the document.                                                                                 |
| `empty`                                        | It has zero width or height. Hidden by default.                                                                                                           |
| `ghost`                                        | It is there but invisible: `opacity: 0` or `visibility: hidden`. These are the invisible overlays that block clicks.                                      |
| `style`                                        | The handful of computed style values kept: position, z‑index, display, opacity, visibility, pointer‑events, overflow, transform, background.              |
| `sc`, `scReasons`, `scParent`                  | Whether it starts a stacking context, the CSS reasons (like `transform`), and which context it lives inside.                                              |
| `positioned`, `z`                              | Whether `position` is not static, and its effective z‑index.                                                                                              |
| `clipBy`, `clipKind`, `clipped`, `scrolledOut` | Which ancestor clips it, whether that ancestor hides or scrolls, and whether the element is fully outside it.                                             |
| `iframe`, `shadow`, `topLayer`                 | It is an iframe (Stackray does not look inside), it lives in a shadow root, or it is in the browser's top layer (modal dialog, open popover, fullscreen). |
| `paint`                                        | Its position in the paint order. This is the height of its plane in 3D.                                                                                   |

### 4.3 Stacking contexts, in one paragraph

The browser does not paint elements in document order. It groups them into **stacking contexts**. An element starts a new context when it has `position` plus a `z-index`, or `opacity` below 1, or a `transform`, a `filter`, `isolation: isolate`, `will-change`, and a few more. Inside a context, children are painted in this order: negative z‑index, then normal flow, then z‑index auto or 0, then positive z‑index. The important part: **a z‑index only competes with its siblings inside the same context.** A `z-index: 9999` dropdown inside a card with `transform` can never escape the card. The card as a whole has z 0 and sits below the header with z 10. That is the bug Stackray exists to show. `stacking.ts` lists the reasons; `paint.ts` applies the order recursively and hands out one global paint number per element. Top‑layer elements (modal dialogs) are painted last.

### 4.4 Labels

`labels.ts` picks a label in this order: `id` → `data-testid` → custom element tag (anything with a dash) → `aria-label` → readable classes → the element's own text → the tag name. "Readable" means hashed classes like `css-1a2b3c` or `x7f9q2` are thrown away so `div.card` shows instead of `div.css-1a2b3c`. Labels are cut at 30 characters with an ellipsis.

### 4.5 The verdict

`why(snapshot, a, b)` walks both elements up through their stacking contexts to the one they share, compares them there, and writes one sentence. For the fixture it says:

> `div.dropdown` (z 9999) is trapped inside `section.card.transformed`, which creates a stacking context via transform, so it paints behind `header#header` (z 10).

The "Why behind?" two‑pick mode in the UI is not wired yet; the function is ready and tested.

### 4.6 Testing core without a browser

[packages/core/test/harness.ts](../packages/core/test/harness.ts) lets you write fake pages like code:

```ts
const root = el('html', {}, [
  el('header', { id: 'header', style: { position: 'sticky', zIndex: '10' } }),
  el('section', { classes: ['card'], style: { transform: 'translateZ(0)' } }, [
    el('div', { classes: ['dropdown'], style: { position: 'absolute', zIndex: '9999' } }),
  ]),
]);
```

The tests in `packages/core/test` cover the canonical stacking cases (negative z, trapped z, flex‑item z, fixed vs positive z, equal z resolved by DOM order), clipping, labels, the verdict, and a budget test that captures about 5 000 fake elements and expects it to take under 50 ms. Against the fake DOM it takes a few milliseconds, because there are no real `getComputedStyle` calls to pay for. `fixture.test.ts` loads `fixtures/broken-dropdown.json`, captured from Chromium, and checks the same facts against a real browser's answers.

## 5. Renderer: how a snapshot becomes 3D

Everything lives in [packages/renderer/src](../packages/renderer/src). It uses Three.js and never touches the page.

| File         | Job                                                                                                                                                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout.ts`  | Pure math. Turns each element's `rect` and paint number into a plane: center x, center y, height z, width, height. Options: which axis drives height (overlap level, paint order or DOM depth), explode amount, hide empty, hide ghosts, depth cutoff.                      |
| `modes.ts`   | Pure color logic. Given an element and a mode, returns a fill color and an edge color. Five modes: depth, context, heat, problems, plain. Ghosts and clipped elements are red in every mode.                                                                                |
| `palette.ts` | The colors the renderer needs, as plain hex values. The UI passes its own tokens in so both stay in step.                                                                                                                                                                   |
| `spring.ts`  | A damped spring. This is what makes the lift overshoot a little and settle.                                                                                                                                                                                                 |
| `locate.ts`  | The timing of the "locate" pulse after a selection: everything else dims, the chosen plane blinks, the rest fade back.                                                                                                                                                      |
| `shader.ts`  | The small GLSL program that draws a plane: a translucent fill, a 1.5 px edge, dashes for clipped elements, and brighter colors for the hovered and selected plane.                                                                                                          |
| `planes.ts`  | Puts every plane into **one** Three.js `InstancedMesh`. Ten thousand planes are one draw call. Colors and sizes live in per‑instance buffers.                                                                                                                               |
| `camera.ts`  | A perspective camera with `OrbitControls`. Knows how to fit a page, look straight down, and glide to the "home" angle.                                                                                                                                                      |
| `scene.ts`   | Ties it together: the WebGL renderer, the render loop, hover and click via raycasting, the lift animation, the locate pulse, the photo tiles under the stack and textured mode.                                                                                             |
| `atlas.ts`   | Textured mode. Picks the leaves and replaced elements (containers stay outlines), cuts each one's rectangle out of the photo tiles and shelf-packs the crops into one 4096² canvas. The shader samples it per plane. Built in the background so a big page does not freeze. |

The scene's public API is small: `setSnapshot`, `setLayout`, `setMode`, `setSelected`, `locate`, `setScreenshots`, `setTextured`, `setFocus`, `setExplode`, `lift`, `topDown`, `home`, `orbit`, `getStats`, `dispose`. The UI calls these; nothing else.

Coordinates: one scene unit is one CSS pixel. The page lies flat on the ground like a sheet of paper. Planes are slabs that lift along the up axis. Height is an overlap level, not a raw paint index: each element sits one level above the highest thing under it (its parent, or anything painted earlier that it covers), and elements that do not overlap share a level. So a row of thumbnails lies flat while a dropdown over a header rises above it, and wherever two things overlap the one painted later is higher. Each level is a fixed gap of about 4.5 % of the page width; the explode slider (0 to 200 %, starting at 50 %) scales that gap and the slab thickness together.

Hover works by casting a ray from the mouse into the scene and asking the instanced mesh which plane it hit. That is why hovering never needs the DOM.

## 6. UI: the windows and controls

Everything lives in [packages/ui/src](../packages/ui/src). It is Preact (a 4 KB React) with plain CSS and CSS variables.

### 6.1 Tokens

[tokens.css](../packages/ui/src/tokens.css) holds every color, font, size, radius, duration and easing as a CSS variable prefixed `--sr-`. [tokens.ts](../packages/ui/src/tokens.ts) has the same values for code that cannot read CSS (the renderer, the spring). Change a color in both places. STYLEGUIDE.md explains where each value came from.

### 6.2 Components

One file per component in `components/`. The ones that matter most:

| Component                                                                                          | What it is                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Window`                                                                                           | The retro‑Mac frame: 1 px brown border, 10 px corners, a title bar with dots and an uppercase mono title.                                                                                            |
| `Dots`                                                                                             | The three traffic lights, or the single dot of a pane. Red closes. Yellow and green are drawn but do nothing yet.                                                                                    |
| `Pane`                                                                                             | A one‑dot window for the tools (right) or info (bottom). Clicking its dot collapses it to a thin tab.                                                                                                |
| `Splitter`                                                                                         | The drag gap between windows. Arrow keys also resize it.                                                                                                                                             |
| `Stage`                                                                                            | The layout from the original sketch: the viewport window, the tools pane, the info pane, and the splitters, on a cream background. Remembers sizes in `localStorage`. Handles `]`, `_`, `Z` and Esc. |
| `LayerTree`                                                                                        | The rows in the layers pane: indent by depth, a badge with the stacking reason, `×36` for repeated siblings.                                                                                         |
| `Filters`, `Toggle`, `Slider`                                                                      | The controls.                                                                                                                                                                                        |
| `Inspector`, `Verdict`, `Ladder`                                                                   | The info pane contents.                                                                                                                                                                              |
| `Tooltip`, `Legend`, `Kbd`, `KeyList`, `EmptyState`, `ShareCard`, `Icon`, `PixelStack`, `Squiggle` | The rest.                                                                                                                                                                                            |

### 6.3 The app

`app/StackrayApp.tsx` is the whole tool in one component. It owns the state (selected element, color mode, filters, explode, depth cutoff, collapsed groups, which info view is showing) and composes everything into a `Stage`. It also runs the open and close sequences:

- **Open, `full`** (the extension): the viewport window starts stretched over the whole stage with the stack flat and the camera straight down. It animates down into its cell over 400 ms (this is "the page shrinks into the window"). Then the panes fade in, the camera tilts to the home angle, and the planes spring apart over about 600 ms.
- **Open, `lift`** (the viewer): only the tilt and the spring.
- **Close** reverses it: planes flatten, camera returns to straight down, the window grows back over the tab, and then `onExit` fires.
- With `prefers-reduced-motion` nothing moves; things just appear.

`app/Viewport.tsx` owns the canvas. It creates the renderer scene on mount, feeds it props as they change, and draws the hover tooltip. `app/ModePicker.tsx` is the row of five mode buttons.

### 6.4 Models

`model/` holds pure functions the app uses: `buildTreeRows` (filtering, grouping and collapsing for the tree), `search` (ranked matching: exact, prefix, token prefix, initials like `wsm` for `welcome-screen-menu`, substring, then letters in order with gaps), `inspectorData` (what the inspector shows for an element), `legends` (one legend per mode), `format` (thin‑space thousands and the window title), `layout-state` (saving pane sizes), `keys` (the list behind `?`). The tree and search have unit tests in `packages/ui/test`.

## 7. The viewer app

[apps/viewer](../apps/viewer) is a normal Vite web page. It is where you develop without a browser extension in the loop.

- `pnpm dev` opens it. Drop any snapshot JSON onto the window and the real tool renders it. Or open `/?fixture=broken-dropdown` to load the saved fixture straight away.
- `/#preview` is the tokens‑and‑components page: every component in every state, built with the real stylesheet. The screenshots in `docs/` come from here.
- `e2e/` holds Playwright tests. `preview.spec.ts` screenshots the components page and checks the keys. `live.spec.ts` loads the fixture, measures the frame time over 60 frames, clicks a tree row to check the inspector, and tries the search and textured mode. Run them with `pnpm preview:ui`.

## 8. Fixtures

A fixture is a page plus the snapshot captured from it. [fixtures/broken-dropdown.html](../fixtures/broken-dropdown.html) is a small page built to contain every case the tests cover: a trapped dropdown, a negative z, twins with equal z, a flex item with z, a clipped child, a scrolled‑out child, an invisible full‑screen overlay, a modal dialog, a shadow root, hashed class names.

`pnpm fixtures` runs [scripts/capture-fixture.ts](../scripts/capture-fixture.ts): it bundles core, opens each page from [scripts/fixtures.ts](../scripts/fixtures.ts) in headless Chromium, runs the capture inside the page, and writes `fixtures/<name>.json` plus a full-page photo in `fixtures/<name>.shot.json`. To add a real site, add its URL to `scripts/fixtures.ts`, run the script, and review the JSON before committing it. Snapshots keep each element's own text only as a fallback label (cut to 30 characters), never the page's full text, but the photo is a real picture of the page.

## 9. How to do common things

**Change a color or a size.** Edit `packages/ui/src/tokens.css` and mirror it in `tokens.ts`. Every component reads the variables, so nothing else changes.

**Add a component.** New file in `packages/ui/src/components`, export it from `src/index.ts`, add its styles to `components.css` with an `sr-` prefix, and show every state of it on the preview page in `apps/viewer/src/preview/preview.tsx`. Run `pnpm preview:ui` to see it.

**Add a color mode.** Add the name to `ColorMode` and `colorModes` in `packages/renderer/src/modes.ts`, a branch in `planeColor`, a legend in `packages/ui/src/model/legend.ts`, and a test in `packages/renderer/test/modes.test.ts`.

**Add a field to the element record.** Change SPEC.md §7 first, then `packages/core/src/types.ts`, then bump `SNAPSHOT_VERSION`, then fill it in `capture.ts` and the harness defaults in `test/harness.ts`.

**Add a keyboard shortcut.** Handle it in `StackrayApp.tsx` (`onKey`) or `Stage.tsx` (`onKey`), and add it to `packages/ui/src/model/keys.ts` so `?` lists it.

**Add a stacking‑context reason.** `packages/core/src/stacking.ts`, `stackingReasons`. Add a harness test.

**Debug the extension.** `pnpm dev:ext`, then in the opened Chrome: right‑click the page → Inspect → Console shows content‑script errors; `chrome://extensions` → Stackray → "service worker" shows background errors.

## 10. Checks before you call anything done

- `pnpm test` and `pnpm check` are green.
- No `any`, named exports, small files, a doc comment with an `@example` on every public function. Biome enforces the formatting; do not fight it.
- Core returns errors, never throws.
- Nothing in the renderer or UI touches the host page.
- Permissions are still `activeTab` and `scripting`.
- The content‑script bundle stays under 300 KB gzipped (about 170 KB at the moment). Check with `gzip -c apps/extension/.output/chrome-mv3/content-scripts/stackray.js | wc -c` after a build.

## 11. Judgement calls in core

These are deliberate, and the code has comments where they happen: fixed elements escape every clipper; `html` and `body` never clip; `svg`, `canvas`, `video`, `object` and `embed` are treated as leaves; a non‑modal open `<dialog>` is not counted as top layer because the browser does not count it either.

## 12. Glossary

- **Stacking context.** A group of elements the browser paints together as one unit. z‑index only works between siblings inside the same context.
- **Paint order.** The order the browser draws things, back to front. The Z axis of the 3D view.
- **Ghost.** An element that is present but invisible (`opacity: 0` or `visibility: hidden`). Often the reason "I can't click this".
- **Clipped.** Cut off by an ancestor with `overflow: hidden`. **Scrolled out** is the same with `overflow: scroll` or `auto`; you could scroll to it.
- **Top layer.** Where the browser puts modal dialogs, open popovers and fullscreen elements. Always on top of everything.
- **Snapshot.** The JSON description of a page that core produces and everything else consumes.
- **Content script.** Extension code that runs inside a web page. Stackray's is injected only when you click.
- **Service worker.** The extension's background code. Stackray's injects the content script and takes screenshots.
- **Shadow DOM.** A private DOM subtree with its own styles. The whole UI lives in one so page CSS and Stackray's CSS never mix.
- **Instanced mesh.** One GPU object that draws the same shape many times with different positions and colors. Why 10 000 planes is one draw call.
- **Fixture.** A saved snapshot used by tests and by the viewer.
