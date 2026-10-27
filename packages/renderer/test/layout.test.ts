import type { ElementRecord, Snapshot } from '@stackray/core';
import { describe, expect, it } from 'vitest';
import { defaultLayout, layoutPlanes, stackLevels } from '../src/layout';

function record(partial: Partial<ElementRecord> & { i: number }): ElementRecord {
  return {
    parent: null,
    depth: 0,
    tag: 'div',
    id: null,
    cls: [],
    sel: 'div',
    rect: { x: 0, y: 0, w: 100, h: 100 },
    empty: false,
    ghost: false,
    style: {
      position: 'static',
      zIndex: 'auto',
      display: 'block',
      opacity: '1',
      visibility: 'visible',
      pointerEvents: 'auto',
      overflow: 'visible',
      transform: 'none',
      background: 'none',
    },
    sc: false,
    scReasons: [],
    scParent: null,
    positioned: false,
    z: null,
    clipBy: null,
    clipKind: null,
    clipped: false,
    scrolledOut: false,
    iframe: false,
    shadow: false,
    topLayer: false,
    paint: partial.i,
    ...partial,
  };
}

function snapshot(elements: ElementRecord[]): Snapshot {
  return {
    meta: {
      version: 1,
      url: 'about:blank',
      title: '',
      viewport: { w: 200, h: 200 },
      page: { w: 200, h: 200 },
      scroll: { x: 0, y: 0 },
      dpr: 1,
      capturedAt: '2026-01-01T00:00:00.000Z',
      captureMs: 0,
    },
    elements,
    paintOrder: [...elements].sort((a, b) => a.paint - b.paint).map((e) => e.i),
  };
}

const page = snapshot([
  record({ i: 0, rect: { x: 0, y: 0, w: 200, h: 200 }, paint: 0 }),
  record({ i: 1, depth: 1, rect: { x: 50, y: 50, w: 100, h: 100 }, paint: 2 }),
  record({ i: 2, depth: 1, rect: { x: 0, y: 0, w: 0, h: 0 }, empty: true, paint: 1 }),
  record({ i: 3, depth: 2, rect: { x: 10, y: 10, w: 10, h: 10 }, ghost: true, paint: 3 }),
]);

describe('layoutPlanes', () => {
  it('centers planes on the page and flips y', () => {
    const [root] = layoutPlanes(page, { ...defaultLayout, explode: 0 });
    expect(root).toMatchObject({ index: 0, x: 0, y: 0, z: 0, w: 200, h: 200 });
    const inner = layoutPlanes(page).find((p) => p.index === 1);
    expect(inner).toMatchObject({ x: 0, y: 0 });
    const corner = layoutPlanes(page).find((p) => p.index === 3);
    expect(corner).toMatchObject({ x: -85, y: 85 });
  });

  it('is flat at explode 0 and stacks by overlap level otherwise', () => {
    expect(layoutPlanes(page, { ...defaultLayout, explode: 0 }).every((p) => p.z === 0)).toBe(true);
    const lifted = layoutPlanes(page, { ...defaultLayout, gap: 10 });
    // root 0 · inner over the root 10 · the ghost corner over the root 10
    expect(lifted.map((p) => p.z)).toEqual([0, 10, 10]);
  });

  it('shares a level between things that do not overlap and stacks the ones that do', () => {
    const side = snapshot([
      record({ i: 0, rect: { x: 0, y: 0, w: 200, h: 200 }, paint: 0 }),
      record({ i: 1, parent: 0, depth: 1, rect: { x: 0, y: 0, w: 90, h: 50 }, paint: 1 }),
      record({ i: 2, parent: 0, depth: 1, rect: { x: 110, y: 0, w: 90, h: 50 }, paint: 2 }),
      record({ i: 3, parent: 2, depth: 2, rect: { x: 120, y: 10, w: 20, h: 20 }, paint: 3 }),
      record({ i: 4, parent: 0, depth: 1, rect: { x: 0, y: 0, w: 200, h: 30 }, paint: 4 }),
    ]);
    expect(Array.from(stackLevels(side))).toEqual([0, 1, 1, 2, 3]);
  });

  it('uses depth as the axis in toy mode', () => {
    const planes = layoutPlanes(page, { ...defaultLayout, axis: 'depth', gap: 1 });
    expect(planes.map((p) => p.z)).toEqual([0, 1, 2]);
  });

  it('hides empty elements by default and ghosts on request', () => {
    expect(layoutPlanes(page).map((p) => p.index)).toEqual([0, 1, 3]);
    expect(layoutPlanes(page, { ...defaultLayout, hideEmpty: false }).length).toBe(4);
    expect(layoutPlanes(page, { ...defaultLayout, hideGhosts: true }).map((p) => p.index)).toEqual([
      0, 1,
    ]);
  });

  it('respects the depth cutoff', () => {
    expect(layoutPlanes(page, { ...defaultLayout, depthCutoff: 1 }).map((p) => p.index)).toEqual([
      0, 1,
    ]);
  });

  it('returns planes in paint order', () => {
    const order = layoutPlanes(page, { ...defaultLayout, hideEmpty: false }).map((p) => p.index);
    expect(order).toEqual(page.paintOrder);
  });
});
