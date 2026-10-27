/**
 * Copy the three font files the overlay embeds into the extension's public
 * dir, so they ship as web-accessible resources instead of bundle bytes.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const OUT = resolve(import.meta.dirname, '../apps/extension/public/fonts');

/** Package file → public name. Keep in step with `apps/extension/src/fonts.ts`. */
const FILES: Record<string, string> = {
  '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2':
    'instrument-serif-400.woff2',
  '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2':
    'instrument-serif-400-italic.woff2',
  '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2':
    'jetbrains-mono-wght.woff2',
};

mkdirSync(OUT, { recursive: true });
for (const [source, name] of Object.entries(FILES)) {
  const pkg = source.split('/files/')[0] ?? source;
  const pkgRoot = dirname(
    require.resolve(`${pkg}/package.json`, {
      paths: [resolve(import.meta.dirname, '../packages/ui')],
    }),
  );
  copyFileSync(resolve(pkgRoot, source.slice(pkg.length + 1)), resolve(OUT, name));
}
console.log(`fonts copied to ${OUT}`);
