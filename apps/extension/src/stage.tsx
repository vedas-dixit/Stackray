import { captureDocument } from '@stackray/core/browser';
import { layoutKey, StackrayApp } from '@stackray/ui';
import componentsCss from '@stackray/ui/components.css?inline';
import tokensCss from '@stackray/ui/tokens.css?inline';
import { render } from 'preact';
import { browser } from 'wxt/browser';
import { flashElement } from './flash';
import { ensureFonts } from './fonts';
import { captureTiles } from './screenshot';

const HOST_TAG = 'stackray-stage';

const hostCss = `
.sr-host { position: absolute; inset: 0; }
.sr-host .sr-app, .sr-host .sr-stage { height: 100%; }
`;

let opening = false;
/** Tears down the open stage; `null` while none is open. */
let closeStage: (() => void) | null = null;

/**
 * Open the stage over the page, or close it if it is already open. Capture
 * runs first, then the screenshots, then the Shadow DOM host is appended; the
 * page's own elements are never styled or changed.
 *
 * @example
 * void toggleStage();
 */
export async function toggleStage(): Promise<void> {
  const existing = document.querySelector(HOST_TAG);
  if (existing !== null) {
    // Closing from the toolbar or the shortcut has to undo the key listeners
    // and stop the renderer too, not only remove the element.
    if (closeStage !== null) closeStage();
    else existing.remove();
    return;
  }
  // A second click while the page is still being photographed is ignored,
  // so two stages can never be opened at once.
  if (opening) return;
  opening = true;
  try {
    await openStage();
  } finally {
    opening = false;
  }
}

async function openStage(): Promise<void> {
  const captured = captureDocument(document);
  // Progress goes on the toolbar badge: anything drawn on the page would be
  // photographed along with it.
  const screenshots = await captureTiles((done, total) => {
    void browser.runtime
      .sendMessage({ type: 'stackray:progress', text: `${done}/${total}` })
      .catch(() => undefined);
  });
  void browser.runtime.sendMessage({ type: 'stackray:progress', text: '' }).catch(() => undefined);
  if (!captured.ok) {
    showNote(`Stackray could not read this page: ${captured.error.message}`);
    return;
  }
  ensureFonts();

  const previouslyFocused = document.activeElement;
  const host = document.createElement(HOST_TAG);
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;display:block;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `${tokensCss}\n${componentsCss}\n${hostCss}`;
  const mount = document.createElement('div');
  mount.className = 'sr-host';
  shadow.append(style, mount);
  document.documentElement.append(host);

  // The stage is modal: keys never reach the page while it is open. Our own
  // handlers run first (inside the shadow root, or on window in capture).
  const swallow = (e: Event) => {
    if (e.target !== host) e.stopPropagation();
  };
  const swallowFromInside = (e: Event) => e.stopPropagation();
  for (const type of ['keydown', 'keyup', 'keypress'] as const) {
    window.addEventListener(type, swallow, true);
    host.addEventListener(type, swallowFromInside);
  }

  let closed = false;
  const exit = () => {
    if (closed) return;
    closed = true;
    closeStage = null;
    for (const type of ['keydown', 'keyup', 'keypress'] as const) {
      window.removeEventListener(type, swallow, true);
    }
    render(null, mount);
    host.remove();
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true });
  };
  closeStage = exit;

  render(
    <StackrayApp
      snapshot={captured.value.snapshot}
      host={location.host || location.href}
      onExit={exit}
      onFlash={(index) => flashElement(captured.value.elementAt(index))}
      screenshots={screenshots}
      storageKey={layoutKey(location.origin)}
      globalKeys
      open="full"
    />,
    mount,
  );
}

/** A one-line note bottom right, in its own host, for four seconds. */
function showNote(message: string): void {
  const host = document.createElement('stackray-note');
  const shadow = host.attachShadow({ mode: 'closed' });
  const note = document.createElement('p');
  note.textContent = message;
  note.setAttribute(
    'style',
    'position:fixed;inset:auto 16px 16px auto;margin:0;padding:8px 12px;font:12px ui-monospace,monospace;background:#f2ede4;color:#2b2420;border:1px solid #5b3a2a;border-radius:8px;z-index:2147483647',
  );
  shadow.append(note);
  document.documentElement.append(host);
  setTimeout(() => host.remove(), 4000);
}
