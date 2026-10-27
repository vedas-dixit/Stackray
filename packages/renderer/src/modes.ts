import type { ElementRecord, Snapshot } from '@stackray/core';
import type { Palette, Rgba } from './palette';

export type ColorMode = 'depth' | 'context' | 'heat' | 'problems' | 'plain';

/** In the order the `1`…`5` keys select them. */
export const colorModes: readonly ColorMode[] = ['depth', 'context', 'heat', 'problems', 'plain'];

/** Facts about the whole snapshot that a color mode needs. */
export type ModeEnv = {
  maxDepth: number;
  maxZ: number;
  /** Stacking context index → hue slot. */
  contextSlot: Map<number, number>;
};

export type PlaneColor = { fill: Rgba; edge: Rgba; dashed: boolean };

/**
 * Precompute what every mode needs: depth range, z range, one hue slot per
 * stacking context in document order.
 *
 * @example
 * const env = modeEnv(snapshot);
 * env.contextSlot.get(0); // 0, the root context
 */
export function modeEnv(snapshot: Snapshot): ModeEnv {
  let maxDepth = 0;
  let maxZ = 0;
  const contextSlot = new Map<number, number>();
  for (const el of snapshot.elements) {
    if (el.depth > maxDepth) maxDepth = el.depth;
    if (el.z !== null && el.z > maxZ) maxZ = el.z;
    if (el.sc) contextSlot.set(el.i, contextSlot.size);
  }
  return { maxDepth, maxZ, contextSlot };
}

/**
 * A positive z-index that can never compete with the page because its
 * stacking context sits inside another context with no z of its own.
 *
 * @example
 * isTrapped(dropdown, snapshot); // true when .card has a transform
 */
export function isTrapped(el: ElementRecord, snapshot: Snapshot): boolean {
  if (el.z === null || el.z <= 0 || el.scParent === null || el.scParent === 0) return false;
  const parent = snapshot.elements[el.scParent];
  return parent !== undefined && (parent.z ?? 0) === 0;
}

/**
 * Fill and edge for one plane under a mode. Ghosts and clipped elements keep
 * their danger treatment in every mode; red stays reserved for problems.
 *
 * @example
 * planeColor(el, snapshot, 'depth', defaultPalette, modeEnv(snapshot)).edge; // ['#f2ede4', 0.55]
 */
export function planeColor(
  el: ElementRecord,
  snapshot: Snapshot,
  mode: ColorMode,
  palette: Palette,
  env: ModeEnv,
): PlaneColor {
  const dashed = el.clipped || el.scrolledOut;
  if (el.ghost) return { fill: palette.ghost, edge: [palette.danger, 0.6], dashed };
  if (el.clipped) return { fill: palette.fill, edge: palette.clipped, dashed };

  switch (mode) {
    case 'depth': {
      const t = env.maxDepth === 0 ? 1 : el.depth / env.maxDepth;
      return { fill: palette.fill, edge: [palette.cream, 0.18 + 0.62 * t], dashed };
    }
    case 'context': {
      const slot = env.contextSlot.get(el.sc ? el.i : (el.scParent ?? 0)) ?? 0;
      const hue = palette.contextHues[slot % palette.contextHues.length] ?? 0;
      const color = hsl(hue, 45, 62);
      return { fill: [color, el.sc ? 0.16 : 0.07], edge: [color, el.sc ? 0.9 : 0.5], dashed };
    }
    case 'heat': {
      if (el.z === null || el.z <= 0) return { fill: palette.fill, edge: palette.edgeDim, dashed };
      const t = env.maxZ <= 1 ? 1 : Math.log(el.z + 1) / Math.log(env.maxZ + 1);
      const color = t > 0.66 ? palette.danger : palette.accent;
      return { fill: [color, 0.08 + 0.18 * t], edge: [color, 0.5 + 0.5 * t], dashed };
    }
    case 'problems': {
      if (isTrapped(el, snapshot))
        return { fill: [palette.danger, 0.14], edge: [palette.danger, 0.95], dashed };
      return { fill: palette.fill, edge: palette.edgeDim, dashed };
    }
    default:
      return { fill: palette.fill, edge: palette.edge, dashed };
  }
}

function hsl(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
