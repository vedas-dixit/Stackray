# Contributing

Read [SPEC.md](SPEC.md) first; it is the plan, and it wins when two documents disagree. [docs/architecture.md](docs/architecture.md) explains the code as it is, [CLAUDE.md](CLAUDE.md) has the code rules, and [STYLEGUIDE.md](STYLEGUIDE.md) covers anything visual.

## Setup

You need Node 22 or newer and pnpm 10. Run `pnpm install`, then `pnpm dev` for the viewer or `pnpm dev:ext` for the extension.

Before you open a pull request, `pnpm test` and `pnpm check` must pass. New behaviour needs a test. If you changed anything visual, also run `pnpm preview:ui` and look at the screenshots it writes to `docs/`.

## Adding a fixture

A fixture is a page plus the snapshot Stackray captures from it. Fixtures are how the renderer is developed and how wrong‑order bugs are reproduced.

1. Put the page in `fixtures/<name>.html` (local pages are preferred; they are deterministic and same‑origin) or add its URL to `scripts/fixtures.ts`.
2. Run `pnpm fixtures`. Playwright opens each page, runs the `@stackray/core` capture and writes `fixtures/<name>.json` plus a full-page photo in `fixtures/<name>.shot.json`.
3. Add a test in `packages/core/test` that asserts the fact the fixture exists to prove.
4. Commit the page and both JSON files. Keep each snapshot under 2 MB.

## Reporting a wrong order on a site

Open an issue with the site URL and the two elements that are ordered wrong. A snapshot helps a lot: add the URL to `scripts/fixtures.ts` and run `pnpm fixtures`. A snapshot holds the page URL and title, ids, classes, `aria-label`s and short pieces of element text, and the `.shot.json` file is a picture of the page, so check both before you attach them.

## Commits

Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), one concern per commit. Add a changeset (`pnpm changeset`) for anything user‑visible.
