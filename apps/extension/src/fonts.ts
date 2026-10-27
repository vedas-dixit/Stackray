import { browser } from 'wxt/browser';

const STYLE_ID = 'stackray-fonts';

/**
 * The one thing Stackray leaves in the host document after the stage closes:
 * `@font-face` rules pointing at the extension's own font files. Fonts
 * declared only inside a shadow root do not load in every browser. Idempotent.
 *
 * @example
 * ensureFonts();
 */
export function ensureFonts(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const serif = browser.runtime.getURL('/fonts/instrument-serif-400.woff2');
  const serifItalic = browser.runtime.getURL('/fonts/instrument-serif-400-italic.woff2');
  const mono = browser.runtime.getURL('/fonts/jetbrains-mono-wght.woff2');
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
@font-face { font-family: 'Instrument Serif'; font-style: normal; font-weight: 400; font-display: swap; src: url(${serif}) format('woff2'); }
@font-face { font-family: 'Instrument Serif'; font-style: italic; font-weight: 400; font-display: swap; src: url(${serifItalic}) format('woff2'); }
@font-face { font-family: 'JetBrains Mono Variable'; font-style: normal; font-weight: 100 800; font-display: swap; src: url(${mono}) format('woff2'); }
`;
  document.head.append(style);
}
