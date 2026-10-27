import type { Palette } from '@stackray/renderer';
import { color, contextHues, plane } from '../tokens';

/** The renderer palette built from the UI tokens, so the two never drift. */
export const uiPalette: Palette = {
  viewport: color.viewport,
  fill: plane.fill,
  fillHover: plane.fillHover,
  edge: plane.edge,
  edgeDim: plane.edgeDim,
  selected: plane.selected,
  ghost: plane.ghost,
  clipped: plane.clipped,
  accent: color.accentBright,
  danger: color.dangerBright,
  cream: color.cream,
  contextHues,
};
