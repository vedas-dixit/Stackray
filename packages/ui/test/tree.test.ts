import type { ElementRecord, Snapshot } from '@stackray/core';
import { describe, expect, it } from 'vitest';
import { defaultFilters } from '../src/components/Filters';
import { badgeFor, buildTreeRows, shortReason } from '../src/model/tree';

function record(partial: Partial<ElementRecord> & { i: number }): ElementRecord {
  return {
    parent: null,
    depth: 0,
    tag: 'div',
    id: null,
    cls: [],
    sel: 'div',
    rect: { x: 0, y: 0, w: 10, h: 10 },
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

const elements: ElementRecord[] = [
  record({ i: 0, sel: 'html', sc: true, scReasons: ['root'], z: 0 }),
  record({ i: 1, parent: 0, depth: 1, sel: 'main' }),
  record({ i: 2, parent: 1, depth: 2, sel: 'div.stroke', scParent: 0 }),
  record({ i: 3, parent: 1, depth: 2, sel: 'div.stroke', scParent: 0 }),
  record({ i: 4, parent: 1, depth: 2, sel: 'div.stroke', scParent: 0 }),
  record({
    i: 5,
    parent: 1,
    depth: 2,
    sel: '.ghost',
    ghost: true,
    style: { ...record({ i: 5 }).style, opacity: '0' },
  }),
  record({
    i: 6,
    parent: 0,
    depth: 1,
    sel: '.card',
    sc: true,
    scReasons: ['transform'],
    scParent: 0,
    z: 0,
  }),
  record({
    i: 7,
    parent: 6,
    depth: 2,
    sel: '.dropdown',
    sc: true,
    scParent: 6,
    z: 9999,
    positioned: true,
  }),
  record({ i: 8, parent: 0, depth: 1, sel: '.empty', empty: true }),
];
const snapshot: Snapshot = {
  meta: {
    version: 1,
    url: 'about:blank',
    title: '',
    viewport: { w: 10, h: 10 },
    page: { w: 10, h: 10 },
    scroll: { x: 0, y: 0 },
    dpr: 1,
    capturedAt: '',
    captureMs: 0,
  },
  elements,
  paintOrder: elements.map((e) => e.i),
};
const base = { filters: defaultFilters, collapsed: new Set<number>(), selected: null };

describe('buildTreeRows', () => {
  it('groups identical leaf siblings and hides empty leaves', () => {
    const rows = buildTreeRows(snapshot, base);
    const stroke = rows.find((r) => r.label === 'div.stroke');
    expect(stroke?.count).toBe(3);
    expect(rows.some((r) => r.label === '.empty')).toBe(false);
    expect(rows.map((r) => r.label)).toEqual([
      'html',
      'main',
      'div.stroke',
      '.ghost',
      '.card',
      '.dropdown',
    ]);
  });

  it('flags the trapped dropdown and badges the reasons', () => {
    const rows = buildTreeRows(snapshot, base);
    expect(rows.find((r) => r.label === '.dropdown')).toMatchObject({
      problem: true,
      badge: 'z 9999',
    });
    expect(rows.find((r) => r.label === '.card')?.badge).toBe('transform');
    expect(rows.find((r) => r.label === '.ghost')).toMatchObject({
      ghost: true,
      badge: 'opacity 0',
    });
  });

  it('collapses, hides ghosts, isolates and searches', () => {
    expect(
      buildTreeRows(snapshot, { ...base, collapsed: new Set([1]) }).map((r) => r.label),
    ).toEqual(['html', 'main', '.card', '.dropdown']);
    expect(
      buildTreeRows(snapshot, { ...base, filters: { ...defaultFilters, hideGhosts: true } }).some(
        (r) => r.ghost,
      ),
    ).toBe(false);
    expect(
      buildTreeRows(snapshot, {
        ...base,
        filters: { ...defaultFilters, isolate: true },
        selected: 6,
      }).map((r) => r.label),
    ).toEqual(['.card', '.dropdown']);
    expect(
      buildTreeRows(snapshot, { ...base, filters: { ...defaultFilters, query: 'drop' } }).map(
        (r) => r.label,
      ),
    ).toEqual(['.dropdown']);
    expect(
      buildTreeRows(snapshot, { ...base, filters: { ...defaultFilters, onlyContexts: true } }).map(
        (r) => r.depth,
      ),
    ).toEqual([0, 1, 2]);
  });
});

describe('badges', () => {
  it('shortens reasons', () => {
    expect(shortReason('position: fixed')).toBe('fixed');
    expect(shortReason('will-change: opacity')).toBe('will-change');
    expect(shortReason('transform')).toBe('transform');
    expect(badgeFor(elements[0] as ElementRecord)).toBe('root');
    expect(badgeFor(record({ i: 9, sc: true, scReasons: ['z-index'], z: 9999 }))).toBe('z 9999');
    expect(
      badgeFor(record({ i: 9, sc: true, scReasons: ['position: fixed', 'z-index'], z: 10 })),
    ).toBe('fixed');
  });
});
