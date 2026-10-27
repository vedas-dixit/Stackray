import { describe, expect, it } from 'vitest';
import { capture } from '../src/capture';
import type { DomElement } from '../src/dom';
import { el, page } from './harness';

const CI = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  ?.CI;

/** 1 + 1 + 20 × (1 + 10 × (1 + 1 + 22)) = 4 822 elements, plus a header: about 5 000. */
function bigPage(): DomElement {
  const sections: DomElement[] = [];
  for (let s = 0; s < 20; s++) {
    const cards: DomElement[] = [];
    for (let c = 0; c < 10; c++) {
      const leaves: DomElement[] = [];
      for (let l = 0; l < 22; l++) {
        leaves.push(
          el('span', {
            cls: [`leaf-${l}`, 'css-1a2b3c'],
            rect: [l * 10, s * 100 + c * 10, 10, 10],
            style: l % 7 === 0 ? { position: 'relative', zIndex: String(l) } : {},
          }),
        );
      }
      cards.push(
        el(
          'div',
          {
            cls: ['card'],
            rect: [c * 100, s * 100, 100, 100],
            style: c % 3 === 0 ? { transform: 'matrix(1, 0, 0, 1, 0, 0)' } : {},
          },
          [el('div', { cls: ['wrap'], style: { overflow: 'hidden' } }, leaves)],
        ),
      );
    }
    sections.push(el('section', { cls: ['section'], style: { display: 'flex' } }, cards));
  }
  return el('html', {}, [
    el('body', {}, [el('header', { style: { position: 'sticky', zIndex: '10' } }), ...sections]),
  ]);
}

describe('capture budget', () => {
  it('captures about 5 000 elements in under 50 ms', () => {
    const big = page(bigPage(), { w: 1200, h: 2000 });
    capture(big);
    const start = performance.now();
    const result = capture(big);
    const ms = performance.now() - start;
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.elements.length).toBeGreaterThanOrEqual(4800);
    expect(result.value.paintOrder.length).toBe(result.value.elements.length);
    console.info(`capture: ${result.value.elements.length} elements in ${ms.toFixed(1)} ms`);
    if (CI === undefined) expect(ms).toBeLessThan(50);
  });
});
