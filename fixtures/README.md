# Fixtures

A fixture is a page plus the snapshot Stackray captures from it. `pnpm fixtures` regenerates every `*.json` here from the pages listed in `scripts/fixtures.ts`.

| Fixture                     | What it is                                                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `broken-dropdown.html`      | The five canonical stacking cases in one page: trapped z, negative z, fixed vs positive z, equal z by DOM order, flex‑item z; plus a ghost overlay, a clipped child, a scrolled‑out child, a top‑layer dialog and a shadow root |
| `broken-dropdown.json`      | The snapshot captured from it in Chromium. `packages/core/test/fixture.test.ts` checks it                                                                                                                                       |
| `broken-dropdown.shot.json` | A full-page photo of it, used by the viewer's textured mode                                                                                                                                                                     |

Captures of real sites (YouTube, Figma, GitHub) are planned for checking the renderer budget, but none are committed yet.

A snapshot holds the page URL and title, ids, classes, `aria-label`s and up to 30 characters of an element's own text, and a `.shot.json` is a picture of the page. Review both before committing a capture of a real site. Keep each snapshot under 2 MB.
