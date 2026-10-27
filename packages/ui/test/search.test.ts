import { describe, expect, it } from 'vitest';
import { scoreMatch, scoreWords } from '../src/model/search';

describe('scoreMatch', () => {
  const label = 'div.welcome-screen-menu';

  it('ranks exact, prefix, token prefix, initials, substring, then gaps', () => {
    expect(scoreMatch('div.welcome-screen-menu', label)?.score).toBe(100);
    expect(scoreMatch('div.wel', label)?.score).toBe(90);
    expect(scoreMatch('menu', label)?.score).toBe(80);
    expect(scoreMatch('wsm', label)?.score).toBe(75);
    expect(scoreMatch('come-scr', label)?.score).toBeGreaterThanOrEqual(65);
    expect(scoreMatch('wlcm', label)?.score).toBeLessThan(65);
    expect(scoreMatch('xyz', label)).toBeNull();
  });

  it('reports the characters to highlight', () => {
    expect(scoreMatch('menu', label)?.match).toEqual([19, 20, 21, 22]);
    expect(scoreMatch('wsm', label)?.match).toEqual([4, 12, 19]);
    const gapped = scoreMatch('wlcm', label)?.match ?? [];
    expect(gapped.map((i) => label[i]).join('')).toBe('wlcm');
  });

  it('ignores case and surrounding space', () => {
    expect(scoreMatch('  MENU ', label)?.score).toBe(80);
  });
});

describe('scoreWords', () => {
  it('needs every word, in any order', () => {
    expect(scoreWords('menu screen', 'div.welcome-screen-menu')?.score).toBe(80);
    expect(scoreWords('menu nope', 'div.welcome-screen-menu')).toBeNull();
  });
});
