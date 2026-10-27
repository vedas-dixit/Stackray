# CLAUDE.md — the contract for every session on Stackray

## Before you start

1. Read [SPEC.md](SPEC.md). It wins over anything else, including this file. [docs/architecture.md](docs/architecture.md) explains how the code fits together today.
2. Read [STYLEGUIDE.md](STYLEGUIDE.md) before touching anything visual, and [docs/motion.md](docs/motion.md) before touching anything that moves.
3. Run `pnpm test` and `pnpm check`. Both must be green before and after your change.

## The product

Stackray is a browser extension that lifts any web page into a 3D stack of its layers, inside a retro‑Mac window on top of the tab. It shows what the browser sees: stacking contexts, z‑index, clipping and the invisible overlays sitting on top of everything. It answers five questions in one sentence each: why is my dropdown behind something · why can't I click this · where did my element go · what is on top of everything · is this page div soup.

## Architecture rules

- `packages/core` is a pure function page → snapshot. It is the only code that reads the DOM. Errors are returned values (`Result`), never thrown.
- `packages/renderer` only ever sees a snapshot. It never touches the host DOM.
- `packages/ui` only ever sees a snapshot plus view state. It lives in a Shadow DOM with its own fonts and tokens; nothing leaks in or out.
- `apps/*` are thin shells that decide where the canvas lives and how the user gets in and out. No logic in wrappers.
- The extension makes zero network requests. Permissions are `activeTab` and `scripting`. Adding a permission is a SPEC.md change first.
- The one thing the extension may add to the host document is a `<style>` with `@font-face` rules (fonts do not load from inside a shadow root in every browser). Nothing else touches the page. While the stage is open it is modal: keys are swallowed before they reach the page.

## The element record

`packages/core/src/types.ts` is the contract between core and everything else. SPEC.md §7 is its human copy. Change SPEC.md first, then the type, then bump `SNAPSHOT_VERSION`.

| Field                                          | Meaning                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `i`, `parent`, `depth`                         | Tree position; children are rebuilt from `parent`                                              |
| `tag`, `id`, `cls`, `sel`                      | Identity; `sel` is the ≤30‑char display label after hashed classes are filtered out            |
| `rect {x, y, w, h}`                            | Document coordinates; the root uses the page's scroll size                                     |
| `empty`, `ghost`                               | Zero‑size; invisible (opacity 0 / visibility hidden) but present                               |
| `style {…}`                                    | position, zIndex, display, opacity, visibility, pointerEvents, overflow, transform, background |
| `sc`, `scReasons`, `scParent`                  | Creates a stacking context; the exact CSS reasons; the nearest context above it                |
| `positioned`, `z`                              | position is not static; effective z (0 for opacity/transform contexts, null if none)           |
| `clipBy`, `clipKind`, `clipped`, `scrolledOut` | Nearest overflow ancestor; hidden vs scroll; entirely outside it                               |
| `iframe`, `shadow`, `topLayer`                 | Opaque leaf; inside a shadow root; modal dialog / open popover / fullscreen                    |
| `paint`                                        | Global paint index, back to front; the Z axis in stacking mode                                 |

## Budgets

| Budget                  | Limit                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| Capture, 5 000 elements | < 50 ms                                                            |
| Render                  | 60 fps at 10 000 planes                                            |
| Snapshot                | < 2 MB                                                             |
| Content‑script bundle   | < 300 KB gzipped (fonts are web‑accessible resources, not bundled) |
| Permissions             | `activeTab` + `scripting`                                          |

## Code rules

- TypeScript strict, ESM only, Node 22+. No `any`. `noUncheckedIndexedAccess` is on; handle the `undefined`.
- Named exports everywhere except entrypoints (Vite, WXT, Playwright configs).
- Small modules with one job. If a file does not fit on one screen, split it.
- No classes except where Three.js requires one. Preact components are functions.
- Every public function has a doc comment with an `@example`.
- Inside `core`, errors are returned values, never thrown. Elsewhere, throw only for programmer errors.
- Relative imports are extensionless; packages are consumed from source via `exports`.
- Biome formats and lints. Do not fight it; run `pnpm format`.

## Test rules

- `core` is tested against the fake‑DOM harness in `packages/core/test/harness.ts` and against saved fixtures. Never against a real browser in unit tests.
- `renderer` has pure tests for layout, modes, atlas packing, the locate pulse and the spring; the frame-time smoke test lives in `apps/viewer/e2e/live.spec.ts` because WebGL needs a browser.
- The canonical stacking cases must stay green: negative z · trapped z · flex‑item z · fixed vs positive z · equal z by DOM order · clipped vs scrolled‑out · top‑layer hoisting · label fallbacks.
- No test, no merge.

## UI rules

- The whole overlay lives in a closed Shadow DOM with embedded fonts and its own tokens. Nothing from the host page leaks in or out.
- Dark viewport inside light chrome. Always.
- Keyboard for everything; `?` lists the keys. Esc always exits and restores the page.
- No onboarding. The shrink‑and‑lift animation is the onboarding.
- Labels are capped at 30 characters. Numbers use a thin space as thousands separator.
- Red is reserved for problems. Every color mode has a legend.
- Respect `prefers-reduced-motion`: durations go to 0 and the open/close becomes a crossfade.
- Copy is sentence case, no exclamation marks, no emoji. Verdicts are one sentence.

## How to

**Add a fixture.** Put the page in `fixtures/<name>.html` or add a URL to `scripts/fixtures.ts`, run `pnpm fixtures`, add a test that uses it, commit both files. See CONTRIBUTING.md.

**Run the extension unpacked.** `pnpm dev:ext` starts WXT, which opens Chrome with the extension loaded and reloads on change. Click the toolbar icon or press Alt+Shift+S on any page. For Firefox: `pnpm --filter @stackray/extension dev:firefox`.

**See the UI without a page.** `pnpm dev` opens the viewer; `/?fixture=broken-dropdown` renders the fixture with the real renderer and `/#preview` shows every component in every state. `pnpm preview:ui` runs the Playwright suite, which refreshes the `docs/ui-preview*.png` screenshots and asserts the live frame budget.

**Cut a release.** `pnpm changeset` to describe the change, merge, `pnpm changeset version` to bump versions, then `pnpm release` (builds everything, publishes, tags). Store zips come from `pnpm --filter @stackray/extension zip`.

## Commits

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`. One concern per commit. Commit at the end of each phase of work, not at the end of the session.
