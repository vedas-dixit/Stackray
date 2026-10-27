/**
 * `pnpm fixtures`: bundle the core capture as an IIFE, open each page from
 * `fixtures.ts` in Chromium, run the capture in the page and save the JSON.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type Browser, chromium } from '@playwright/test';
import { build } from 'vite';
import { type FixtureSource, fixtures } from './fixtures';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = resolve(root, 'fixtures');

async function bundleCapture(): Promise<string> {
  const out = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      target: 'es2022',
      lib: {
        entry: resolve(root, 'packages/core/src/iife.ts'),
        formats: ['iife'],
        name: 'stackray',
        fileName: () => 'stackray.js',
      },
    },
  });
  const first = Array.isArray(out) ? out[0] : out;
  if (first === undefined || !('output' in first)) throw new Error('Vite produced no output');
  const chunk = first.output[0];
  if (chunk.type !== 'chunk') throw new Error('Vite produced no chunk');
  return chunk.code;
}

function isRemote(fixture: FixtureSource): boolean {
  return /^https?:/.test(fixture.source);
}

function urlFor(fixture: FixtureSource): string {
  if (isRemote(fixture)) return fixture.source;
  return pathToFileURL(resolve(fixturesDir, fixture.source)).href;
}

/** The bundled Chromium when it is installed, otherwise the machine's Chrome. */
async function launch(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch {
    console.info('Bundled Chromium is missing; using the installed Chrome instead.');
    return chromium.launch({ channel: 'chrome' });
  }
}

async function main(): Promise<void> {
  const code = await bundleCapture();
  const browser = await launch();
  try {
    await mkdir(fixturesDir, { recursive: true });
    for (const fixture of fixtures) {
      const page = await browser.newPage({ viewport: fixture.viewport });
      await page.goto(urlFor(fixture), { waitUntil: 'load' });
      await page.addScriptTag({ content: code });
      const result = (await page.evaluate('globalThis.__stackray.capture()')) as
        | { ok: true; value: { meta: { url: string; page: { w: number; h: number } } } }
        | { ok: false; error: { message: string } };
      if (!result.ok) {
        await page.close();
        console.error(`${fixture.name}: ${result.error.message}`);
        continue;
      }
      // Record local pages by file name, not the absolute file URL, so a
      // committed snapshot does not carry anyone's home directory.
      if (!isRemote(fixture)) result.value.meta.url = fixture.source;
      // One full-page photo as a single tile, for the viewer's textured mode.
      const png = await page.screenshot({ fullPage: true, type: 'png' });
      await page.close();
      const { page: size } = result.value.meta;
      const shots = [
        {
          dataUrl: `data:image/png;base64,${png.toString('base64')}`,
          rect: { x: 0, y: 0, w: size.w, h: size.h },
        },
      ];
      const file = resolve(fixturesDir, `${fixture.name}.json`);
      await writeFile(file, `${JSON.stringify(result.value, null, 2)}\n`);
      const shotFile = resolve(fixturesDir, `${fixture.name}.shot.json`);
      await writeFile(shotFile, `${JSON.stringify(shots)}\n`);
      console.info(`${fixture.name}: wrote ${file} and ${shotFile}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
