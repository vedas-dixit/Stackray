import type { ElementRecord, Snapshot } from '@stackray/core';
import { describe, expect, it } from 'vitest';
import { shelfPack, texturedCandidates } from '../src/atlas';

describe('shelfPack', () => {
  it('fills rows left to right and wraps', () => {
    const places = shelfPack(
      [
        { w: 10, h: 10 },
        { w: 5, h: 4 },
        { w: 4, h: 4 },
      ],
      16,
    );
    expect(places).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ]);
  });

  it('returns null for boxes that cannot fit', () => {
    expect(shelfPack([{ w: 20, h: 2 }], 16)).toEqual([null]);
    expect(
      shelfPack(
        [
          { w: 16, h: 16 },
          { w: 1, h: 1 },
        ],
        16,
      ),
    ).toEqual([{ x: 0, y: 0 }, null]);
  });
});

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

describe('texturedCandidates', () => {
  it('keeps leaves and replaced elements, front to back, and drops ghosts and containers', () => {
    const elements = [
      record({ i: 0 }),
      record({ i: 1, parent: 0, tag: 'img' }),
      record({ i: 2, parent: 0, tag: 'p' }),
      record({ i: 3, parent: 2, tag: 'span' }),
      record({ i: 4, parent: 0, ghost: true }),
      record({ i: 5, parent: 0, tag: 'picture' }),
      record({ i: 6, parent: 5, tag: 'img' }),
    ];
    const snapshot: Snapshot = {
      meta: {
        version: 1,
        url: '',
        title: '',
        viewport: { w: 10, h: 10 },
        page: { w: 10, h: 10 },
        scroll: { x: 0, y: 0 },
        dpr: 1,
        capturedAt: '',
        captureMs: 0,
      },
      elements,
      paintOrder: [0, 1, 2, 3, 4, 5, 6],
    };
    expect(texturedCandidates(snapshot)).toEqual([6, 5, 3, 1]);
  });
});
