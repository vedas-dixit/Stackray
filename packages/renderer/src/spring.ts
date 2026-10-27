/** A damped spring, integrated with semi-implicit Euler. */
export type SpringState = { value: number; velocity: number };
export type SpringParams = { stiffness: number; damping: number; mass: number };

/** The lift: slightly under-damped, a few percent of overshoot (docs/motion.md). */
export const liftSpring: SpringParams = { stiffness: 170, damping: 20, mass: 1 };

/**
 * Advance a spring toward `target` by `dt` seconds. Large frames are split
 * so a background tab coming back does not explode the integration.
 *
 * @example
 * let s = { value: 0, velocity: 0 };
 * s = stepSpring(s, 1, liftSpring, 1 / 60); // s.value ≈ 0.05
 */
export function stepSpring(
  state: SpringState,
  target: number,
  params: SpringParams,
  dt: number,
): SpringState {
  const maxStep = 1 / 120;
  let { value, velocity } = state;
  let remaining = Math.min(dt, 0.25);
  while (remaining > 0) {
    const h = Math.min(maxStep, remaining);
    const force = -params.stiffness * (value - target) - params.damping * velocity;
    velocity += (force / params.mass) * h;
    value += velocity * h;
    remaining -= h;
  }
  return { value, velocity };
}

/**
 * True once the spring is close enough to rest to snap to the target.
 *
 * @example
 * isSettled({ value: 0.9995, velocity: 0.0001 }, 1); // true
 */
export function isSettled(state: SpringState, target: number, epsilon = 0.001): boolean {
  return Math.abs(state.value - target) < epsilon && Math.abs(state.velocity) < epsilon * 10;
}
