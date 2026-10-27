import { toggleStage } from '../src/stage';

/**
 * The stage. Injected at runtime (not declared in the manifest) so the
 * extension never runs on a page the user did not ask about. It is injected
 * once per page; later clicks arrive as a `stackray:toggle` message, so the
 * bundle (and Three.js inside it) is never evaluated twice.
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime',
  main() {
    browser.runtime.onMessage.addListener((message: unknown) => {
      if (isToggle(message)) void toggleStage();
    });
    void toggleStage();
  },
});

function isToggle(message: unknown): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'stackray:toggle'
  );
}
