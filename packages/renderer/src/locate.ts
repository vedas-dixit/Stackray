/**
 * The "locate" pulse after a selection: everything else fades, the chosen
 * plane blinks, then the rest fade back. Pure timing; the scene feeds the
 * result into two shader uniforms.
 */

export type Pulse = {
  /** 0 = others at full strength, 1 = others nearly invisible. */
  dim: number;
  /** 0 = the selected plane in its normal selected color, 1 = brightest. */
  flash: number;
  done: boolean;
};

export const PULSE = { dimIn: 150, blinks: 3, blink: 260, hold: 100, dimOut: 350 } as const;

/** Total length of the pulse in milliseconds. */
export const PULSE_MS = PULSE.dimIn + PULSE.blinks * PULSE.blink + PULSE.hold + PULSE.dimOut;

/**
 * Where the pulse is at `t` milliseconds after it started.
 *
 * @example
 * pulseAt(0); // { dim: 0, flash: 0, done: false }
 * pulseAt(PULSE_MS); // { dim: 0, flash: 0, done: true }
 */
export function pulseAt(t: number): Pulse {
  if (t >= PULSE_MS) return { dim: 0, flash: 0, done: true };
  if (t < PULSE.dimIn) return { dim: easeOut(t / PULSE.dimIn), flash: 0, done: false };
  const blinkStart = PULSE.dimIn;
  const blinkEnd = blinkStart + PULSE.blinks * PULSE.blink;
  if (t < blinkEnd) {
    const u = ((t - blinkStart) % PULSE.blink) / PULSE.blink;
    return { dim: 1, flash: 0.5 - 0.5 * Math.cos(2 * Math.PI * u), done: false };
  }
  const outStart = blinkEnd + PULSE.hold;
  if (t < outStart) return { dim: 1, flash: 0, done: false };
  return { dim: 1 - easeInOut((t - outStart) / PULSE.dimOut), flash: 0, done: false };
}

function easeOut(x: number): number {
  return 1 - (1 - x) ** 3;
}

function easeInOut(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}
