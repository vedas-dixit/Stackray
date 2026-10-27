import { describe, expect, it } from 'vitest';
import { byId, el, snapshotOf } from './harness';

describe('stacking contexts and paint order', () => {
  it('paints a negative z behind its parent content but above the root background', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', { id: 'body' }, [
          el('section', { id: 'section' }, [
            el('div', { id: 'negative', style: { position: 'relative', zIndex: '-1' } }),
            el('p', { id: 'text' }),
          ]),
        ]),
      ]),
    );
    const negative = byId(snap, 'negative');
    expect(negative.sc).toBe(true);
    expect(negative.z).toBe(-1);
    expect(negative.paint).toBeGreaterThan(0);
    expect(negative.paint).toBeLessThan(byId(snap, 'body').paint);
    expect(negative.paint).toBeLessThan(byId(snap, 'text').paint);
  });

  it('traps a z 9999 inside a transformed parent below a sibling context with z 10', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('header', { id: 'header', style: { position: 'sticky', zIndex: '10' } }),
          el('section', { id: 'card', style: { transform: 'matrix(1, 0, 0, 1, 0, 0)' } }, [
            el('div', { id: 'dropdown', style: { position: 'absolute', zIndex: '9999' } }),
          ]),
        ]),
      ]),
    );
    const dropdown = byId(snap, 'dropdown');
    const card = byId(snap, 'card');
    expect(card.scReasons).toEqual(['transform']);
    expect(card.z).toBe(0);
    expect(dropdown.scParent).toBe(card.i);
    expect(byId(snap, 'header').scParent).toBe(0);
    expect(dropdown.paint).toBeLessThan(byId(snap, 'header').paint);
  });

  it('lets a flex item with z-index create a context without being positioned', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('div', { style: { display: 'flex' } }, [
            el('div', { id: 'item', style: { zIndex: '3' } }),
          ]),
          el('div', { style: { display: 'block' } }, [
            el('div', { id: 'block-child', style: { zIndex: '3' } }),
          ]),
        ]),
      ]),
    );
    const item = byId(snap, 'item');
    expect(item.sc).toBe(true);
    expect(item.positioned).toBe(false);
    expect(item.z).toBe(3);
    expect(item.scReasons).toEqual(['z-index: 3 on a flex or grid item']);
    expect(byId(snap, 'block-child').sc).toBe(false);
  });

  it('paints fixed without a z below a positive z sibling even when later in the DOM', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('div', { id: 'positive', style: { position: 'relative', zIndex: '1' } }),
          el('div', { id: 'fixed', style: { position: 'fixed' } }),
        ]),
      ]),
    );
    const fixed = byId(snap, 'fixed');
    expect(fixed.sc).toBe(true);
    expect(fixed.z).toBe(0);
    expect(fixed.paint).toBeLessThan(byId(snap, 'positive').paint);
  });

  it('resolves equal z by DOM order', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('div', { id: 'a', style: { position: 'relative', zIndex: '2' } }),
          el('div', { id: 'b', style: { position: 'relative', zIndex: '2' } }),
        ]),
      ]),
    );
    expect(byId(snap, 'a').paint).toBeLessThan(byId(snap, 'b').paint);
  });

  it('hoists top-layer elements above everything and parents them to the root', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('div', { id: 'card', style: { position: 'relative', zIndex: '100' } }, [
            el('dialog', { id: 'dialog', topLayer: true }, [el('p', { id: 'inside' })]),
          ]),
          el('header', { id: 'header', style: { position: 'sticky', zIndex: '1000' } }),
        ]),
      ]),
    );
    const dialog = byId(snap, 'dialog');
    expect(dialog.scParent).toBe(0);
    expect(dialog.scReasons).toContain('top layer');
    const last = snap.paintOrder.slice(-2);
    expect(last).toEqual([dialog.i, byId(snap, 'inside').i]);
    expect(dialog.paint).toBeGreaterThan(byId(snap, 'header').paint);
  });

  it('gives opacity a context with z 0 and no position', () => {
    const snap = snapshotOf(
      el('html', {}, [el('body', {}, [el('div', { id: 'faded', style: { opacity: '0.5' } })])]),
    );
    const faded = byId(snap, 'faded');
    expect(faded.sc).toBe(true);
    expect(faded.scReasons).toEqual(['opacity: 0.5']);
    expect(faded.z).toBe(0);
    expect(faded.positioned).toBe(false);
  });

  it('paints a positioned z:auto host with its own descendants after in-flow siblings', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('div', { id: 'host', style: { position: 'relative' } }, [el('span', { id: 'inner' })]),
          el('p', { id: 'later' }),
        ]),
      ]),
    );
    expect(byId(snap, 'host').sc).toBe(false);
    expect(byId(snap, 'later').paint).toBeLessThan(byId(snap, 'host').paint);
    expect(byId(snap, 'inner').paint).toBe(byId(snap, 'host').paint + 1);
  });

  it('records will-change and isolation as reasons', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('div', { id: 'ripple', style: { willChange: 'opacity' } }),
          el('div', { id: 'row', style: { isolation: 'isolate' } }),
        ]),
      ]),
    );
    expect(byId(snap, 'ripple').scReasons).toEqual(['will-change: opacity']);
    expect(byId(snap, 'row').scReasons).toEqual(['isolation: isolate']);
  });

  it('matches the paint field with paintOrder', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [el('div', { style: { position: 'absolute', zIndex: '5' } }), el('p')]),
      ]),
    );
    expect(snap.paintOrder.map((i) => snap.elements[i]?.paint)).toEqual([0, 1, 2, 3]);
    expect(snap.paintOrder[0]).toBe(0);
  });
});
