import { describe, expect, it } from 'vitest';
import { isHashedClass, labelFor, readableClasses, truncate } from '../src/labels';
import { LABEL_MAX } from '../src/types';
import { el, snapshotOf } from './harness';

const base = { tag: 'div', id: null, cls: [], testId: null, ariaLabel: null, text: '' };

describe('hashed classes', () => {
  it('recognises generated names', () => {
    for (const c of [
      'css-1a2b3c',
      'sc-AbC12',
      'x7f9q2',
      'jss123',
      'Button_root__3xK9a',
      'svelte-1x2y3z',
    ]) {
      expect(isHashedClass(c), c).toBe(true);
    }
  });

  it('keeps words', () => {
    for (const c of ['card', 'nav-item', 'mt-4', 'col-12', 'grid-cols-12', 'btn', 'h1', 'stroke']) {
      expect(isHashedClass(c), c).toBe(false);
    }
  });

  it('filters a class list in order', () => {
    expect(readableClasses(['css-1a2b3c', 'card', 'sc-AbC12', 'open'])).toEqual(['card', 'open']);
  });
});

describe('label fallback chain', () => {
  it('prefers id', () => {
    expect(labelFor({ ...base, id: 'header', cls: ['card'] })).toBe('div#header');
  });
  it('then data-testid', () => {
    expect(labelFor({ ...base, tag: 'button', testId: 'menu-button', cls: ['btn'] })).toBe(
      'button[menu-button]',
    );
  });
  it('then the custom element tag', () => {
    expect(labelFor({ ...base, tag: 'sr-widget', cls: ['host'] })).toBe('sr-widget');
  });
  it('then aria-label', () => {
    expect(labelFor({ ...base, ariaLabel: 'Hashed classes only', cls: [] })).toBe(
      '"Hashed classes only"',
    );
  });
  it('then up to two readable classes', () => {
    expect(labelFor({ ...base, tag: 'section', cls: ['card', 'transformed', 'open'] })).toBe(
      'section.card.transformed',
    );
  });
  it('then own text', () => {
    expect(labelFor({ ...base, tag: 'p', text: '  Hello   world ' })).toBe('"Hello world"');
  });
  it('then the tag', () => {
    expect(labelFor({ ...base, tag: 'span' })).toBe('span');
  });

  it('caps every label at 30 characters with one ellipsis', () => {
    const long = labelFor({ ...base, id: 'a-very-long-identifier-that-keeps-going' });
    expect(long.length).toBe(LABEL_MAX);
    expect(long.endsWith('…')).toBe(true);
    expect(truncate('short')).toBe('short');
  });

  it('runs on hashed-class HTML through capture', () => {
    const snap = snapshotOf(
      el('html', {}, [
        el('body', {}, [
          el('div', { cls: ['css-1a2b3c', 'x7f9q2'], attrs: { 'aria-label': 'Only hashes' } }),
          el('div', { cls: ['jss123', 'card'] }),
          el('div', { cls: ['sc-AbC12'], text: 'Fallback text' }),
        ]),
      ]),
    );
    expect(snap.elements.slice(2).map((e) => e.sel)).toEqual([
      '"Only hashes"',
      'div.card',
      '"Fallback text"',
    ]);
    expect(snap.elements[2]?.cls).toEqual([]);
  });
});
