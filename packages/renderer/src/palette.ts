/** `[hex, alpha]`, the shape `@stackray/ui` tokens use. */
export type Rgba = readonly [string, number];

/**
 * Colors the renderer needs. Defaults mirror `packages/ui/src/tokens.ts`;
 * the app may pass the UI tokens in so the two never drift.
 */
export type Palette = {
  viewport: string;
  fill: Rgba;
  fillHover: Rgba;
  edge: Rgba;
  edgeDim: Rgba;
  selected: Rgba;
  ghost: Rgba;
  clipped: Rgba;
  accent: string;
  danger: string;
  cream: string;
  contextHues: readonly number[];
};

export const defaultPalette: Palette = {
  viewport: '#1a1714',
  fill: ['#f2ede4', 0.07],
  fillHover: ['#f2ede4', 0.18],
  edge: ['#f2ede4', 0.55],
  edgeDim: ['#f2ede4', 0.18],
  selected: ['#f0a64a', 1],
  ghost: ['#ff5a47', 0.25],
  clipped: ['#ff5a47', 0.9],
  accent: '#f0a64a',
  danger: '#ff5a47',
  cream: '#f2ede4',
  contextHues: [28, 44, 86, 150, 190, 215, 260, 300, 335],
};
