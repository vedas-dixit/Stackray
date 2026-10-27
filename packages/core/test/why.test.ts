import { describe, expect, it } from 'vitest';
import { ladder } from '../src/ladder';
import { why } from '../src/why';
import { byId, el, snapshotOf } from './harness';

const brokenDropdown = () =>
  snapshotOf(
    el('html', {}, [
      el('body', {}, [
        el('header', { id: 'header', style: { position: 'sticky', zIndex: '10' } }),
        el(
          'section',
          { id: 'card', cls: ['card'], style: { transform: 'matrix(1, 0, 0, 1, 0, 0)' } },
          [el('div', { id: 'dropdown', style: { position: 'absolute', zIndex: '9999' } })],
        ),
        el('div', { id: 'low', style: { position: 'relative', zIndex: '1' } }),
        el('div', { id: 'high', style: { position: 'relative', zIndex: '2' } }),
        el('div', { id: 'snackbar', style: { position: 'fixed', zIndex: '20000' } }),
      ]),
    ]),
  );

function oneSentence(s: string): boolean {
  return s.endsWith('.') && !s.includes('. ') && !s.includes('!') && !s.includes('?');
}

describe('why', () => {
  it('explains the trapped dropdown in one sentence with a fix', () => {
    const snap = brokenDropdown();
    const result = why(snap, byId(snap, 'dropdown').i, byId(snap, 'header').i);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const v = result.value;
    expect(v.kind).toBe('behind');
    expect(oneSentence(v.sentence)).toBe(true);
    expect(v.sentence).toBe(
      '`div#dropdown` (z 9999) is trapped inside `section#card`, which creates a stacking context via transform, so it paints behind `header#header` (z 10).',
    );
    expect(v.fix).toBe(
      'Fix: remove transform from `section#card`, or move `div#dropdown` out of it.',
    );
    expect(v.chainA).toEqual([byId(snap, 'dropdown').i, byId(snap, 'card').i, 0]);
    expect(v.chainB).toEqual([byId(snap, 'header').i, 0]);
    expect(v.sharedAncestor).toBe(0);
  });

  it('flips the kind when asked the other way round', () => {
    const snap = brokenDropdown();
    const result = why(snap, byId(snap, 'header').i, byId(snap, 'dropdown').i);
    expect(result.ok && result.value.kind).toBe('above');
  });

  it('compares siblings by z-index', () => {
    const snap = brokenDropdown();
    const result = why(snap, byId(snap, 'low').i, byId(snap, 'high').i);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(oneSentence(result.value.sentence)).toBe(true);
    expect(result.value.sentence).toContain('`div#high` has the higher z-index');
    expect(result.value.fix).toBe('Fix: give `div#low` a z-index above 2.');
  });

  it('returns same for the same element', () => {
    const snap = brokenDropdown();
    const result = why(snap, 3, 3);
    expect(result.ok && result.value.kind).toBe('same');
    expect(result.ok && result.value.fix).toBeNull();
  });

  it('fails as a value for a bad index', () => {
    const snap = brokenDropdown();
    const result = why(snap, 0, 999);
    expect(result.ok).toBe(false);
  });
});

describe('ladder', () => {
  it('lists the root context children sorted by z', () => {
    const snap = brokenDropdown();
    expect(ladder(snap).map((r) => `${r.sel} ${r.z}`)).toEqual([
      'section#card 0',
      'div#low 1',
      'div#high 2',
      'header#header 10',
      'div#snackbar 20000',
    ]);
  });
});
