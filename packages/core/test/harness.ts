import { capture } from '../src/capture';
import type { DomElement, DomPage, DomStyle } from '../src/dom';
import type { ElementRecord, Snapshot } from '../src/types';

/** Every style property at its initial value. */
export const styleDefaults: DomStyle = {
  position: 'static',
  zIndex: 'auto',
  display: 'block',
  opacity: '1',
  visibility: 'visible',
  pointerEvents: 'auto',
  overflowX: 'visible',
  overflowY: 'visible',
  transform: 'none',
  translate: 'none',
  rotate: 'none',
  scale: 'none',
  filter: 'none',
  backdropFilter: 'none',
  perspective: 'none',
  clipPath: 'none',
  mask: 'none',
  mixBlendMode: 'normal',
  isolation: 'auto',
  willChange: 'auto',
  contain: 'none',
  background: 'none',
};

export type ElOptions = {
  id?: string;
  cls?: string[];
  attrs?: Record<string, string>;
  text?: string;
  /** `[x, y, w, h]` in document pixels. */
  rect?: [number, number, number, number];
  /** `overflow` is a shorthand for both axes. */
  style?: Partial<DomStyle> & { overflow?: string };
  shadow?: DomElement[];
  iframe?: boolean;
  topLayer?: boolean;
};

/**
 * Build a fake element so tests read like HTML.
 *
 * @example
 * el('div', { id: 'header', style: { position: 'sticky', zIndex: '10' } }, [el('a')]);
 */
export function el(tag: string, opts: ElOptions = {}, children: DomElement[] = []): DomElement {
  const { overflow, ...style } = opts.style ?? {};
  const [x, y, w, h] = opts.rect ?? [0, 0, 100, 20];
  const axes = overflow === undefined ? {} : { overflowX: overflow, overflowY: overflow };
  return {
    tag,
    id: opts.id ?? null,
    classes: opts.cls ?? [],
    attr: (name) => opts.attrs?.[name] ?? null,
    text: opts.text ?? '',
    rect: { x, y, w, h },
    style: { ...styleDefaults, ...axes, ...style },
    children,
    shadowChildren: opts.shadow ?? null,
    isIframe: opts.iframe ?? false,
    topLayer: opts.topLayer ?? false,
  };
}

/**
 * Wrap a root element as a page.
 *
 * @example
 * page(el('html', {}, [el('body')]), { w: 1200, h: 800 });
 */
export function page(
  root: DomElement,
  size: { w: number; h: number } = { w: 1200, h: 800 },
): DomPage {
  return {
    root,
    url: 'https://example.test/',
    title: 'Fixture',
    viewport: { w: 1200, h: 800 },
    page: size,
    scroll: { x: 0, y: 0 },
    dpr: 1,
  };
}

/**
 * Capture a root element and return the snapshot, failing the test on error.
 *
 * @example
 * const snap = snapshotOf(el('html', {}, [el('body')]));
 */
export function snapshotOf(root: DomElement, size?: { w: number; h: number }): Snapshot {
  const result = capture(page(root, size));
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

/**
 * The record with this id, failing the test when it is missing.
 *
 * @example
 * byId(snap, 'header').z; // 10
 */
export function byId(snapshot: Snapshot, id: string): ElementRecord {
  const found = snapshot.elements.find((e) => e.id === id);
  if (found === undefined) throw new Error(`No element with id "${id}"`);
  return found;
}
