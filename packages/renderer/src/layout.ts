import type { Snapshot } from '@stackray/core';

/**
 * Which value drives the Z axis. `paint` stacks by overlap level (the blocky
 * view), `order` gives every element its own step in paint order (the plates
 * staircase), `depth` is the DOM-depth toy.
 */
export type Axis = 'paint' | 'order' | 'depth';

/** Grid cell used to find overlapping elements, in page pixels. */
const CELL = 16;

/**
 * Stack levels: every element sits one level above the highest thing under
 * it, which is its parent or anything painted earlier that it overlaps.
 * Elements that do not overlap share a level, so a row of thumbnails lies
 * flat while a dropdown over a header rises above it. Paint order still
 * decides who is on top wherever two elements overlap.
 *
 * @example
 * const level = stackLevels(snapshot);
 * level[0]; // 0, the root
 */
export function stackLevels(snapshot: Snapshot): Int32Array {
  const { page } = snapshot.meta;
  const cols = Math.max(1, Math.ceil(page.w / CELL));
  const rows = Math.max(1, Math.ceil(page.h / CELL));
  const cellTop = new Int32Array(cols * rows).fill(-1);
  const level = new Int32Array(snapshot.elements.length);
  const clampCol = (x: number) => Math.min(cols - 1, Math.max(0, Math.floor(x / CELL)));
  const clampRow = (y: number) => Math.min(rows - 1, Math.max(0, Math.floor(y / CELL)));

  for (const index of snapshot.paintOrder) {
    const el = snapshot.elements[index];
    if (el === undefined) continue;
    let under = el.parent === null ? -1 : (level[el.parent] ?? -1);
    const { x, y, w, h } = el.rect;
    const covers = !el.empty && w > 2 && h > 2;
    const c0 = clampCol(x + 1);
    const c1 = clampCol(x + w - 2);
    const r0 = clampRow(y + 1);
    const r1 = clampRow(y + h - 2);
    if (covers) {
      for (let r = r0; r <= r1; r += 1) {
        for (let c = c0; c <= c1; c += 1) under = Math.max(under, cellTop[r * cols + c] ?? -1);
      }
    }
    const mine = under + 1;
    level[index] = mine;
    if (covers) {
      for (let r = r0; r <= r1; r += 1) {
        for (let c = c0; c <= c1; c += 1) {
          const i = r * cols + c;
          if ((cellTop[i] ?? -1) < mine) cellTop[i] = mine;
        }
      }
    }
  }
  return level;
}

export type LayoutOptions = {
  axis: Axis;
  /** Precomputed `stackLevels`; computed on the fly when omitted. */
  levels?: Int32Array | undefined;
  /** 0 is the flat page, 1 is fully exploded. */
  explode: number;
  /** Distance between consecutive levels at explode 1, in page pixels. */
  gap: number;
  hideEmpty: boolean;
  hideGhosts: boolean;
  /** Draw only elements at this depth or above; `null` draws everything. */
  depthCutoff: number | null;
};

/** One plane, in scene units where 1 unit is 1 CSS pixel and +y is up. */
export type PlaneTransform = {
  /** Index into `snapshot.elements`. */
  index: number;
  /** Center x; the page center is 0. */
  x: number;
  /** Center y; the page center is 0. */
  y: number;
  /** Height above the base plane. */
  z: number;
  w: number;
  h: number;
};

export const defaultLayout: LayoutOptions = {
  axis: 'paint',
  explode: 1,
  gap: 6,
  hideEmpty: true,
  hideGhosts: false,
  depthCutoff: null,
};

/**
 * Compute where every visible element's plane sits. Pure: same snapshot and
 * options always give the same planes, in paint order.
 *
 * @example
 * const planes = layoutPlanes(snapshot, { ...defaultLayout, explode: 0 });
 * planes.every((p) => p.z === 0); // true: a flat page
 */
export function layoutPlanes(
  snapshot: Snapshot,
  options: LayoutOptions = defaultLayout,
): PlaneTransform[] {
  const { page } = snapshot.meta;
  const halfW = page.w / 2;
  const halfH = page.h / 2;
  const lift = options.gap * clamp01(options.explode);
  const levels = options.axis === 'paint' ? (options.levels ?? stackLevels(snapshot)) : null;
  const planes: PlaneTransform[] = [];

  for (const index of snapshot.paintOrder) {
    const el = snapshot.elements[index];
    if (el === undefined) continue;
    if (options.hideEmpty && el.empty) continue;
    if (options.hideGhosts && el.ghost) continue;
    if (options.depthCutoff !== null && el.depth > options.depthCutoff) continue;

    const level =
      levels !== null ? (levels[index] ?? 0) : options.axis === 'order' ? el.paint : el.depth;
    planes.push({
      index,
      x: el.rect.x + el.rect.w / 2 - halfW,
      y: halfH - (el.rect.y + el.rect.h / 2),
      z: level * lift,
      w: el.rect.w,
      h: el.rect.h,
    });
  }
  return planes;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
