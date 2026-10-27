import { describe, expect, it } from 'vitest';
import { capture } from '../src/capture';
import { SNAPSHOT_VERSION } from '../src/types';
import { byId, el, page, snapshotOf } from './harness';

describe('capture', () => {
  it('numbers elements in preorder with parents and depths', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', { id: 'body' }, [
          el('div', { id: 'a' }, [el('span', { id: 'a1' })]),
          el('p', { id: 'b' }),
        ]),
      ]),
    );
    expect(snap.elements.map((e) => e.i)).toEqual([0, 1, 2, 3, 4]);
    expect(snap.elements.map((e) => e.parent)).toEqual([null, 0, 1, 2, 1]);
    expect(snap.elements.map((e) => e.depth)).toEqual([0, 1, 2, 3, 2]);
    expect(byId(snap, 'a1').parent).toBe(byId(snap, 'a').i);
  });

  it('uses the page scroll size for the root rect', () => {
    const snap = snapshotOf(el('html', { rect: [0, 0, 10, 10] }), { w: 1200, h: 4000 });
    expect(snap.elements[0]?.rect).toEqual({ x: 0, y: 0, w: 1200, h: 4000 });
  });

  it('flags ghosts, including children of an opacity 0 parent, and empties', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('div', { id: 'hidden', style: { visibility: 'hidden' } }),
          el('div', { id: 'faded', style: { opacity: '0' } }, [el('span', { id: 'child' })]),
          el('div', { id: 'empty', rect: [0, 0, 0, 0] }),
          el('div', { id: 'solid' }),
        ]),
      ]),
    );
    expect(byId(snap, 'hidden').ghost).toBe(true);
    expect(byId(snap, 'faded').ghost).toBe(true);
    expect(byId(snap, 'child').ghost).toBe(true);
    expect(byId(snap, 'empty').empty).toBe(true);
    expect(byId(snap, 'solid').ghost).toBe(false);
    expect(byId(snap, 'solid').empty).toBe(false);
  });

  it('walks open shadow roots before light children and marks them', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('sr-widget', { id: 'host', shadow: [el('div', { id: 'inner' })] }, [
            el('span', { id: 'slotted' }),
          ]),
        ]),
      ]),
    );
    expect(byId(snap, 'inner').shadow).toBe(true);
    expect(byId(snap, 'inner').i).toBeLessThan(byId(snap, 'slotted').i);
    expect(byId(snap, 'slotted').shadow).toBe(false);
    expect(byId(snap, 'host').sel).toBe('sr-widget#host');
  });

  it('treats iframes as leaves and skips display none subtrees', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('iframe', { id: 'frame', iframe: true }, [el('div', { id: 'never' })]),
          el('div', { id: 'gone', style: { display: 'none' } }, [el('div', { id: 'also-gone' })]),
          el('div', { id: 'kept' }),
        ]),
      ]),
    );
    expect(byId(snap, 'frame').iframe).toBe(true);
    expect(snap.elements.find((e) => e.id === 'never')).toBeUndefined();
    expect(snap.elements.find((e) => e.id === 'gone')).toBeUndefined();
    expect(snap.elements.find((e) => e.id === 'also-gone')).toBeUndefined();
    expect(byId(snap, 'kept').i).toBe(3);
  });

  it('fills meta', () => {
    const snap = snapshotOf(el('html'));
    expect(snap.meta.version).toBe(SNAPSHOT_VERSION);
    expect(snap.meta.url).toBe('https://example.test/');
    expect(snap.meta.page).toEqual({ w: 1200, h: 800 });
    expect(snap.meta.captureMs).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(snap.meta.capturedAt))).toBe(false);
  });

  it('keeps the compact style subset and joins overflow axes', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('div', { id: 'x', style: { overflowX: 'hidden', overflowY: 'auto', zIndex: '4' } }),
      ]),
    );
    expect(byId(snap, 'x').style).toEqual({
      position: 'static',
      zIndex: '4',
      display: 'block',
      opacity: '1',
      visibility: 'visible',
      pointerEvents: 'auto',
      overflow: 'hidden auto',
      transform: 'none',
      background: 'none',
    });
  });

  it('returns an error value for a missing root', () => {
    const broken = page(el('html'));
    const result = capture({ ...broken, root: null as unknown as typeof broken.root });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('no-document');
  });
});
