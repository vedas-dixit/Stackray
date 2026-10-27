import preact from '@preact/preset-vite';
import { defineConfig } from 'wxt';

/**
 * Permissions stay at `activeTab` + `scripting` (SPEC.md §8). The content
 * script is injected on demand from the background worker, so no page is
 * touched until the user clicks the toolbar icon.
 */
export default defineConfig({
  manifest: {
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
  },
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      // WXT adds host_permissions for runtime content scripts. activeTab is
      // all we need: the script is injected on click with executeScript.
      manifest.host_permissions = undefined;
    },
  },
  vite: () => ({
    plugins: [preact()],
    build: { target: 'es2022' },
  }),
});
