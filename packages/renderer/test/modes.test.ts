import type { ElementRecord, Snapshot } from '@stackray/core';
import { describe, expect, it } from 'vitest';
import { colorModes, isTrapped, modeEnv, planeColor } from '../src/modes';
import { defaultPalette } from '../src/palette';

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

const root = record({ i: 0, sc: true, scReasons: ['root'], z: 0 });
const card = record({
  i: 1,
  parent: 0,
  depth: 1,
  sc: true,
  scReasons: ['transform'],
  scParent: 0,
  z: 0,
});
const dropdown = record({
  i: 2,
  parent: 1,
  depth: 2,
  sc: true,
  scParent: 1,
  z: 9999,
  positioned: true,
});
const header = record({
  i: 3,
  parent: 0,
  depth: 1,
  sc: true,
  scParent: 0,
  z: 10,
  positioned: true,
});
const ghost = record({ i: 4, parent: 0, depth: 1, ghost: true, scParent: 0 });
const cut = record({ i: 5, parent: 0, depth: 1, clipped: true, scParent: 0 });
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
  elements: [root, card, dropdown, header, ghost, cut],
  paintOrder: [0, 1, 2, 3, 4, 5],
};
const env = modeEnv(snapshot);

describe('modes', () => {
  it('lists five modes for the number keys', () => {
    expect(colorModes).toHaveLength(5);
  });

  it('finds trapped z-indexes', () => {
    expect(isTrapped(dropdown, snapshot)).toBe(true);
    expect(isTrapped(header, snapshot)).toBe(false);
    expect(isTrapped(card, snapshot)).toBe(false);
  });

  it('keeps ghosts and clipped planes red in every mode', () => {
    for (const mode of colorModes) {
      expect(planeColor(ghost, snapshot, mode, defaultPalette, env).fill).toEqual(
        defaultPalette.ghost,
      );
      expect(planeColor(cut, snapshot, mode, defaultPalette, env).dashed).toBe(true);
    }
  });

  it('brightens with depth in depth mode', () => {
    const shallow = planeColor(root, snapshot, 'depth', defaultPalette, env).edge[1];
    const deep = planeColor(dropdown, snapshot, 'depth', defaultPalette, env).edge[1];
    expect(deep).toBeGreaterThan(shallow);
  });

  it('gives members of one context the same hue and nested contexts another', () => {
    const plain = record({ i: 6, parent: 0, depth: 1, scParent: 0 });
    const a = planeColor(root, snapshot, 'context', defaultPalette, env).edge[0];
    const b = planeColor(plain, snapshot, 'context', defaultPalette, env).edge[0];
    const nested = planeColor(dropdown, snapshot, 'context', defaultPalette, env).edge[0];
    expect(a).toBe(b);
    expect(nested).not.toBe(a);
  });

  it('marks only the trapped element in problems mode', () => {
    expect(planeColor(dropdown, snapshot, 'problems', defaultPalette, env).edge[0]).toBe(
      defaultPalette.danger,
    );
    expect(planeColor(header, snapshot, 'problems', defaultPalette, env).edge).toEqual(
      defaultPalette.edgeDim,
    );
  });

  it('runs hot for the highest z in heat mode', () => {
    expect(planeColor(dropdown, snapshot, 'heat', defaultPalette, env).edge[0]).toBe(
      defaultPalette.danger,
    );
    expect(planeColor(root, snapshot, 'heat', defaultPalette, env).edge).toEqual(
      defaultPalette.edgeDim,
    );
  });
});
