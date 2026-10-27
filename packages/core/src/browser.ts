import { captureWithSources } from './capture';
import type { DomElement, DomPage, DomStyle } from './dom';
import { err, ok, type Result } from './result';
import type { Snapshot } from './types';

/** A snapshot of a live document plus the mapping back to its elements. */
export type Captured = {
  snapshot: Snapshot;
  elementAt: (i: number) => Element | null;
  indexOf: (el: Element) => number | null;
};

const TOP_LAYER_SELECTORS = [':modal', ':popover-open', ':fullscreen'];
/** Elements whose inside is never walked. */
const LEAF_TAGS = new Set(['iframe', 'frame', 'svg', 'canvas', 'video', 'object', 'embed']);

/**
 * Capture a live document. This is the only code in core that touches the
 * DOM: one `getComputedStyle` and one `getBoundingClientRect` per element.
 *
 * @example
 * const result = captureDocument(document);
 * if (result.ok) result.value.elementAt(0) === document.documentElement; // true
 */
export function captureDocument(doc: Document): Result<Captured> {
  const win = doc.defaultView;
  const root = doc.documentElement;
  if (win === null || root === null || root === undefined) {
    return err({ code: 'no-document', message: 'There is no document to capture.' });
  }
  const refs = new WeakMap<DomElement, Element>();
  const page: DomPage = {
    root: wrap(root, win, refs),
    url: doc.URL,
    title: doc.title,
    viewport: { w: win.innerWidth, h: win.innerHeight },
    page: { w: root.scrollWidth, h: root.scrollHeight },
    scroll: { x: win.scrollX, y: win.scrollY },
    dpr: win.devicePixelRatio,
  };
  const result = captureWithSources(page);
  if (!result.ok) return result;
  const elements = result.value.sources.map((s) => refs.get(s) ?? null);
  const index = new Map<Element, number>();
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el !== null && el !== undefined) index.set(el, i);
  }
  return ok({
    snapshot: result.value.snapshot,
    elementAt: (i) => elements[i] ?? null,
    indexOf: (el) => index.get(el) ?? null,
  });
}

/**
 * Every captured element under a viewport point, top to bottom.
 *
 * @example
 * hitTest(document, captured, 100, 40); // [12, 3, 1, 0]
 */
export function hitTest(doc: Document, captured: Captured, x: number, y: number): number[] {
  const out: number[] = [];
  for (const el of doc.elementsFromPoint(x, y)) {
    const i = captured.indexOf(el);
    if (i !== null) out.push(i);
  }
  return out;
}

function wrap(el: Element, win: Window, refs: WeakMap<DomElement, Element>): DomElement {
  const cs = win.getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const tag = el.localName;
  const node: DomElement = {
    tag,
    id: el.id === '' ? null : el.id,
    classes: Array.from(el.classList),
    attr: (name) => el.getAttribute(name),
    text: ownText(el),
    rect: { x: r.left + win.scrollX, y: r.top + win.scrollY, w: r.width, h: r.height },
    style: pickStyle(cs),
    children: [],
    shadowChildren: null,
    isIframe: tag === 'iframe' || tag === 'frame',
    topLayer: isTopLayer(el),
  };
  refs.set(node, el);
  if (cs.display === 'none' || LEAF_TAGS.has(tag)) return node;
  if (el.shadowRoot !== null) {
    node.shadowChildren = Array.from(el.shadowRoot.children, (c) => wrap(c, win, refs));
  }
  node.children = Array.from(el.children, (c) => wrap(c, win, refs));
  return node;
}

function pickStyle(cs: CSSStyleDeclaration): DomStyle {
  const get = (prop: string, fallback: string): string => cs.getPropertyValue(prop) || fallback;
  const color = cs.backgroundColor;
  const transparent = color === 'rgba(0, 0, 0, 0)' || color === 'transparent';
  return {
    position: cs.position,
    zIndex: cs.zIndex,
    display: cs.display,
    opacity: cs.opacity,
    visibility: cs.visibility,
    pointerEvents: cs.pointerEvents,
    overflowX: cs.overflowX,
    overflowY: cs.overflowY,
    transform: cs.transform,
    translate: get('translate', 'none'),
    rotate: get('rotate', 'none'),
    scale: get('scale', 'none'),
    filter: cs.filter,
    backdropFilter: get('backdrop-filter', 'none'),
    perspective: cs.perspective,
    clipPath: cs.clipPath,
    mask: get('mask', 'none'),
    mixBlendMode: cs.mixBlendMode,
    isolation: cs.isolation,
    willChange: cs.willChange,
    contain: get('contain', 'none'),
    background: transparent ? (cs.backgroundImage === 'none' ? 'none' : 'image') : color,
  };
}

function ownText(el: Element): string {
  let text = '';
  for (const child of el.childNodes) {
    if (child.nodeType === 3) text += child.nodeValue ?? '';
  }
  return text.replace(/\s+/g, ' ').trim();
}

function isTopLayer(el: Element): boolean {
  for (const selector of TOP_LAYER_SELECTORS) {
    try {
      if (el.matches(selector)) return true;
    } catch {
      // The browser does not know this pseudo-class; keep checking the others.
    }
  }
  return false;
}
