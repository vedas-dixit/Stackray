import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'wxt';

/**
 * Permissions stay at `activeTab` + `scripting` (SPEC.md §8). The content
 * script is injected on demand from the background worker, so no page is
 * touched until the user clicks the toolbar icon.
 */
export default defineConfig({
  // Firefox gets Manifest V3 as well. Its V2 manifest has no `action` API,
  // which the background script uses for the toolbar button and the badge.
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Stackray',
    description:
      'Lift any web page into a 3D stack of its layers. See stacking contexts, z-index, clipping and invisible overlays.',
    permissions: ['activeTab', 'scripting'],
    action: { default_title: 'Stackray: lift this page' },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Alt+Shift+S' },
        description: 'Lift or restore the page',
      },
    },
    web_accessible_resources: [
      {
        resources: ['fonts/*'],
        matches: ['<all_urls>'],
      },
    ],
    // Firefox needs an id to sign a V3 extension and, for listings submitted
    // after November 2025, a data collection declaration. Stackray collects
    // nothing (PRIVACY.md). Firefox 140 is the first version that reads the
    // declaration. The id is permanent once the first version is signed.
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'stackray@vedasdixit.com',
              strict_min_version: '140.0',
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }),
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      // WXT adds host_permissions for runtime content scripts. activeTab is
      // all we need: the script is injected on click with executeScript.
      manifest.host_permissions = undefined;
    },
  },
  zip: {
    // Mozilla rebuilds the Firefox upload from the sources zip and diffs the
    // result, so the zip has to hold the whole workspace, not only this app:
    // the packages are consumed from source, the fonts come from a root
    // script and pnpm needs every workspace package.json to accept the
    // lockfile. Images, fixtures and tests are not part of the build.
    sourcesRoot: fileURLToPath(new URL('../..', import.meta.url)),
    includeSources: [
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'tsconfig.base.json',
      'README.md',
      'LICENSE',
      'PRIVACY.md',
      'scripts/copy-fonts.ts',
      'apps/*/package.json',
      'apps/extension/**',
      'packages/*/**',
    ],
    excludeSources: ['**/test/**', 'apps/extension/public/fonts/**'],
  },
  vite: () => ({
    plugins: [preact()],
    build: { target: 'es2022' },
  }),
});
