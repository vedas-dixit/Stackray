import { computeClipping } from './clip';
import type { DomElement, DomPage, DomStyle } from './dom';
import { labelFor, readableClasses } from './labels';
import { computePaintOrder } from './paint';
import { err, ok, type Result } from './result';
import { effectiveZ, isFlexOrGridContainer, stackingReasons } from './stacking';
import { type ElementRecord, SNAPSHOT_VERSION, type Snapshot } from './types';

/** A snapshot plus the adapter node each record came from, in the same order. */
export type CaptureResult = { snapshot: Snapshot; sources: DomElement[] };

type Frame = {
  node: DomElement;
  parent: number;
  depth: number;
  shadow: boolean;
  hiddenByOpacity: boolean;
  flexOrGridItem: boolean;
};

/**
 * Pure page → snapshot. Walks the adapter tree once in preorder (shadow
 * children before light children), skipping `display: none` subtrees and the
 * inside of iframes, then runs the stacking, paint, clip and label models.
 *
 * @example
 * const result = capture(page);
 * if (result.ok) result.value.elements.length;
 */
export function capture(page: DomPage): Result<Snapshot> {
  const result = captureWithSources(page);
  return result.ok ? ok(result.value.snapshot) : result;
}

/**
 * Like `capture`, but also returns the adapter node behind every record so a
 * caller can map indices back to real elements.
 *
 * @example
 * const result = captureWithSources(page);
 * if (result.ok) result.value.sources[0] === page.root; // true
 */
export function captureWithSources(page: DomPage): Result<CaptureResult> {
  const start = now();
  if (page.root === undefined || page.root === null) {
    return err({ code: 'no-document', message: 'There is no document to capture.' });
  }
  const records: ElementRecord[] = [];
  const sources: DomElement[] = [];
  const styles: DomStyle[] = [];
  const children: number[][] = [];
  const flexItem: boolean[] = [];
  const stack: Frame[] = [
    {
      node: page.root,
      parent: -1,
      depth: 0,
      shadow: false,
      hiddenByOpacity: false,
      flexOrGridItem: false,
    },
  ];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    const { node } = frame;
    const isRoot = frame.parent === -1;
    if (!isRoot && node.style.display === 'none') continue;
    const i = records.length;
    records.push(buildRecord(i, frame, page, isRoot));
    sources.push(node);
    styles.push(node.style);
    children.push([]);
    flexItem.push(frame.flexOrGridItem);
    if (!isRoot) children[frame.parent]?.push(i);
    if (node.isIframe) continue;
    const hidden = frame.hiddenByOpacity || Number.parseFloat(node.style.opacity) === 0;
    const container = isFlexOrGridContainer(node.style.display);
    pushChildren(stack, node.children, i, frame, false, hidden, container);
    if (node.shadowChildren !== null) {
      pushChildren(stack, node.shadowChildren, i, frame, true, hidden, container);
    }
  }

  assignStacking(records, styles, flexItem);
  const paintOrder = computePaintOrder(records, children);
  computeClipping(records, styles);

  const snapshot: Snapshot = {
    meta: {
      version: SNAPSHOT_VERSION,
      url: page.url,
      title: page.title,
      viewport: page.viewport,
      page: page.page,
      scroll: page.scroll,
      dpr: page.dpr,
      capturedAt: new Date().toISOString(),
      captureMs: Math.round((now() - start) * 100) / 100,
    },
    elements: records,
    paintOrder,
  };
  return ok({ snapshot, sources });
}

function pushChildren(
  stack: Frame[],
  nodes: DomElement[],
  parent: number,
  frame: Frame,
  shadow: boolean,
  hiddenByOpacity: boolean,
  flexOrGridItem: boolean,
): void {
  for (let k = nodes.length - 1; k >= 0; k--) {
    const node = nodes[k];
    if (node === undefined) continue;
    stack.push({
      node,
      parent,
      depth: frame.depth + 1,
      shadow: frame.shadow || shadow,
      hiddenByOpacity,
      flexOrGridItem,
    });
  }
}

function buildRecord(i: number, frame: Frame, page: DomPage, isRoot: boolean): ElementRecord {
  const { node } = frame;
  const s = node.style;
  const rect = isRoot ? { x: 0, y: 0, w: page.page.w, h: page.page.h } : node.rect;
  const cls = readableClasses(node.classes);
  const ghostSelf =
    Number.parseFloat(s.opacity) === 0 || s.visibility === 'hidden' || s.visibility === 'collapse';
  return {
    i,
    parent: isRoot ? null : frame.parent,
    depth: frame.depth,
    tag: node.tag,
    id: node.id,
    cls,
    sel: labelFor({
      tag: node.tag,
      id: node.id,
      cls,
      testId: node.attr('data-testid'),
      ariaLabel: node.attr('aria-label'),
      text: node.text,
    }),
    rect,
    empty: rect.w <= 0 || rect.h <= 0,
    ghost: ghostSelf || frame.hiddenByOpacity,
    style: {
      position: s.position,
      zIndex: s.zIndex,
      display: s.display,
      opacity: s.opacity,
      visibility: s.visibility,
      pointerEvents: s.pointerEvents,
      overflow: s.overflowX === s.overflowY ? s.overflowX : `${s.overflowX} ${s.overflowY}`,
      transform: s.transform,
      background: s.background,
    },
    sc: false,
    scReasons: [],
    scParent: null,
    positioned: s.position !== 'static',
    z: null,
    clipBy: null,
    clipKind: null,
    clipped: false,
    scrolledOut: false,
    iframe: node.isIframe,
    shadow: frame.shadow,
    topLayer: node.topLayer,
    paint: 0,
  };
}

function assignStacking(
  records: ElementRecord[],
  styles: readonly DomStyle[],
  flexItem: readonly boolean[],
): void {
  for (const r of records) {
    const style = styles[r.i];
    if (style === undefined) continue;
    const input = {
      style,
      flexOrGridItem: flexItem[r.i] ?? false,
      topLayer: r.topLayer,
      isRoot: r.parent === null,
    };
    r.scReasons = stackingReasons(input);
    r.sc = r.scReasons.length > 0;
    r.z = effectiveZ(input, r.sc);
    if (r.parent === null) r.scParent = null;
    else if (r.topLayer) r.scParent = 0;
    else {
      const parent = records[r.parent];
      r.scParent = parent === undefined ? null : parent.sc ? r.parent : parent.scParent;
    }
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
