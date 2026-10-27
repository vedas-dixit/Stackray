import { describe, expect, it } from 'vitest';
import { isSettled, liftSpring, stepSpring } from '../src/spring';

describe('stepSpring', () => {
  it('moves toward the target and settles', () => {
    let s = { value: 0, velocity: 0 };
    for (let i = 0; i < 240; i += 1) s = stepSpring(s, 1, liftSpring, 1 / 60);
    expect(isSettled(s, 1)).toBe(true);
  });

  it('overshoots by a few percent, not more', () => {
    let s = { value: 0, velocity: 0 };
    let peak = 0;
    for (let i = 0; i < 240; i += 1) {
      s = stepSpring(s, 1, liftSpring, 1 / 60);
      peak = Math.max(peak, s.value);
    }
    expect(peak).toBeGreaterThan(1.01);
    expect(peak).toBeLessThan(1.1);
  });

  it('survives a long frame without blowing up', () => {
    const s = stepSpring({ value: 0, velocity: 0 }, 1, liftSpring, 5);
    expect(Number.isFinite(s.value)).toBe(true);
    expect(s.value).toBeLessThan(1.2);
  });
});
