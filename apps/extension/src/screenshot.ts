import type { Screenshot } from '@stackray/renderer';
import { browser } from 'wxt/browser';

/** The first capture may have to wake the service worker. */
const FIRST_TIMEOUT_MS = 6000;
const TIMEOUT_MS = 2500;
/** Chrome allows two visible-tab captures per second. */
const GAP_MS = 550;
/** Screens photographed per page; deeper planes stay plain. */
export const MAX_TILES = 6;
/** How long one screen may wait for its lazy images. */
const IMAGE_WAIT_MS = 1400;

/**
 * Photograph the page screen by screen, starting with the view the user is
 * looking at, then from the top down. Scrolls the page and puts it back. Stops
 * early if a capture is refused. Resolves to the tiles it got, possibly none.
 *
 * @example
 * const tiles = await captureTiles((done, total) => note(`${done}/${total}`));
 */
export async function captureTiles(
  onProgress?: (done: number, total: number) => void,
): Promise<Screenshot[]> {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x0 = window.scrollX;
  const y0 = window.scrollY;
  const pageH = document.documentElement.scrollHeight;

  const offsets = [y0];
  for (let y = 0; y < pageH && offsets.length < MAX_TILES; y += vh) {
    if (Math.abs(y - y0) >= vh * 0.5) offsets.push(y);
  }

  const tiles: Screenshot[] = [];
  let last = 0;
  for (const [i, y] of offsets.entries()) {
    if (y !== window.scrollY) {
      window.scrollTo({ top: y, left: x0, behavior: 'instant' });
      await settle();
      // Lazy images start loading only now that they are in view.
      await waitForImages(IMAGE_WAIT_MS);
    }
    const wait = GAP_MS - (performance.now() - last);
    if (wait > 0) await sleep(wait);
    let dataUrl = await requestCapture(i === 0 ? FIRST_TIMEOUT_MS : TIMEOUT_MS);
    if (dataUrl === null) {
      // Rate limited or the worker was still waking up: one more try.
      await sleep(GAP_MS + 200);
      dataUrl = await requestCapture(TIMEOUT_MS);
    }
    last = performance.now();
    if (dataUrl === null) break;
    tiles.push({ dataUrl, rect: { x: window.scrollX, y: window.scrollY, w: vw, h: vh } });
    onProgress?.(i + 1, offsets.length);
  }

  if (window.scrollY !== y0 || window.scrollX !== x0) {
    window.scrollTo({ top: y0, left: x0, behavior: 'instant' });
    await settle();
  }
  return tiles;
}

async function requestCapture(timeoutMs: number): Promise<string | null> {
  try {
    const dataUrl = await Promise.race([
      browser.runtime.sendMessage({ type: 'stackray:screenshot' }) as Promise<unknown>,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return typeof dataUrl === 'string' ? dataUrl : null;
  } catch {
    return null;
  }
}

/**
 * Wait until the images currently in view have loaded, or until `maxMs` has
 * passed. Checked twice because lazy loaders assign the real `src` a moment
 * after the scroll.
 */
async function waitForImages(maxMs: number): Promise<void> {
  const started = performance.now();
  for (let pass = 0; pass < 2; pass += 1) {
    const pending = imagesInView().filter((img) => !img.complete || img.naturalWidth === 0);
    if (pending.length === 0) return;
    const left = maxMs - (performance.now() - started);
    if (left <= 0) return;
    await Promise.race([Promise.all(pending.map(loaded)), sleep(left)]);
    await settle();
  }
}

function imagesInView(): HTMLImageElement[] {
  const vh = window.innerHeight;
  return Array.from(document.images).filter((img) => {
    const r = img.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom >= 0 && r.top <= vh;
  });
}

function loaded(img: HTMLImageElement): Promise<void> {
  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve();
      return;
    }
    const done = () => resolve();
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
}

/** Two frames plus a beat, so lazy images and sticky bars have painted. */
function settle(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 60))),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
