import { describe, expect, it } from 'vitest';
import { PULSE, PULSE_MS, pulseAt } from '../src/locate';

describe('pulseAt', () => {
  it('dims in, blinks three times, holds, then dims out', () => {
    expect(pulseAt(0)).toEqual({ dim: 0, flash: 0, done: false });
    expect(pulseAt(PULSE.dimIn).dim).toBe(1);
    const mid = PULSE.dimIn + PULSE.blink / 2;
    expect(pulseAt(mid).flash).toBeCloseTo(1, 5);
    expect(pulseAt(PULSE.dimIn + PULSE.blink).flash).toBeCloseTo(0, 5);
    let peaks = 0;
    let last = 0;
    for (let t = PULSE.dimIn; t < PULSE.dimIn + PULSE.blinks * PULSE.blink; t += 10) {
      const f = pulseAt(t).flash;
      if (f > 0.99 && last <= 0.99) peaks += 1;
      last = f;
    }
    expect(peaks).toBe(3);
    const held = pulseAt(PULSE.dimIn + PULSE.blinks * PULSE.blink + PULSE.hold / 2);
    expect(held).toEqual({ dim: 1, flash: 0, done: false });
    expect(pulseAt(PULSE_MS - 1).dim).toBeLessThan(0.05);
    expect(pulseAt(PULSE_MS)).toEqual({ dim: 0, flash: 0, done: true });
  });
});
