import { describe, expect, it } from 'vitest';
import { byId, el, snapshotOf } from './harness';

describe('clipping', () => {
  it('separates cut-off from scrolled-out', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('div', { id: 'clipper', rect: [0, 0, 200, 60], style: { overflow: 'hidden' } }, [
            el('div', { id: 'cut', rect: [0, 80, 100, 20] }),
            el('div', { id: 'visible', rect: [0, 10, 100, 20] }),
          ]),
          el('div', { id: 'scroller', rect: [0, 100, 200, 60], style: { overflowY: 'auto' } }, [
            el('div', { id: 'far', rect: [0, 300, 100, 20] }),
          ]),
        ]),
      ]),
    );
    const cut = byId(snap, 'cut');
    expect(cut.clipBy).toBe(byId(snap, 'clipper').i);
    expect(cut.clipKind).toBe('hidden');
    expect(cut.clipped).toBe(true);
    expect(cut.scrolledOut).toBe(false);

    const visible = byId(snap, 'visible');
    expect(visible.clipBy).toBe(byId(snap, 'clipper').i);
    expect(visible.clipped).toBe(false);

    const far = byId(snap, 'far');
    expect(far.clipKind).toBe('scroll');
    expect(far.scrolledOut).toBe(true);
    expect(far.clipped).toBe(false);
  });

  it('lets absolute children escape a non-positioned clipper but not a positioned one', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el(
            'div',
            { id: 'static-clipper', rect: [0, 0, 200, 60], style: { overflow: 'hidden' } },
            [el('div', { id: 'escapes', rect: [0, 80, 100, 20], style: { position: 'absolute' } })],
          ),
          el(
            'div',
            {
              id: 'positioned-clipper',
              rect: [0, 100, 200, 60],
              style: { overflow: 'hidden', position: 'relative' },
            },
            [el('div', { id: 'stays', rect: [0, 400, 100, 20], style: { position: 'absolute' } })],
          ),
          el('div', { id: 'outer', rect: [0, 200, 200, 60], style: { overflow: 'hidden' } }, [
            el('div', { id: 'fixed', rect: [0, 900, 100, 20], style: { position: 'fixed' } }),
          ]),
        ]),
      ]),
    );
    expect(byId(snap, 'escapes').clipBy).toBeNull();
    expect(byId(snap, 'escapes').clipped).toBe(false);
    expect(byId(snap, 'stays').clipBy).toBe(byId(snap, 'positioned-clipper').i);
    expect(byId(snap, 'stays').clipped).toBe(true);
    expect(byId(snap, 'fixed').clipBy).toBeNull();
  });

  it('inherits the nearest clipper through unclipped ancestors and ignores body', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', { style: { overflow: 'hidden' } }, [
          el('div', { id: 'clipper', rect: [0, 0, 100, 100], style: { overflow: 'clip' } }, [
            el('div', { id: 'middle', rect: [0, 0, 100, 100] }, [
              el('span', { id: 'deep', rect: [0, 0, 10, 10] }),
            ]),
          ]),
          el('p', { id: 'free' }),
        ]),
      ]),
    );
    expect(byId(snap, 'deep').clipBy).toBe(byId(snap, 'clipper').i);
    expect(byId(snap, 'free').clipBy).toBeNull();
  });
});
