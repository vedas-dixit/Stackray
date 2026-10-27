/**
 * Typed mirror of `tokens.css` for code that cannot read CSS variables: the
 * Three.js renderer (plane colors) and the animation code (springs). Keep the
 * two files in step; `tokens.css` is the source of truth for the chrome.
 */

export const color = {
  cream: '#f2ede4',
  cream2: '#e8e1d4',
  cream3: '#ddd4c4',
  line: '#d3c8b8',
  lineStrong: '#5b3a2a',
  ink: '#2b2420',
  ink2: '#4d423a',
  muted: '#8a7f74',
  accent: '#c8761f',
  accentBright: '#f0a64a',
  danger: '#c8372d',
  dangerBright: '#ff5a47',
  dotRed: '#e0564a',
  dotYellow: '#e8b33c',
  dotGreen: '#5faf5a',
  viewport: '#1a1714',
  viewport2: '#24201c',
  viewportGrid: '#2e2924',
} as const;

/** Plane colors for the 3D view as `[hex, alpha]`, ready for Three.js. */
export const plane = {
  fill: ['#f2ede4', 0.07],
  fillHover: ['#f2ede4', 0.18],
  edge: ['#f2ede4', 0.55],
  edgeDim: ['#f2ede4', 0.18],
  selected: ['#f0a64a', 1],
  ghost: ['#ff5a47', 0.25],
  clipped: ['#ff5a47', 0.9],
} as const satisfies Record<string, readonly [string, number]>;

/** Hues for the "one color per stacking context" mode, cycled by context index. */
export const contextHues = [28, 44, 86, 150, 190, 215, 260, 300, 335] as const;

export const font = {
  display: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  sizeXs: 11,
  sizeSm: 13,
  sizeDisplay: 20,
  weight: 400,
  weightStrong: 600,
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

export const radius = { window: 10, control: 4 } as const;

/**
 * Durations in milliseconds. These do not change under reduced motion (the
 * CSS twins do); code checks `prefersReducedMotion()` and skips the animation.
 */
export const duration = { hover: 80, pane: 200, shrink: 400, lift: 600 } as const;

export const easing = {
  out: [0.2, 0, 0, 1],
  inOut: [0.4, 0, 0.2, 1],
  lift: [0.34, 1.3, 0.64, 1],
  settle: [0.22, 1, 0.36, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/**
 * Spring for the lift. Slightly under-damped so the planes overshoot by a
 * few percent and settle, matching `--sr-ease-lift` in CSS.
 *
 * @example
 * const s = spring.lift; // { stiffness: 170, damping: 20, mass: 1 }
 */
export const spring = {
  lift: { stiffness: 170, damping: 20, mass: 1 },
  pane: { stiffness: 300, damping: 30, mass: 1 },
} as const;

/** Labels never exceed this many characters (SPEC.md §7). */
export const labelMax = 30;

/**
 * True when the user asked for reduced motion. Safe to call where
 * `matchMedia` does not exist (tests, workers).
 *
 * @example
 * const ms = prefersReducedMotion() ? 0 : duration.lift;
 */
export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
