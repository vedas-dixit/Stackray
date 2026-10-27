import { describe, expect, it } from 'vitest';
import fixture from '../../../fixtures/broken-dropdown.json';
import { ladder } from '../src/ladder';
import type { ElementRecord, Snapshot } from '../src/types';
import { why } from '../src/why';

const snap = fixture as unknown as Snapshot;

function bySel(sel: string, nth = 0): ElementRecord {
  const found = snap.elements.filter((e) => e.sel === sel)[nth];
  if (found === undefined) throw new Error(`No element labelled ${sel}`);
  return found;
}

describe('fixtures/broken-dropdown.json', () => {
  it('is a current snapshot with a complete paint order', () => {
    expect(snap.meta.version).toBe(1);
    expect(snap.paintOrder.length).toBe(snap.elements.length);
    expect(snap.paintOrder.map((i) => snap.elements[i]?.paint)).toEqual(
      snap.elements.map((_, p) => p),
    );
  });

  it('traps the dropdown inside the transformed card, below the header', () => {
    const dropdown = bySel('div.dropdown');
    const card = bySel('section.card.transformed');
    expect(dropdown.scParent).toBe(card.i);
    expect(card.scReasons).toEqual(['transform']);
    expect(dropdown.paint).toBeLessThan(bySel('header#header').paint);
  });

  it('paints the negative z before its parent content and keeps twins in DOM order', () => {
    const negative = bySel('div.negative');
    expect(negative.z).toBe(-1);
    expect(negative.paint).toBeLessThan(bySel('section.card').paint);
    expect(negative.paint).toBeLessThan(bySel('body').paint);
    expect(bySel('div.twin', 0).paint).toBeLessThan(bySel('div.twin', 1).paint);
  });

  it('makes flex items with a z-index into contexts and keeps fixed-without-z below positive z', () => {
    expect(bySel('div.flex-item').sc).toBe(true);
    expect(bySel('div.flex-item').z).toBe(3);
    expect(bySel('div.fixed-note').paint).toBeLessThan(bySel('div.positive').paint);
  });

  it('tells cut off from scrolled out', () => {
    const cut = bySel('div.cut');
    expect(cut.clipBy).toBe(bySel('div.clipper').i);
    expect(cut.clipped).toBe(true);
    expect(cut.scrolledOut).toBe(false);
    const far = bySel('div.far');
    expect(far.clipKind).toBe('scroll');
    expect(far.scrolledOut).toBe(true);
    expect(far.clipped).toBe(false);
  });

  it('hoists the modal dialog to the top layer and paints it last', () => {
    const dialog = snap.elements.find((e) => e.tag === 'dialog');
    expect(dialog?.topLayer).toBe(true);
    expect(dialog?.scParent).toBe(0);
    expect(dialog?.paint).toBe(snap.elements.length - 1);
  });

  it('marks shadow content, ghosts and labels from aria-label', () => {
    expect(bySel('div.inner').shadow).toBe(true);
    expect(bySel('div.inner').parent).toBe(bySel('sr-widget').i);
    expect(bySel('div.ghost-overlay').ghost).toBe(true);
    expect(bySel('div.ghost-overlay').z).toBe(50);
    const hashed = bySel('"Hashed classes only"');
    expect(hashed.cls).toEqual([]);
  });

  it('answers the dropdown question in one sentence', () => {
    const result = why(snap, bySel('div.dropdown').i, bySel('header#header').i);
    expect(result.ok && result.value.sentence).toBe(
      '`div.dropdown` (z 9999) is trapped inside `section.card.transformed`, which creates a stacking context via transform, so it paints behind `header#header` (z 10).',
    );
  });

  it('builds the ladder from the root context', () => {
    const rungs = ladder(snap).map((r) => r.sel);
    expect(rungs[0]).toBe('div.negative');
    expect(rungs.at(-1)).toBe('dialog#modal');
    expect(rungs.indexOf('header#header')).toBeGreaterThan(rungs.indexOf('div.flex-item'));
  });
});
